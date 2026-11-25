// Failures guarded: two cards share a place; loading a page moves the cards above it; the banner repeats a
// category, shows a weaker report than it could, or turns with a single story.
import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutBoard } from "../app/features/feed/layout.ts";
import { heroStories } from "../app/features/feed/hero-stories.ts";
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
});
