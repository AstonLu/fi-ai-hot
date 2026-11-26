// 全部動態 (and its search results) as one board that loads the next page as the reader scrolls, to the last
// page the API serves. One instance per history entry (the route keys it by location): back or forward
// restores what that entry had loaded and where the reader was; a new entry, such as another filter, starts over.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigation } from "react-router";
import type { FeedItemSummary, PoolResponse } from "@aihot/contracts/site";
import { isHydrated } from "../../lib/hydration";
import { markRead, useReadSet } from "../../lib/local-state";
import { isReload, readSnapshot, restoreAnchor, saveSnapshot, useSaveOnLeave } from "../../lib/restore";
import { useT } from "../../lib/i18n";
import { Board, type BoardEntry } from "./Board";
import { FeedEnd } from "./FeedEnd";

interface PoolState {
  kind: "pool";
  /** The address of the list without its page, so a snapshot of another list is never taken for this one. */
  list: string;
  /** The pages as they were loaded, each without the reports an earlier one already showed. */
  pages: FeedItemSummary[][];
  page: number;
  pageCount: number;
}

/** Pages beyond this are not served (POOL_MAX_PAGES): the end of the list says so. */
const LAST_PAGE = 50;

const fromResponse = (list: string, r: PoolResponse): PoolState => ({ kind: "pool", list, pages: [r.items], page: r.page, pageCount: r.pageCount });

export function PoolFeed({ initial, api, pageHref }: {
  initial: PoolResponse;
  /** The API address of this list (search and filters), without a page. */
  api: string;
  pageHref: (page: number) => string;
}) {
  const t = useT();
  const historyKey = useLocation().key;
  const navigation = useNavigation();
  const readSet = useReadSet();

  const saved = () => {
    const snap = readSnapshot<PoolState>(historyKey);
    return snap?.data.kind === "pool" && snap.data.list === api && snap.data.pages[0]?.length ? snap : null;
  };
  // A client-side return restores at once; a full document load restores after hydration, so the
  // first client render matches the server HTML.
  const [state, setState] = useState<PoolState>(() => (isHydrated() && saved()?.data) || fromResponse(api, initial));
  const stateRef = useRef(state);
  stateRef.current = state;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  useLayoutEffect(() => {
    const snap = saved();
    if (!snap) return;
    if (isHydrated()) restoreAnchor(snap.anchor, snap.scrollY);
    else if (!isReload()) {
      setState(snap.data);
      requestAnimationFrame(() => restoreAnchor(snap.anchor, snap.scrollY));
    }
  }, []);

  // The same address loaded again (its tab tapped at the top): start over from the fresh first page.
  const lastInitial = useRef(initial);
  useLayoutEffect(() => {
    if (lastInitial.current === initial) return;
    lastInitial.current = initial;
    request.current?.abort();
    request.current = null;
    setLoading(false);
    setError(false);
    setState(fromResponse(api, initial));
  }, [initial, api]);

  useEffect(() => {
    if (navigation.state === "loading" && navigation.location && navigation.location.key !== historyKey) saveSnapshot(historyKey, stateRef.current);
  }, [navigation.state, navigation.location, historyKey]);
  useSaveOnLeave(historyKey, () => stateRef.current);

  const loadMore = useCallback(async () => {
    const s = stateRef.current;
    if (s.page >= s.pageCount || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${api}${api.includes("?") ? "&" : "?"}page=${s.page + 1}`, { signal: controller.signal });
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as PoolResponse;
      if (controller.signal.aborted) return;
      setState((prev) => {
        // New reports at the head shift the pages along: a report may come again on the next page.
        const seen = new Set(prev.pages.flat().map((i) => i.id));
        const added = next.items.filter((i) => !seen.has(i.id));
        setFresh(new Set(added.map((i) => i.id)));
        // A page past the end (the list shrank) ends it.
        const page = Math.min(next.page, next.pageCount);
        return { ...prev, pages: added.length ? [...prev.pages, added] : prev.pages, page: Math.max(prev.page + 1, page), pageCount: next.items.length ? next.pageCount : prev.page };
      });
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  }, [api]);

  const pages = useMemo<BoardEntry[][]>(() => state.pages.map((p) => p.map((item) => ({ key: item.id, item, group: null }))), [state.pages]);
  const hasMore = state.page < state.pageCount;
  return (
    <>
      <Board pages={pages} complete={!hasMore} fresh={fresh} isRead={({ item }) => readSet.has(item.id)} onOpen={markRead} />
      <FeedEnd
        hasMore={hasMore}
        loading={loading}
        error={error}
        empty={pages.length === 0 || pages[0]!.length === 0}
        onMore={loadMore}
        nextHref={hasMore ? pageHref(state.page + 1) : null}
        endNote={state.page >= LAST_PAGE ? t("最多提供 50 頁，更早的內容請使用搜尋或主題頁。", "Only the first 50 pages are shown. For older news, use Search or Topics.") : undefined}
      />
    </>
  );
}
