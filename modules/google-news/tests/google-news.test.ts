// A Google News search feed is stored under the original addresses: its entries link to Google's
// article pages, whose signature batchexecute turns into the address. Titles lose the " - 媒體名"
// Google appends, an id is resolved once, an entry that cannot be resolved waits for a later run, and
// a run where every new link fails is a failed run. Cards name a report's outlet, not the search, and the
// search only when no outlet is known. A local stand-in plays Google.
import { tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import http from "node:http";
import { after, before, test } from "node:test";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { ITEM_COLUMNS, ITEM_FROM, toFeedItemSummary, type ItemRow } from "@aihot/backend/publication/items";
import { collectSource } from "@aihot/backend/sources/collect";
import { outletName, splitTitle } from "../backend/links.ts";
import { googleNewsModule } from "../server.ts";

const T = tag();
const SOURCE = `test-google-news-${T}`;
const BLOCKED = `test-google-news-blocked-${T}`;
const OTHER = `test-rss-plain-${T}`;

// What the stand-in answers: each id's original address, or none (its page carries no signature).
const ids: Record<string, string | null> = {
  [`CBMiA${T}`]: `https://money.example.org/story/${T}`,
  [`CBMiB${T}`]: `https://www.example.com/article/${T}`,
  [`CBMiC${T}`]: null,
};
const titles: Record<string, [string, string]> = {
  [`CBMiA${T}`]: [`國泰金導入生成式 AI 客服 ${T}`, "經濟日報"],
  [`CBMiB${T}`]: [`台新新光金如何養出 AI 訓練師 - 專題 ${T}`, "天下雜誌"],
  [`CBMiC${T}`]: [`富邦產險 AI 理賠 ${T}`, "工商時報"],
};
let base = "";
const entry = (id: string) => {
  const [title, outlet] = titles[id]!;
  const link = `${base}/rss/articles/${id}?oc=5`;
  const description = `<a href="${link}" target="_blank">${title}</a>&nbsp;&nbsp;<font color="#6f6f6f">${outlet}</font>`;
  return `<item><title>${title} - ${outlet}</title><link>${link}</link><guid isPermaLink="false">${id}</guid>`
    + `<pubDate>${new Date(Date.now() - 3_600_000).toUTCString()}</pubDate><description>${description.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</description></item>`;
};
const requests: string[] = [];
let blocked = false;
const server = http.createServer((req, res) => {
  const url = new URL(req.url!, base);
  requests.push(`${req.method} ${url.pathname}`);
  if (url.pathname === "/rss/search" || url.pathname === "/plain.xml") {
    const items = url.pathname === "/plain.xml"
      ? `<item><title>A plain entry - with a dash ${T}</title><link>https://plain.example.org/${T}</link><pubDate>${new Date().toUTCString()}</pubDate><description>Its own summary</description></item>`
      : Object.keys(ids).map(entry).join("");
    res.writeHead(200, { "content-type": "application/rss+xml; charset=utf-8" });
    return res.end(`<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${items}</channel></rss>`);
  }
  const page = /^\/rss\/articles\/([\w-]+)$/.exec(url.pathname);
  if (page) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    const id = page[1]!;
    return res.end(ids[id] ? `<html><body><c-wiz><div jscontroller="x" data-n-a-id="${id}" data-n-a-ts="1795656091" data-n-a-sg="sig-${id}"></div></c-wiz></body></html>` : "<html><body>no signature</body></html>");
  }
  if (req.method === "POST" && url.pathname === "/_/DotsSplashUi/data/batchexecute") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      if (blocked) { res.writeHead(429); return res.end("Too Many Requests"); }
      const calls = JSON.parse(new URLSearchParams(body).get("f.req")!)[0] as Array<[string, string, null, string]>;
      const rows = calls.map(([rpc, inner, , index]) => {
        const [, , id, , sg] = JSON.parse(inner) as [string, unknown, string, number, string];
        return ["wrb.fr", rpc, JSON.stringify(["garturlres", sg === `sig-${id}` ? ids[id] : null, 1]), null, null, null, index];
      });
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(`)]}'\n\n${JSON.stringify([...rows, ["di", 22]])}`);
    });
    return;
  }
  res.writeHead(404);
  res.end();
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
config.allowPrivateNetworkFetch = true;
installModules([googleNewsModule(base)]);

before(async () => {
  const cursor = sql.json({ initializedAt: "2024-01-01T00:00:00.000Z" });
  await sql`INSERT INTO sources (id, name, kind, config, tier, participation_mode, cursor, next_fetch_at) VALUES
    (${SOURCE}, 'Google 新聞：金控 AI', 'rss', ${sql.json({ feedUrl: `${base}/rss/search?q=%E9%87%91%E6%8E%A7+AI+when:7d&hl=zh-TW&gl=TW&ceid=TW:zh-Hant` })}, 'T2', 'editorial', ${cursor}, '2100-01-01'),
    (${BLOCKED}, 'Google 新聞：保險 AI', 'rss', ${sql.json({ feedUrl: `${base}/rss/search?q=%E4%BF%9D%E9%9A%AA+AI` })}, 'T2', 'editorial', ${cursor}, '2100-01-01'),
    (${OTHER}, 'Plain feed', 'rss', ${sql.json({ feedUrl: `${base}/plain.xml` })}, 'T2', 'editorial', ${cursor}, '2100-01-01')`;
});
after(async () => {
  installModules([]);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await stopBoss();
  await closeDb();
});

const articles = async (sourceId: string) => [...await sql<{ url: string; title: string; author: string | null; excerpt: string | null }[]>`
  SELECT url, title, author, excerpt FROM articles WHERE source_id = ${sourceId} ORDER BY url`];

test("entries are stored under their original address, without the outlet in the title", async () => {
  assert.equal((await collectSource(SOURCE, { force: true })).status, "ok");
  assert.deepEqual(await articles(SOURCE), [
    { url: `https://money.example.org/story/${T}`, title: `國泰金導入生成式 AI 客服 ${T}`, author: "經濟日報", excerpt: null },
    // Only the dash Google appends goes; one in the headline stays.
    { url: `https://www.example.com/article/${T}`, title: `台新新光金如何養出 AI 訓練師 - 專題 ${T}`, author: "天下雜誌", excerpt: null },
  ], "the entry without a signature is left out");
  assert.equal(requests.filter((r) => r.startsWith("POST")).length, 1, "one batchexecute call for the run");

  // A later run reads only the id it could not resolve again.
  requests.length = 0;
  assert.equal((await collectSource(SOURCE, { force: true })).status, "ok");
  assert.deepEqual(requests.filter((r) => r.includes("/rss/articles/")), [`GET /rss/articles/CBMiC${T}`]);
  assert.equal((await articles(SOURCE)).length, 2);
});

test("a run where every new link fails is a failed run", async () => {
  // Same entries, now known: nothing to resolve, so blocking Google does not fail this run.
  blocked = true;
  try {
    assert.equal((await collectSource(SOURCE, { force: true })).status, "ok");
    await sql`DELETE FROM google_news_links`;
    const run = await collectSource(BLOCKED, { force: true });
    assert.equal(run.status, "failed");
    assert.match(run.error ?? "", /Google 新聞連結還原失敗（3 則）/);
  } finally {
    blocked = false;
  }
});

test("other feeds are left as they are", async () => {
  assert.equal((await collectSource(OTHER, { force: true })).status, "ok");
  assert.deepEqual((await articles(OTHER)).map((a) => [a.title, a.excerpt]), [[`A plain entry - with a dash ${T}`, "Its own summary"]]);
  // The outlet is only taken off when Google's description names it.
  assert.deepEqual(splitTitle("AI 客服上線 - 經濟日報", "AI 客服上線"), { title: "AI 客服上線 - 經濟日報", outlet: null });
});

test("cards name a report's outlet, and the source when no outlet is known", async () => {
  // A feed of another site, whose author is a writer, never an outlet.
  const plain = `test-rss-writer-${T}`;
  await sql`INSERT INTO sources (id, name, kind, config, tier, participation_mode) VALUES
    (${plain}, 'Writer feed', 'rss', ${sql.json({ feedUrl: "https://writer.example.org/feed.xml" })}, 'T2', 'editorial')`;
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, author, discovered_at, timeline_at)
    VALUES (${`${T}-writer`}, ${plain}, ${`${T}-writer`}, ${`https://writer.example.org/${T}`}, 'A post', 'A Writer', now(), now())`;
  // A Google report whose outlet was not read keeps the source's name.
  await sql`UPDATE articles SET author = NULL WHERE url = ${`https://www.example.com/article/${T}`}`;
  const stored = await sql<{ id: string; source_id: string; url: string; title: string }[]>`
    SELECT id, source_id, url, title FROM articles WHERE source_id IN (${SOURCE}, ${plain}) ORDER BY url`;
  const at = new Date();
  for (const a of stored) {
    await sql`INSERT INTO publications (article_id, title, source_id, channel, url, discovered_at, timeline_at, published_at, sort_at,
        eligible, selected, visible_after, visibility, tags, summary)
      VALUES (${a.id}, ${a.title}, ${a.source_id}, 'news', ${a.url}, ${at}, ${at}, ${at}, ${at}, true, false, ${at}, 'public', '{}', 'summary')`;
  }
  const rows = await sql<ItemRow[]>`SELECT ${ITEM_COLUMNS} ${ITEM_FROM} WHERE p.article_id IN ${sql(stored.map((a) => a.id))} ORDER BY p.url`;
  assert.deepEqual(rows.map((r) => toFeedItemSummary(r).source), [
    { id: SOURCE, name: "Google 新聞：金控 AI", outlet: "經濟日報" },
    { id: plain, name: "Writer feed" },
    { id: SOURCE, name: "Google 新聞：金控 AI" },
  ]);
});

test("an outlet named differently by each edition reads under one name", () => {
  assert.equal(outletName("BigGo Finance"), "BigGo 財經");
  assert.equal(outletName("biggo  finance"), "BigGo 財經");
  assert.equal(outletName("BigGo 財經"), "BigGo 財經");
  assert.equal(outletName("經濟日報"), "經濟日報");
});

test("a relayed report shows its outlet's icon, never the search's", async () => {
  await sql`UPDATE sources SET icon_url = 'https://news.google.com/favicon.ico' WHERE id = ${SOURCE}`;
  await sql`INSERT INTO outlet_icons (host, icon_url) VALUES ('money.example.org', 'https://money.example.org/icon.png')
    ON CONFLICT (host) DO UPDATE SET icon_url = EXCLUDED.icon_url`;
  try {
    const rows = await sql<ItemRow[]>`SELECT ${ITEM_COLUMNS} ${ITEM_FROM} WHERE p.source_id = ${SOURCE} ORDER BY p.url`;
    const sources = rows.map((r) => toFeedItemSummary(r).source);
    const withOutlet = sources.find((s) => s.outlet === "經濟日報");
    const without = sources.find((s) => !s.outlet);
    assert.ok(withOutlet?.iconUrl, "the outlet's icon, through the image proxy");
    assert.ok(!withOutlet.iconUrl.includes("google"), "not the search's icon");
    assert.ok(without?.iconUrl, "no outlet known: the source's own icon");
  } finally {
    await sql`DELETE FROM outlet_icons WHERE host = 'money.example.org'`;
    await sql`UPDATE sources SET icon_url = NULL WHERE id = ${SOURCE}`;
  }
});
