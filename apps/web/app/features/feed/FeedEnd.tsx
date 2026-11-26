// The foot of a list that loads on by itself as the reader scrolls (精選 and 全部動態). It asks for the next
// batch about a screen before the end, shows a thin loading line while one comes, a retry when it fails,
// and one line at the end. Before hydration (and without JavaScript) it is a plain link to the next page.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { RingMark } from "@aihot/site/brand/Logo.tsx";
import { IconChevronRight } from "../../components/icons";
import { Link } from "../../lib/link";
import { useT } from "../../lib/i18n";
import { isHydrated } from "../../lib/hydration";

export function FeedEnd({ hasMore, loading, error, empty, onMore, nextHref, endNote }: {
  hasMore: boolean;
  loading: boolean;
  error: boolean;
  /** Nothing is shown above, so there is no end to mark. */
  empty: boolean;
  onMore: () => void;
  /** The next page as an address, for readers without JavaScript and for crawlers. */
  nextHref: string | null;
  /** In place of 已經到底, when the list ends for another reason. */
  endNote?: ReactNode;
}) {
  const t = useT();
  // Mounted after hydration (a client-side navigation), it is live from the first render.
  const [hydrated, setHydrated] = useState(isHydrated);
  useEffect(() => setHydrated(true), []);
  const foot = useRef<HTMLDivElement>(null);
  const waiting = hydrated && hasMore && !loading && !error;

  // Watching again after each batch also asks at once for the next one when the foot is still within a screen.
  useEffect(() => {
    const el = foot.current;
    if (!el || !waiting) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) onMore();
    }, { rootMargin: "100% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [waiting, onMore]);

  // One fixed height for every state, so the page does not move as it changes.
  return (
    <div ref={foot} className="flex h-20 items-center justify-center">
      {!hydrated ? (
        hasMore && nextHref && (
          <Link to={nextHref} className="btn btn-quiet">
            {t("下一頁", "Next page")} <IconChevronRight size={14} />
          </Link>
        )
      ) : error ? (
        <button type="button" onClick={onMore} className="btn btn-quiet text-hot">
          {t("載入失敗，點此重試", "Couldn't load. Try again")}
        </button>
      ) : hasMore ? (
        loading && (
          <span role="status" className="inline-flex items-center gap-1.5 text-ui-caption text-ink-4">
            <RingMark className="size-3.5 text-accent" spinning /> {t("正在載入", "Loading")}
          </span>
        )
      ) : (
        !empty && <p className="text-ui-caption text-ink-4">{endNote ?? t("已經到底", "You've reached the end")}</p>
      )}
    </div>
  );
}
