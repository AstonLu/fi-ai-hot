// Google News search feeds link every entry to news.google.com/rss/articles/<id>, a page that sends the
// reader on with a script, not an HTTP redirect. The original address comes from two requests: the
// article page carries a signature and timestamp (data-n-a-sg, data-n-a-ts), and Google's batchexecute
// endpoint answers the address for them. Each id is resolved once and kept in google_news_links.
// Entries become ordinary feed entries under their original address (its identity, so other sources'
// copies are the same article), without the " - 媒體名" Google appends to the title; the outlet stays as
// the author. The feed's description only repeats the title and outlet, so it is dropped: the page is
// read for a body as usual, and a page that cannot be read leaves the article judged on its title.
import { sql } from "@aihot/backend/db";
import { guardedFetch, requireOk } from "@aihot/backend/lib/http-fetch";
import { FetchError, type Candidate, type SourceRow } from "@aihot/backend/sources/types";

export const GOOGLE_NEWS = "https://news.google.com";

/**
 * New ids resolved per run, two requests each (the batchexecute call is shared). The others are left out
 * of this run and resolved on a later one: the feed has no validator, so every run lists them again.
 */
const RESOLVE_PER_RUN = 40;
/** Resolved addresses outlive the feeds' window (when:7d) and the entries a later run lists again. */
const KEEP_DAYS = 30;

/** Whether the source reads a Google News feed (of this origin). */
export function handles(source: Pick<SourceRow, "kind" | "config">, origin: string): boolean {
  return source.kind === "rss" && URL.parse(String(source.config.feedUrl ?? ""))?.origin === origin;
}

/** The id of a Google News article link (/rss/articles/<id>?oc=5), or null for any other address. */
function articleId(link: string, origin: string): string | null {
  const url = URL.parse(link);
  return url?.origin === origin ? /^\/(?:rss\/)?articles\/([\w-]+)$/.exec(url.pathname)?.[1] ?? null : null;
}

/** "標題 - 媒體名": the outlet Google appends, which its description ends with too. */
export function splitTitle(title: string, description: string | null): { title: string; outlet: string | null } {
  const at = title.lastIndexOf(" - ");
  const outlet = at > 0 ? title.slice(at + 3).trim() : "";
  return outlet && description?.trim().endsWith(outlet) ? { title: title.slice(0, at).trim(), outlet } : { title, outlet: null };
}

interface Signed { id: string; ts: number; sg: string }

async function sign(origin: string, id: string): Promise<Signed> {
  const page = requireOk(await guardedFetch(`${origin}/rss/articles/${id}?oc=5`, { timeoutMs: 20_000 })).text();
  const sg = /data-n-a-sg="([^"]+)"/.exec(page)?.[1];
  const ts = /data-n-a-ts="(\d+)"/.exec(page)?.[1];
  if (!sg || !ts) throw new Error("no signature on the article page");
  return { id, ts: Number(ts), sg };
}

// The request context Google's own page sends; only the id, timestamp and signature vary.
const CONTEXT = [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0];

/** The original addresses of signed ids, in one batchexecute call; an id Google does not answer is missing. */
async function decode(origin: string, signed: Signed[]): Promise<Map<string, string>> {
  const calls = signed.map((s, i) => ["Fbv4je", JSON.stringify(["garturlreq", CONTEXT, s.id, s.ts, s.sg]), null, String(i)]);
  const res = requireOk(await guardedFetch(`${origin}/_/DotsSplashUi/data/batchexecute`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ "f.req": JSON.stringify([calls]) }).toString(),
    timeoutMs: 20_000,
  }));
  // )]}' and then one JSON array: ["wrb.fr", "Fbv4je", "[\"garturlres\", <url>, …]", …, <call index>] per call.
  let rows: unknown;
  try { rows = JSON.parse(res.text().replace(/^\)\]\}'\s*/, "")); } catch { throw new Error("unreadable batchexecute answer"); }
  const out = new Map<string, string>();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!Array.isArray(row) || row[0] !== "wrb.fr" || typeof row[2] !== "string") continue;
    const s = signed[Number(row[6])];
    let url: unknown;
    try { url = JSON.parse(row[2])?.[1]; } catch { continue; }
    if (s && typeof url === "string" && /^https?:\/\//.test(url) && articleId(url, origin) === null) out.set(s.id, url);
  }
  return out;
}

/**
 * A Google News feed's entries under their original addresses (ServerModule.listing). An entry whose
 * address is not resolved yet is left out of this run; a later run tries again. When every new link
 * tried fails (more than one: one odd link must not fail the source for good), the run fails and the
 * admin shows why.
 */
export async function resolveListing(source: SourceRow, found: Candidate[], origin: string): Promise<Candidate[]> {
  if (!handles(source, origin)) return found;
  const ids = found.map((c) => articleId(c.url, origin));
  const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
  const rows = await sql<{ article_id: string; url: string }[]>`SELECT article_id, url FROM google_news_links WHERE article_id = ANY(${wanted}::text[])`;
  const known = new Map(rows.map((r) => [r.article_id, r.url]));
  const fresh = wanted.filter((id) => !known.has(id)).slice(0, RESOLVE_PER_RUN);
  const errors: string[] = [];
  const signed: Signed[] = [];
  for (const id of fresh) {
    try { signed.push(await sign(origin, id)); } catch (e) { errors.push(String(e instanceof Error ? e.message : e)); }
  }
  let resolved = new Map<string, string>();
  if (signed.length) {
    try { resolved = await decode(origin, signed); } catch (e) { errors.push(String(e instanceof Error ? e.message : e)); }
  }
  if (resolved.size) {
    await sql`INSERT INTO google_news_links (article_id, url)
      SELECT * FROM unnest(${[...resolved.keys()]}::text[], ${[...resolved.values()]}::text[]) ON CONFLICT (article_id) DO NOTHING`;
    for (const [id, url] of resolved) known.set(id, url);
  }
  if (fresh.length > 1 && resolved.size === 0) {
    throw new FetchError(`Google 新聞連結還原失敗（${fresh.length} 則）：${errors[0] ?? "batchexecute 沒有回原文網址"}`);
  }
  return found.flatMap((c, i) => {
    const id = ids[i];
    if (!id) return [c];
    const url = known.get(id);
    if (!url) return [];
    const { title, outlet } = splitTitle(c.title, c.excerpt ?? null);
    return [{ ...c, url, title, author: c.author ?? outlet, excerpt: null }];
  });
}

export async function pruneLinks(now: Date): Promise<number> {
  const deleted = await sql`DELETE FROM google_news_links WHERE resolved_at < ${new Date(now.getTime() - KEEP_DAYS * 86_400_000)}`;
  return deleted.count;
}
