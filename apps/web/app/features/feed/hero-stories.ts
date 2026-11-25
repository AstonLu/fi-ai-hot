// What the home page's banner shows: the best recent report of each category.
import type { FeedItemSummary } from "@aihot/contracts/site";
import { coverOf } from "./layout.ts";

export type HeroStory = Pick<FeedItemSummary, "id" | "title" | "summary" | "category" | "source"> & { cover: ReturnType<typeof coverOf> };

const MOST = 5;

/** The highest scored report of each category, best first; null when fewer than two categories have one. */
export function heroStories(items: readonly FeedItemSummary[]): HeroStory[] | null {
  const best = new Map<string, FeedItemSummary>();
  for (const item of items) {
    const before = item.category && best.get(item.category);
    if (item.category && (!before || (item.score ?? 0) > (before.score ?? 0))) best.set(item.category, item);
  }
  if (best.size < 2) return null;
  return [...best.values()]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, MOST)
    .map((item) => ({ id: item.id, title: item.title, summary: item.summary, category: item.category, source: item.source, cover: coverOf(item) }));
}
