// External collection reports (POST /api/ingest/items). Same identity rules and timeline
// rule as every other entrance: old or future-dated items and explicit backfill never count as
// today's news and are never pushed. Unknown sources are created isolated, awaiting an operator.
import { sql } from "../db.ts";
import { upsertMaterial } from "../content/materials.ts";
import { queueProcessing } from "../jobs/content.ts";
import { readPublicationDate } from "../sources/dates.ts";
import { normalizeUrl, tweetIdFromUrl } from "../lib/url.ts";
import type { XPostData } from "../content/materials.ts";

export const MAX_ITEMS = 50;

export class IngestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ItemIn {
  title?: unknown;
  url?: unknown;
  publishedAt?: unknown;
  author?: unknown;
  /** The item's own text: for an X post, the post itself (its page can't be fetched without a sign-in). */
  text?: unknown;
  /** The display name of an X post's author; the handle comes from the post's address or `author`. */
  authorName?: unknown;
  raw?: { _aihot?: { backfill?: boolean; baseline?: boolean } } & Record<string, unknown>;
}

export async function ingestItems(body: { sourceId?: unknown; sourceName?: unknown; items?: unknown }): Promise<{ ok: true; created: number }> {
  const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : "";
  const items = Array.isArray(body.items) ? (body.items as ItemIn[]) : [];
  if (!sourceId || !items.length) throw new IngestError(400, "sourceId and items[] required");
  if (items.length > MAX_ITEMS) throw new IngestError(413, `items[] exceeds max ${MAX_ITEMS} per request`);

  const [source] = await sql<{ id: string; participation_mode: string; enabled: boolean }[]>`
    INSERT INTO sources (id, name, kind, config, tier, participation_mode, interval_minutes, enabled, health, tags)
    VALUES (${sourceId.slice(0, 120)}, ${typeof body.sourceName === "string" && body.sourceName.trim() ? body.sourceName.trim().slice(0, 200) : sourceId.slice(0, 120)},
            'external', '{}'::jsonb, 'T2', 'isolated', 1440, true, 'ok', ${["ingest:auto-created"]})
    ON CONFLICT (id) DO UPDATE SET last_ok_at = now() WHERE sources.enabled
    RETURNING id, participation_mode, enabled`;
  if (!source) throw new IngestError(409, "source paused");

  const seen = new Set<string>();
  let created = 0;
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const text = typeof it.text === "string" ? it.text.trim().slice(0, MAX_TEXT) : "";
    const title = typeof it.title === "string" && it.title.trim() ? it.title.trim() : titleFromText(text);
    const rawUrl = typeof it.url === "string" ? it.url.trim() : "";
    if (!title || !rawUrl) continue;
    const url = normalizeUrl(rawUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const publication = readPublicationDate(typeof it.publishedAt === "string" ? it.publishedAt : null, "+00:00");
    const flags = it.raw?._aihot ?? {};
    const author = typeof it.author === "string" ? it.author.trim().replace(/^@/, "").slice(0, 200) || null : null;
    const xPost = text ? reportedPost(rawUrl, text, author, it.authorName) : null;
    const res = await upsertMaterial({
      sourceId: source!.id,
      // Normalize only for deduplication. Ownership needs the reported origin (including www and
      // scheme), and upsertMaterial already applies the common normalized identity rule.
      url: rawUrl,
      title,
      author: xPost?.handle ?? author,
      ...publication,
      ...(text ? { bodyText: text, bodyStatus: "ok" as const } : {}),
      ...(xPost ? { xPost } : {}),
      raw: it.raw ?? null,
      via: "ingest",
      backfill: flags.backfill ? "reported-backfill" : flags.baseline ? "reported-baseline" : null,
    });
    if (res.created) created += 1;
    if (res.created || res.revised || res.processingNeeded) await queueProcessing(res.articleId);
  }
  await sql`UPDATE sources SET last_fetch_at = now(), last_ok_at = now() WHERE id = ${source!.id}`;
  await sql`INSERT INTO ingest_events (client, kind, status, summary) VALUES ('ingest-items', 'items', 'ok', ${sql.json({ sourceId: source!.id, received: items.length, created })})`;
  return { ok: true, created };
}

/** A pushed item's text is capped like a long post with its quote, never a whole page. */
export const MAX_TEXT = 10_000;

function titleFromText(text: string): string {
  const firstLine = text.split("\n").find((l) => l.trim())?.trim() ?? "";
  return firstLine.length > 140 ? `${firstLine.slice(0, 137)}...` : firstLine;
}

const X_HANDLE = /^https?:\/\/(?:www\.|mobile\.|m\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/\d+/i;

/** A reported X post with its text becomes a post like a collected one: shown as the post, keyed by its id. */
function reportedPost(url: string, text: string, author: string | null, authorName: unknown): XPostData | null {
  const tweetId = tweetIdFromUrl(url);
  if (!tweetId) return null;
  const fromUrl = X_HANDLE.exec(url)?.[1];
  const handle = fromUrl && fromUrl.toLowerCase() !== "i" ? fromUrl : author && /^[A-Za-z0-9_]{1,15}$/.test(author) ? author : null;
  if (!handle) return null;
  const name = typeof authorName === "string" && authorName.trim() ? authorName.trim().slice(0, 200) : handle;
  return { tweetId, authorName: name, handle, text };
}
