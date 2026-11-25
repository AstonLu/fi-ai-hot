// How a list becomes a board of uneven cards. Pure: the same list always gives the same board, on the server
// and in the browser. A card's kind comes from the report (its score within its page, whether it has a
// picture or a quoted post); its height from how much of its text is shown, more for the higher scored,
// estimated so nothing needs measuring; its place from packing the cards into 2, 3 or 4 columns (CSS picks
// by width; phones stack them). Under a two-column card, the cards above it show a little more or less text
// so that their feet meet.
import type { FeedItemSummary, MediaView } from "@aihot/contracts/site";
import { shortAddresses } from "@aihot/contracts/addresses";

/** Row track and gap, px: a card of h rows is h * 24 - 16 tall. */
const ROW = 8;
const GAP = 16;
const UNIT = ROW + GAP;
/** Text widths of one- and two-column cards (284 and 584 less their padding). */
const NARROW = 252;
const WIDE = 552;
const LINE = 24.5;
/** A one-column card's padding, source row and footer. */
const FRAME = 16 + 36 + 28 + 12;
/** A two-column text card's. */
const LEAD_FRAME = 16 + 26 + 6 + 28 + 12;
/** A footer note (同一件事，精選收錄的是…) takes a line of its own. */
const NOTE = 20;
const QUOTE = 118;
/** Lines of summary by score: the top quarter of a page, the middle, the last quarter; and what a card may go to. */
const SUMMARY = { top: 8, middle: 5, last: 2, least: 1, most: 9 };
const PICTURE = { top: 210, rest: 160, least: 130, most: 330 };

export type CardKind = "feature" | "over" | "lead" | "picture" | "quote" | "text";

export interface BoardCard {
  kind: CardKind;
  /** Lines of text shown: where cards stack, and in 2, 3 and 4 columns. */
  lines: Record<1 | 2 | 3 | 4, number>;
  /** CSS grid-area in 2, 3 and 4 columns. */
  areas: Record<2 | 3 | 4, string>;
}

/** The picture a card may show: a post's own, an article's cover where the API sends one. */
export function coverOf(item: Pick<FeedItemSummary, "x" | "cover">): MediaView | null {
  return item.x?.media.find((m) => m.kind === "image" || m.poster) ?? item.cover ?? null;
}

/** A post reads as its own words; one that publishes a long X Article has a headline. */
export const isPost = (item: Pick<FeedItemSummary, "x" | "channel">) => item.channel === "x" && !!item.x && !item.x.article;

/** Text width in em: CJK glyphs are one em, the rest about half. */
const ems = (text: string) => [...text].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 1 : 0.54), 0);
const linesOf = (text: string, size = 17, width = NARROW) => Math.ceil(((ems(text) * size) / width) * 1.04);
const rowsOf = (px: number) => Math.ceil((px + GAP) / UNIT);

/** The score a page's big cards start at: its top eighth, at least one report. */
function bigFrom(items: readonly FeedItemSummary[]): number {
  const scores = items.flatMap((i) => (i.score === null ? [] : [i.score])).sort((a, b) => b - a);
  return scores[Math.max(1, Math.round(scores.length / 8)) - 1] ?? Infinity;
}

/** Big cards are kept apart: at least this many cards before the first and after each. */
const FIRST_BIG = 1;
const AFTER_PICTURE = 4;
const AFTER_LEAD = 3;

interface Entry {
  i: number;
  kind: CardKind;
  w: 1 | 2;
  h: number;
  /** Lines shown, and the fewest and most the card may show. */
  lines: number;
  least: number;
  most: number;
  /** Height besides its lines. */
  rest: number;
}

function measure(item: FeedItemSummary, kind: CardKind, i: number, rank: number): Entry {
  const summary = shortAddresses(item.summary ?? "");
  const note = item.sameEvent ? NOTE : 0;
  if (kind === "lead") {
    const text = Math.min(3, linesOf(item.title, 24, WIDE)) * 32 + Math.min(4, linesOf(summary, 16, WIDE)) * 25;
    return { i, kind, w: 2, h: rowsOf(LEAD_FRAME + note + text), lines: 0, least: 0, most: 0, rest: 0 };
  }
  if (kind === "feature" || kind === "over") return { i, kind, w: 2, h: kind === "over" ? 20 : 22, lines: 0, least: 0, most: 0, rest: 0 };
  const tier = rank < 0.25 ? "top" : rank < 0.75 ? "middle" : "last";
  const title = isPost(item) ? 0 : linesOf(item.title);
  const body = linesOf(summary);
  const show = (n: number) => Math.max(1, title + Math.min(body, n));
  let rest = FRAME + note;
  if (kind === "picture") rest += 12 + (tier === "top" ? PICTURE.top : PICTURE.rest);
  if (kind === "quote") rest += QUOTE;
  const lines = show(kind === "picture" ? Math.min(SUMMARY.middle, SUMMARY[tier]) : SUMMARY[tier]);
  return { i, kind, w: 1, h: rowsOf(rest + lines * LINE), lines, least: show(SUMMARY.least), most: show(SUMMARY.most), rest };
}

function entries(pages: ReadonlyArray<readonly FeedItemSummary[]>): Entry[][] {
  let wait = FIRST_BIG;
  let pictures = 0;
  let i = 0;
  return pages.map((page) => {
    const from = bigFrom(page);
    const ranked = page.map((item, n) => ({ n, score: item.score ?? -1 })).sort((a, b) => b.score - a.score);
    const rank = new Map(ranked.map(({ n }, place) => [n, place / page.length]));
    return page.map((item, n) => {
      const cover = coverOf(item);
      let kind: CardKind = cover ? "picture" : item.x?.quoted?.text ? "quote" : "text";
      const big = wait <= 0 && !isPost(item) && item.score !== null && item.score >= from;
      wait--;
      if (big) {
        if (cover) kind = ++pictures % 3 === 2 ? "over" : "feature";
        else kind = "lead";
        wait = cover ? AFTER_PICTURE : AFTER_LEAD;
      }
      return measure(item, kind, i++, rank.get(n)!);
    });
  });
}

interface Placed extends Entry { row: number; col: number }

/** Skyline packing: one-column cards go to the shortest column, two-column ones over the evenest pair. */
function pack(pages: Entry[][], cols: number, complete: boolean): Placed[] {
  const tops = Array<number>(cols).fill(0);
  const last = Array<Placed | null>(cols).fill(null);
  const out: Placed[] = [];
  let side = -9;
  const shortest = () => tops.indexOf(Math.min(...tops));
  const put = (e: Entry, col: number) => {
    const placed: Placed = { ...e, col, row: Math.max(...tops.slice(col, col + e.w)) };
    for (let c = col; c < col + e.w; c++) {
      tops[c] = placed.row + e.h;
      last[c] = placed;
    }
    out.push(placed);
  };
  /** Moves the foot of a column's last card by up to `by` rows; says how many are left. */
  const adjust = (col: number, by: number): number => {
    const e = last[col];
    if (!e || e.w > 1 || by === 0) return by;
    let h = e.h + by;
    if (e.kind === "picture") {
      const text = e.h * UNIT - GAP - e.rest;
      const spare = Math.round(text - e.lines * LINE);
      const now = e.rest - FRAME - 12 + spare;
      h = Math.min(Math.max(h, e.h - Math.floor(Math.max(0, now - PICTURE.least) / UNIT)), e.h + Math.floor(Math.max(0, PICTURE.most - now) / UNIT));
    } else {
      h = Math.min(Math.max(h, rowsOf(e.rest + e.least * LINE)), rowsOf(e.rest + e.most * LINE) + 1);
      e.lines = Math.max(e.least, Math.min(e.most, Math.floor((h * UNIT - GAP - e.rest) / LINE)));
    }
    const left = e.h + by - h;
    tops[col] = tops[col]! + h - e.h;
    e.h = h;
    return left;
  };
  // A later page never moves the cards above it: each page is packed on from where the one before ended.
  for (const page of pages) {
    const queue = [...page];
    while (queue.length) {
      const e = queue[0]!;
      if (e.w === 1) {
        put(queue.shift()!, shortest());
        continue;
      }
      let col = 0;
      let least = Infinity;
      for (let c = 0; c + 1 < cols; c++) {
        const uneven = Math.abs(tops[c]! - tops[c + 1]!);
        const cost = uneven * 2 + Math.max(tops[c]!, tops[c + 1]!) + (cols > 2 && c === side ? 5 : 0);
        if (cost < least) {
          least = cost;
          col = c;
        }
      }
      const low = tops[col]! <= tops[col + 1]! ? col : col + 1;
      const gap = Math.abs(tops[col]! - tops[col + 1]!);
      // Level the pair: a longer last card in the lower column, a shorter one in the other; if that is not
      // enough, a later card comes first into the lower column.
      if (gap > 1) {
        const next = queue.slice(1, 9).findIndex((o) => o.w === 1);
        if (gap > 8 && next >= 0) {
          put(queue.splice(next + 1, 1)[0]!, low);
          continue;
        }
        const left = adjust(low, gap);
        adjust(low === col ? col + 1 : col, -left);
      } else adjust(low, gap);
      side = col;
      put(queue.shift()!, col);
    }
  }
  // At the end of the list, the last cards even out the foot as far as their text allows.
  if (complete) {
    const foot = Math.max(...tops);
    for (let c = 0; c < cols; c++) adjust(c, foot - tops[c]!);
  }
  return out;
}

/** The board of `pages` (as they were loaded), one card per report in reading order. */
export function layoutBoard(pages: ReadonlyArray<readonly FeedItemSummary[]>, complete: boolean): BoardCard[] {
  const measured = entries(pages);
  const cards: BoardCard[] = measured.flat().map((e) => ({
    kind: e.kind,
    lines: { 1: e.lines, 2: e.lines, 3: e.lines, 4: e.lines },
    areas: { 2: "", 3: "", 4: "" },
  }));
  for (const cols of [2, 3, 4] as const) {
    for (const e of pack(measured, cols, complete)) {
      cards[e.i]!.lines[cols] = e.lines;
      cards[e.i]!.areas[cols] = `${e.row + 1} / ${e.col + 1} / span ${e.h} / span ${e.w}`;
    }
  }
  return cards;
}
