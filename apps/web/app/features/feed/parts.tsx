// Small building blocks shared by feed items, detail pages and lists.
import { useState } from "react";
import type { FeedItemSummary } from "@aihot/contracts/site";
import { IconBookmark } from "../../components/icons";
import { toggleStar, useIsStarred } from "../../lib/local-state";
import { useT } from "../../lib/i18n";

/** The text colour of a report: grey once this browser has opened it, so the unread ones stand out. */
export const readTone = (read: boolean, unread: string) => (read ? "text-ink-4" : unread);

type Starrable = Pick<FeedItemSummary, "id" | "title" | "summary" | "source" | "publishedAt" | "score" | "selected">;

/** Whether an item is in this browser's 收藏, a toggle, and a counter that bumps when it is added. */
export function useStar(item: Starrable) {
  const on = useIsStarred(item.id);
  const [pulse, setPulse] = useState(0);
  const toggle = () => {
    const added = toggleStar({
      id: item.id, title: item.title, summary: item.summary, sourceName: item.source.name,
      publishedAt: item.publishedAt, score: item.score, aiSelected: item.selected,
    });
    if (added) setPulse((p) => p + 1);
  };
  return { on, toggle, pulse };
}

/** Bookmark toggle kept in this browser (收藏): 26px, or sized by `className`. */
export function StarButton({ item, className = "size-[26px]" }: { item: Starrable; className?: string }) {
  const { on, toggle, pulse } = useStar(item);
  const t = useT();
  const label = on ? t("取消收藏", "Remove from Saved") : t("收藏", "Save");
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={`relative z-10 inline-flex shrink-0 items-center justify-center rounded-control transition-colors duration-150 ${on ? "text-accent" : "text-ink-4 hover:bg-bg-sunk hover:text-ink-2"} ${className}`}
    >
      <span key={pulse} className={`flex ${pulse ? "anim-bump" : ""}`}>
        <IconBookmark size={16} filled={on} />
      </span>
    </button>
  );
}
