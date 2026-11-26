// A page of reports as a board (全部動態, topics, search results), and the numbered pages under it.
import { IntentLink } from "../../components/ui/IntentLink";
import { useMemo } from "react";
import type { FeedItemSummary } from "@aihot/contracts/site";
import { IconChevronRight } from "../../components/icons";
import { markRead, useReadSet } from "../../lib/local-state";
import { Board } from "./Board";
import { useT } from "../../lib/i18n";

export function ItemBoard({ items }: { items: FeedItemSummary[] }) {
  const readSet = useReadSet();
  const pages = useMemo(() => [items.map((item) => ({ key: item.id, item, group: null }))], [items]);
  return <Board pages={pages} isRead={({ item }) => readSet.has(item.id)} onOpen={markRead} />;
}

/**
 * Numbered pages (the list stays crawlable), with previous / next at the ends. Phones show previous,
 * "2 / 50" and next as large buttons; the numbers stay in the page for crawlers.
 */
export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (p: number) => string }) {
  const t = useT();
  if (pageCount <= 1) return null;
  const pages = [...new Set([1, pageCount, page - 2, page - 1, page, page + 1, page + 2].filter((p) => p >= 1 && p <= pageCount))].sort((a, b) => a - b);
  const btn = "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 transition-colors";
  return (
    <nav aria-label={t("分頁", "Pages")} className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:gap-1">
      {page > 1 && (
        <IntentLink to={href(page - 1)} className="btn btn-quiet">
          {t("上一頁", "Previous")}
        </IntentLink>
      )}
      <span className="num px-1 text-ui-label text-ink-4 lg:hidden">
        {page} / {pageCount}
      </span>
      {pages.map((p, i) => (
        <span key={p} className="hidden items-center gap-1 lg:flex">
          {i > 0 && p - pages[i - 1]! > 1 && <span className="px-0.5 text-ink-4">…</span>}
          <IntentLink
            to={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={`num ${btn} text-ui-label ${p === page ? "bg-ink font-semibold text-bg" : "text-ink-3 hover:bg-bg-sunk hover:text-ink"}`}
          >
            {p}
          </IntentLink>
        </span>
      ))}
      {page < pageCount && (
        <IntentLink to={href(page + 1)} className="btn btn-quiet">
          {t("下一頁", "Next")} <IconChevronRight size={14} />
        </IntentLink>
      )}
    </nav>
  );
}
