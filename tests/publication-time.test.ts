// An item whose original carries no reliable date keeps its public page, and no exit presents when it was
// collected as when it was published. Failure cases: the Markdown export labels the collection time
// "发布时间"; RSS gives the collection time as pubDate; a dated item loses its publication time; a list card
// dated by a later write-up of an older event (the OCC framework of 2026-11-04, written up on 11-21).
import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { ITEM_COLUMNS, ITEM_FROM, toFeedItemSummary, type ItemRow } from "@aihot/backend/publication/items";
import { buildApp } from "../apps/api/src/app.ts";

const T = tag();
const SOURCE = `pubtime-${T}`;
const discovered = new Date(Date.now() - 3600_000);
const published = new Date(Date.now() - 5 * 3600_000);
const ids = { dated: `${T}-dated`, undated: `${T}-undated` };
const app = await buildApp();

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier) VALUES (${SOURCE}, 'Publication time fixture', 'rss', 'T1')`;
  for (const [kind, id] of Object.entries(ids)) {
    const at = kind === "dated" ? published : null;
    await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at, published_at)
      VALUES (${id}, ${SOURCE}, ${id}, ${`https://example.org/${id}`}, ${`${T} ${kind}`}, ${discovered}, ${discovered}, ${at})`;
    await sql`INSERT INTO publications (article_id, title, source_id, channel, url, discovered_at, timeline_at, published_at, sort_at,
        eligible, selected, visible_after, visibility, tags, summary)
      VALUES (${id}, ${`${T} ${kind}`}, ${SOURCE}, 'news', ${`https://example.org/${id}`}, ${discovered}, ${discovered}, ${at}, ${discovered},
        true, false, ${discovered}, 'public', ${[T]}, 'fixture summary')`;
  }
});
after(async () => {
  await app.close();
  await stopBoss();
  await closeDb();
});

const get = async (url: string) => {
  const res = await app.inject({ method: "GET", url });
  assert.equal(res.statusCode, 200, url);
  return res.body;
};

test("the Markdown export names the collection time as such when the publication time is unknown", async () => {
  const undated = await get(`/items/${ids.undated}/markdown`);
  assert.ok(undated.includes(`- 收錄時間：${discovered.toISOString()}`));
  assert.ok(!undated.includes("發布時間"));
  assert.ok((await get(`/items/${ids.dated}/markdown`)).includes(`- 發布時間：${published.toISOString()}`));
});

test("RSS gives no pubDate for an item without a known publication time", async () => {
  const feed = await get("/feed/all.xml");
  const entry = (id: string) => feed.split("<item>").find((block) => block.includes(`>${id}</guid>`));
  assert.ok(entry(ids.undated) && !entry(ids.undated)!.includes("<pubDate>"));
  assert.ok(entry(ids.dated)!.includes(`<pubDate>${published.toUTCString()}</pubDate>`));
});

test("a card is dated by its publication, else its collection, and by its event when that came days before", async () => {
  const writeUp = new Date("2026-11-20T21:05:45Z"); // 11月21日 in Beijing
  const cases = { earlier: "2026-11-04", sameDay: "2026-11-21", utcDay: "2026-11-20", month: "2026-11", none: null, undated: "2026-11-04" };
  for (const [name, occurredAt] of Object.entries(cases)) {
    const id = `${T}-card-${name}`;
    const at = name === "undated" ? null : writeUp;
    await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at, published_at)
      VALUES (${id}, ${SOURCE}, ${id}, ${`https://example.org/${id}`}, ${id}, ${discovered}, ${discovered}, ${at})`;
    const [analysis] = await sql<{ id: string }[]>`INSERT INTO analyses (article_id, input_revision, origin, output)
      VALUES (${id}, 1, 'model', ${sql.json({ fact: { title: id, occurredAt } })}) RETURNING id`;
    await sql`INSERT INTO publications (article_id, analysis_id, title, source_id, channel, url, discovered_at, timeline_at, published_at, sort_at,
        eligible, selected, visible_after, visibility, tags, summary)
      VALUES (${id}, ${analysis!.id}, ${id}, ${SOURCE}, 'news', ${`https://example.org/${id}`}, ${discovered}, ${discovered}, ${at}, ${discovered},
        true, false, ${discovered}, 'public', '{}', 'fixture summary')`;
  }
  const rows = await sql<ItemRow[]>`SELECT ${ITEM_COLUMNS} ${ITEM_FROM} WHERE p.article_id LIKE ${`${T}-card-%`}`;
  const cards = Object.fromEntries(rows.map((r) => [r.id.slice(`${T}-card-`.length), toFeedItemSummary(r)]));
  assert.equal(cards.earlier!.eventDate, "2026-11-04");
  assert.equal(cards.utcDay!.eventDate, "2026-11-20", "the day before the write-up's Beijing day");
  for (const name of ["sameDay", "month", "none"]) assert.equal(cards[name]!.eventDate, undefined, name);
  assert.equal(cards.earlier!.publishedAt, writeUp.toISOString());
  // Without a publication time the collection time stands in, for the card and for the comparison.
  assert.equal(cards.undated!.publishedAt, null);
  assert.equal(cards.undated!.discoveredAt, discovered.toISOString());
  assert.equal(cards.undated!.eventDate, "2026-11-04");
});
