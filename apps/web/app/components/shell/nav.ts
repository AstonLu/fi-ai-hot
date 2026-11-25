// Site navigation in one place: what the header names and what its 更多 menu lists, the engine's and the
// site's modules'. An English page leads only to pages that have an English edition.
import type { ReactNode } from "react";
import { NAV, SITE, subjectAfter } from "@aihot/site";
import { webModules } from "../../site-modules";
import { L, hasEnglish, type Locale, type Phrase, type Text } from "../../lib/i18n";
import {
  IconBookmark, IconDoc, IconFlame, IconGrid, IconHeart, IconHistory, IconList, IconMessage, IconPlug,
} from "../icons";

export interface NavItem {
  to: string;
  label: Text;
  icon: (p: { size?: number }) => ReactNode;
  /** Other pages the entry stands for: they and the pages under them light it too. */
  covers?: string[];
  /** Shows the unread dot while the changelog has news. */
  changelog?: boolean;
}

const SECTIONS: Array<{ key: string; title: Text; items: NavItem[] }> = [
  {
    key: "content",
    title: L("內容", "News"),
    items: [
      { to: "/all", label: L(subjectAfter("全部", "動態"), `All ${SITE.subject} News`), icon: IconList },
      { to: "/hot", label: L("熱點榜", "Trending"), icon: IconFlame },
      { to: "/topics", label: L("主題", "Topics"), icon: IconGrid },
    ],
  },
  {
    key: "more",
    title: L("更多", "More"),
    items: [
      { to: "/agent", label: L("Agent 接入", "For Agents"), icon: IconPlug },
      { to: "/about", label: L("關於", "About"), icon: IconHeart },
      { to: "/changelog", label: L("更新日誌", "Changelog"), icon: IconHistory, changelog: true },
      { to: "/feedback", label: L("反饋", "Feedback"), icon: IconMessage },
    ],
  },
];

/** Whether an engine page is a way in from the navigation (site.ts NAV.hidden); a hidden page still opens. */
const inNav = (to: string) => !(NAV.hidden as readonly string[]).includes(to);
export const topicsInNav = inNav("/topics");
export const hotInNav = inNav("/hot");

/** A section's title as the site writes it: what modules name a shared section by. */
const chinese = (text: Text) => (typeof text === "string" ? text : text.zh);

/** Whether the navigation of a page in this language leads to `to`: an English page only to English editions. */
const inLanguage = (to: string, locale: Locale) => locale === "zh" || hasEnglish(to);

const UP = {
  "/hot": { name: L("熱點榜", "Trending"), back: L("熱點", "Trending") },
  "/topics": { name: L("主題", "Topics"), back: L("全部主題", "All topics") },
} as const;

/**
 * Where pages under a navigation entry lead back up to: the entry, or 精選 in its place while the site hides
 * it. `name` is for breadcrumbs and desktop back links (熱點榜), `back` for the phone bar (熱點), `crumbs` its
 * breadcrumb after the site's home.
 */
export function navUp(entry: keyof typeof UP): { to: string; name: Phrase; back: Phrase; crumbs: Array<{ name: Phrase; path: string }> } {
  if (!inNav(entry)) return { to: "/", name: L("精選", "Top Picks"), back: L("精選", "Top Picks"), crumbs: [] };
  return { to: entry, ...UP[entry], crumbs: [{ name: UP[entry].name, path: entry }] };
}

/** Named in the header itself, with the modules' tabs; the rest sits under 更多. */
const HEADER: NavItem[] = [
  { to: "/daily", label: L("日報", "Daily"), icon: IconDoc, covers: ["/weekly", "/monthly"] },
  { to: "/starred", label: L("收藏", "Saved"), icon: IconBookmark },
];

export function headerItems(locale: Locale): NavItem[] {
  const modules = webModules().flatMap((m) => m.tabs ?? []);
  return [HEADER[0]!, ...modules, HEADER[1]!].filter((i) => inLanguage(i.to, locale));
}

/**
 * The 更多 menu: the engine's sections with the modules' between 內容 and 更多; a module naming a section
 * that is already there adds to it. A section takes its title from the first module with an entry in it here.
 */
export function menuSections(locale: Locale): Array<{ key: string; title: Text; items: NavItem[] }> {
  const shown = (items: readonly NavItem[]) => items.filter((i) => inNav(i.to) && inLanguage(i.to, locale));
  const [content, ...rest] = SECTIONS;
  const more = rest.pop()!;
  const sections = [content!, ...rest].map((s) => ({ ...s, items: shown(s.items) }));
  for (const m of webModules()) {
    if (!m.sidebar) continue;
    const items = shown(m.sidebar.items);
    if (!items.length) continue;
    const title = chinese(m.sidebar.section);
    const sectionKey = m.sidebar.sectionKey ?? title;
    const section = sections.find((s) => s.key === sectionKey || chinese(s.title) === title);
    if (section) section.items.push(...items);
    else sections.push({ key: sectionKey, title: m.sidebar.section, items });
  }
  return [...sections, { ...more, items: shown(more.items) }];
}

/** An entry is lit on its pages and the ones it covers (日報 also covers weekly and monthly reports). */
export function navIsActive(item: Pick<NavItem, "to" | "covers">, pathname: string): boolean {
  return [item.to, ...(item.covers ?? [])].some((to) => pathname === to || pathname.startsWith(`${to}/`));
}
