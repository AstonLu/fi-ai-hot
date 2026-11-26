// The 精選 home's feed as one board of cards, newest first. Keeps its place across back navigation and loads
// further pages. There is no "new items" prompt: readers refresh for the latest head.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigation } from "react-router";
import { ToggleChip } from "../../components/ui/Controls";
import type { TimelineCard, TimelineFilters, TimelineResponse } from "@aihot/contracts/site";
import { SITE } from "@aihot/site";
import { IconArrowRight } from "../../components/icons";
import { RingMark } from "@aihot/site/brand/Logo.tsx";
import { Link } from "../../lib/link";
import { Board, type BoardEntry } from "./Board";
import { EmptyState } from "../../components/ui/Page";
import { apiIn, useLocale, useT } from "../../lib/i18n";
import { isHydrated } from "../../lib/hydration";
import { markRead, setUnreadOnly, useReadSet, useUnreadOnly } from "../../lib/local-state";
import { filterParams, listPath } from "../../lib/seo";
import { isReload, readSnapshot, restoreAnchor, saveSnapshot, useSaveOnLeave } from "../../lib/restore";

const AUTO_BATCHES = 3;

interface ListState {
  version: 3;
  /** The pages as they were loaded: each is laid out on from the one before. */
  pages: TimelineCard[][];
  nextCursor: string | null;
  batches: number;
}

function fromResponse(r: TimelineResponse): ListState {
  return { version: 3, pages: [r.cards], nextCursor: r.nextCursor, batches: 1 };
}

/** 只看未讀, kept in this browser: at the end of the home page's category row. */
export function UnreadToggle() {
  const t = useT();
  const on = useUnreadOnly();
  return (
    <ToggleChip on={on} onToggle={() => setUnreadOnly(!on)}>
      {t("只看未讀", "Unread only")}
    </ToggleChip>
  );
}

export function Timeline({ initial, filters }: { initial: TimelineResponse; filters: TimelineFilters }) {
  const t = useT();
  const api = apiIn("/timeline", useLocale());
  const location = useLocation();
  const navigation = useNavigation();
  const readSet = useReadSet();
  const unreadOnly = useUnreadOnly();
  const historyKey = location.key;

  // Back navigation (client side): restore synchronously from the snapshot. A full reload restores
  // after hydration so the first client render matches the server HTML.
  const [state, setState] = useState<ListState>(() => {
    if (isHydrated()) {
      const snap = readSnapshot<ListState>(historyKey);
      if (snap?.data.version === 3 && snap.data.pages[0]?.length) return snap.data;
    }
    return fromResponse(initial);
  });
  const restoredRef = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [freshKeys, setFreshKeys] = useState<Set<string>>(() => new Set());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Filters (i.e. the loader data) changed. A page still loading for the old filters is cancelled, and a
  // response that arrives anyway is dropped (it belongs to another list and cursor). Back or forward to a
  // filter already visited restores what that history entry had loaded; a new one starts over.
  const filterKey = listPath(api, filterParams(filters));
  const lastFilterKey = useRef(filterKey);
  const pageRequest = useRef<AbortController | null>(null);
  useEffect(() => () => pageRequest.current?.abort(), []);
  useLayoutEffect(() => {
    if (lastFilterKey.current !== filterKey) {
      lastFilterKey.current = filterKey;
      pageRequest.current?.abort();
      pageRequest.current = null;
      setLoadingMore(false);
      setLoadError(false);
      const snap = readSnapshot<ListState>(historyKey);
      if (snap?.data.version === 3 && snap.data.pages[0]?.length) {
        setState(snap.data);
        restoreAnchor(snap.anchor, snap.scrollY);
      } else {
        setState(fromResponse(initial));
      }
    }
  }, [filterKey, initial, historyKey]);

  // The same list with new data (the tab tapped again at the top, or the brand tapped): start over from
  // the fresh head. A change of filters is handled above.
  const lastData = useRef({ initial, filterKey });
  useLayoutEffect(() => {
    const prev = lastData.current;
    lastData.current = { initial, filterKey };
    if (prev.initial === initial || prev.filterKey !== filterKey) return;
    pageRequest.current?.abort();
    pageRequest.current = null;
    setLoadingMore(false);
    setLoadError(false);
    setState(fromResponse(initial));
  }, [initial, filterKey]);

  useLayoutEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const snap = readSnapshot<ListState>(historyKey);
    if (!isHydrated()) {
      // A full load keeps the server's fresh list when the reader reloaded; after a back/forward
      // that reloaded the document, it restores the saved list and position.
      if (snap?.data.version === 3 && snap.data.pages[0]?.length && !isReload()) {
        setState(snap.data);
        requestAnimationFrame(() => restoreAnchor(snap.anchor, snap.scrollY));
      }
      return;
    }
    if (snap?.data.version === 3 && snap.data.pages[0]?.length) restoreAnchor(snap.anchor, snap.scrollY);
  }, [historyKey]);

  // Save the snapshot whenever we leave this history entry.
  useEffect(() => {
    if (navigation.state === "loading" && navigation.location && navigation.location.key !== historyKey) {
      saveSnapshot(historyKey, stateRef.current);
    }
  }, [navigation.state, navigation.location, historyKey]);
  useSaveOnLeave(historyKey, () => stateRef.current);

  const loadMore = useCallback(async () => {
    const s = stateRef.current;
    if (!s.nextCursor || pageRequest.current) return;
    const key = listPath(api, filterParams(filters));
    const controller = new AbortController();
    pageRequest.current = controller;
    const current = () => lastFilterKey.current === key && !controller.signal.aborted;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const res = await fetch(listPath(api, { ...filterParams(filters), cursor: s.nextCursor }), { signal: controller.signal });
      if (res.status === 400) {
        // Cursor no longer fits: start over from the head.
        const head = await fetch(key, { signal: controller.signal });
        if (!head.ok) throw new Error(String(head.status));
        if (current()) setState(fromResponse((await head.json()) as TimelineResponse));
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const page = (await res.json()) as TimelineResponse;
      if (!current()) return;
      setState((prev) => {
        const seen = new Set(prev.pages.flat().map((c) => c.key));
        const added = page.cards.filter((c) => !seen.has(c.key));
        setFreshKeys(new Set(added.map((c) => c.key)));
        return {
          ...prev,
          pages: [...prev.pages, added],
          nextCursor: page.nextCursor,
          batches: prev.batches + 1,
        };
      });
    } catch {
      if (current()) setLoadError(true);
    } finally {
      if (pageRequest.current === controller) {
        pageRequest.current = null;
        setLoadingMore(false);
      }
    }
  }, [filters]);

  // Auto-load a few batches when the sentinel nears the viewport, then hand over to a button.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !state.nextCursor || state.batches >= AUTO_BATCHES) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void loadMore();
    }, { rootMargin: "900px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [state.nextCursor, state.batches, loadMore]);

  // 只看未讀 hides cards read in this browser: an ordinary card by its own id, a reading group by any
  // of its selected reports, so a read representative does not hide the unread reports behind it.
  // A group kept that way is not drawn as read; its expansion marks which reports are unread.
  const unreadVisible = useCallback(
    (card: TimelineCard) => !readSet.has(card.item.id) || (card.group?.memberIds?.some((id) => !readSet.has(id)) ?? false),
    [readSet],
  );
  const pages = useMemo<BoardEntry[][]>(
    () => state.pages.map((page) => (unreadOnly ? page.filter(unreadVisible) : page).map(({ key, item, group }) => ({ key, item, group }))),
    [state.pages, unreadOnly, unreadVisible],
  );
  const visibleCount = useMemo(() => pages.reduce((n, page) => n + page.length, 0), [pages]);
  // With the filter on, a page whose cards are all read would show nothing: keep paging until
  // something is visible. It stops at the list's own automatic bound and leaves the rest to the
  // button, so loading keeps a clear edge and a manual way to continue.
  useEffect(() => {
    if (!unreadOnly || visibleCount > 0 || loadingMore || loadError) return;
    if (!state.nextCursor || state.batches >= AUTO_BATCHES) return;
    void loadMore();
  }, [unreadOnly, visibleCount, loadingMore, loadError, state.nextCursor, state.batches, loadMore]);

  return (
    <div>
      {visibleCount === 0 && !loadingMore && (
        <div>
          {unreadOnly ? (
            state.nextCursor ? (
              <EmptyState title={t("這批精選都讀過了", "You've read all of these")}>
                {loadError
                  ? t("載入更早內容失敗，點下方重試按鈕繼續檢視。", "Couldn't load older picks. Try again below.")
                  : t("點下方“載入更多”，繼續看更早的未讀精選。", "Use “Load more” below for older unread picks.")}
              </EmptyState>
            ) : (
              <EmptyState title={t("沒有未讀的精選內容", "No unread top picks")}>{t("關掉「只看未讀」可以看到全部內容。", "Turn off “Unread only” to see everything.")}</EmptyState>
            )
          ) : (
            <EmptyState title={t("這個篩選下還沒有精選內容", "No top picks match this filter yet")}>{t("換個類別看看，或者去全部動態裡找找。", `Try another category, or browse All ${SITE.subject} News.`)}</EmptyState>
          )}
        </div>
      )}

      <Board
        pages={pages}
        complete={!state.nextCursor}
        filters={filters}
        fresh={freshKeys}
        isRead={({ key, item, group }) => readSet.has(item.id) && !(unreadOnly && unreadVisible({ key, anchorAt: item.timelineAt, item, group }))}
        onOpen={markRead}
      />

      <div ref={sentinel} aria-hidden="true" />
      <FeedEnd loading={loadingMore} error={loadError} hasMore={!!state.nextCursor} manual={state.batches >= AUTO_BATCHES} empty={visibleCount === 0} onMore={loadMore} />
    </div>
  );
}

/** The foot of a paged list: loading, retry, "載入更多" after a few automatic pages, or at the end the way to everything tracked. */
function FeedEnd({ loading, error, hasMore, manual, empty, onMore }: { loading: boolean; error: boolean; hasMore: boolean; manual: boolean; empty: boolean; onMore: () => void }) {
  const t = useT();
  return (
    <div className="flex justify-center py-10">
      {loading ? (
        <span className="inline-flex items-center gap-2 text-ui-caption-lg text-ink-4">
          <RingMark className="size-4 text-accent" spinning /> {t("正在載入", "Loading")}
        </span>
      ) : error ? (
        <button type="button" onClick={onMore} className="btn btn-quiet text-hot">
          {t("載入失敗，點此重試", "Couldn't load. Try again")}
        </button>
      ) : hasMore ? (
        manual && (
          <button type="button" onClick={onMore} className="btn btn-quiet">
            {t("載入更多", "Load more")}
          </button>
        )
      ) : (
        !empty && (
          <Link to="/all" className="btn btn-quiet">
            {t("看全部動態", "See all news")}
            <IconArrowRight size={17} className="btn-arrow" />
          </Link>
        )
      )}
    </div>
  );
}
