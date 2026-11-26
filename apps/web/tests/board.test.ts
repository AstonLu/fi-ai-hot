// Failures guarded: two cards share a place; loading a page moves the cards above it; the banner repeats a
// category, shows a weaker report than it could, or turns with a single story; a card dated by when it was
// collected (every card of a run said 13:17), or by a later write-up of an older event.
import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutBoard } from "../app/features/feed/layout.ts";
import { heroStories } from "../app/features/feed/hero-stories.ts";
import { cardTime } from "../app/lib/format.ts";
import { feedItem } from "./web-server.ts";

const items = Array.from({ length: 90 }, (_, i) => feedItem({
  id: `b${i}`, title: "標題".repeat(3 + (i * 7) % 20), summary: "一段摘要。".repeat((i * 5) % 40), score: 40 + (i * 37) % 55,
}));
const pages = [items.slice(0, 30), items.slice(30, 60), items.slice(60)];

test("cards never overlap, in two, three or four columns", () => {
  for (const columns of [2, 3, 4] as const) {
    const taken = new Set<string>();
    for (const card of layoutBoard(pages, true)) {
      const [row, column, rowEnd, columnEnd] = card.areas[columns].split("/").map((n) => n.trim());
      const span = (start: string, end: string) => (end.startsWith("span") ? Number(end.slice(4)) : Number(end) - Number(start));
      assert.ok(Number(column) + span(column!, columnEnd!) - 1 <= columns, card.areas[columns]);
      for (let r = 0; r < span(row!, rowEnd!); r++) for (let c = 0; c < span(column!, columnEnd!); c++) {
        const cell = `${Number(row) + r}:${Number(column) + c}`;
        assert.ok(!taken.has(cell), `${columns} columns, cell ${cell}`);
        taken.add(cell);
      }
    }
  }
});

test("a page that loads leaves the cards above it where they are", () => {
  assert.deepEqual(layoutBoard(pages.slice(0, 2), false).slice(0, 30), layoutBoard(pages, false).slice(0, 30));
});

test("the banner holds the best report of each category, and needs two", () => {
  const of = (id: string, category: "fin-ai" | "fin-reg", score: number) => feedItem({ id, title: id, category, score });
  assert.deepEqual(heroStories([of("a", "fin-ai", 50), of("b", "fin-ai", 80), of("c", "fin-reg", 60)])?.map((s) => s.id), ["b", "c"]);
  assert.equal(heroStories([of("a", "fin-ai", 50), of("b", "fin-ai", 80)]), null);
  // A report of an event another card holds gives its category's place to the next report.
  const held = { ...of("d", "fin-reg", 90), sameEvent: { id: "b", title: "b" } };
  assert.deepEqual(heroStories([of("b", "fin-ai", 80), held, of("c", "fin-reg", 60)])?.map((s) => s.id), ["b", "c"]);
});

test("a card is dated by its event when that came first, else by its publication, else by its collection", () => {
  const now = Date.parse("2026-11-26T06:00:00Z"); // 14:00 in Beijing
  const collected = "2026-11-26T05:17:30Z";
  const at = (fields: Parameters<typeof cardTime>[0]) => cardTime(fields, now).text;
  assert.equal(at({ publishedAt: "2026-11-26T00:21:57Z", discoveredAt: collected }), "08:21");
  assert.equal(at({ publishedAt: "2026-11-24T13:35:08Z", discoveredAt: collected }), "11月24日");
  assert.equal(at({ publishedAt: null, discoveredAt: collected }), "13:17");
  assert.equal(at({ publishedAt: "2026-11-20T21:05:45Z", discoveredAt: collected, eventDate: "2026-11-04" }), "11月4日");
  assert.equal(cardTime({ publishedAt: "2026-11-20T21:05:45Z", discoveredAt: collected, eventDate: "2026-11-04" }, now).dateTime, "2026-11-04");
});
