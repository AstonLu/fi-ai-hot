import { useEffect } from "react";
import { redirect, useLoaderData, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/all";
import type { PoolResponse } from "@aihot/contracts/site";
import { displayTagIn } from "@aihot/contracts/taxonomy";
import { SEO_TITLES, SITE, subjectAfter } from "@aihot/site";
import { ENGLISH } from "@aihot/contracts/english";
import { beijingTime } from "@aihot/contracts/time";
import { cachedPage, loadOr404, pagePathname } from "../lib/api.server";
import { pageReuse } from "../lib/page-reuse";
import { feedListPath, filterParams, hasFeedFilters, itemListLd, listPath, pageMeta, readFilters } from "../lib/seo";
import { ActiveFilters, CategoryRow, FeedBar } from "../features/feed/Filters";
import { PillTabs } from "../components/ui/Tabs";
import { ItemBoard, Pagination } from "../features/feed/ItemBoard";
import { EmptyState } from "../components/ui/Page";
import { IconSearch } from "../components/icons";
import { PhoneBar } from "../components/shell/PhoneBar";
import type { Screen } from "../components/shell/screens";
import { openSearch } from "../features/search/SearchOverlay";
import { addRecentSearch } from "../lib/local-state";
import { Link } from "../lib/link";
import { apiIn, L, localeOf, localizePath, pagePath, translator, useLocale, useT } from "../lib/i18n";

export const handle: Screen = { name: L("全部", "All") };
export { pageHeaders as headers } from "../lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

const ALL_TITLE = L(subjectAfter("全部", "動態"), `All ${SITE.subject} News`);

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const locale = localeOf(pagePathname(request));
  const q = url.searchParams.get("q")?.trim().slice(0, 200) || null;
  const tab = url.searchParams.get("tab") === "relevance" ? "relevance" : null;
  // Older deep-paging parameters (deep, anchorAt) still open a normal page.
  const page = Math.min(Math.max(Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1, 1), 50);
  const data = await loadOr404<PoolResponse>(
    listPath(apiIn("/pool", locale), { ...filterParams(readFilters(url.searchParams)), q, tab, page: page > 1 ? page : null }),
    // The busy page keeps the search, so it can be tried again as it was.
    { signal: request.signal, busyRedirect: localizePath(`/all/search-busy${url.search}`, locale) },
  );
  // Past the last page of what there is: the last page, with the same search and filters.
  if (data.total > 0 && data.page > data.pageCount) throw redirect(localizePath(pageHref(url.searchParams, data.pageCount), locale));
  return cachedPage(60, { data });
}

export function meta({ loaderData, location }: Route.MetaArgs) {
  const locale = localeOf(location.pathname);
  const t = translator(locale);
  const f = loaderData?.data.filters;
  const q = f?.q;
  const page = loaderData?.data.page ?? 1;
  const path = listPath("/all", { ...(f && filterParams(f)), q, tab: q && f?.tab === "relevance" ? "relevance" : null, page: page > 1 ? page : null });
  const filtered = !!q || hasFeedFilters(f);
  const title = `${q ? t(`搜尋：${q}`, `Search: ${q}`) : filtered ? t(ALL_TITLE) : t(SEO_TITLES.all, ENGLISH?.seoTitles.all ?? SEO_TITLES.all)}${page > 1 ? t(` · 第 ${page} 頁`, ` · Page ${page}`) : ""}`;
  // The first page stands in search for the whole list; later pages only shift its reports along, and
  // their links stay followed so every report is still reached.
  const noindex = filtered || page > 1;
  return pageMeta({
    locale,
    title,
    description: t(
      `${SITE.name} 收錄的${subjectAfter("全部", "相關動態")}，可按頻道、類別與標籤篩選，支援中英文搜尋。`,
      `Every ${SITE.subject} story ${SITE.name} tracks, newest first: filter by channel, category and tag, or search in English or Chinese.`,
    ),
    path,
    noindex,
    jsonLd: noindex ? undefined : itemListLd(path, title, loaderData?.data.items.map((i) => i.title) ?? [], locale),
  });
}

const ALL_BACK = L("全部", "All");

function pageHref(params: URLSearchParams, page: number) {
  return feedListPath("/all", params, { page: page > 1 ? page : null });
}

export default function AllPage() {
  const { data } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const navigation = useNavigation();
  const t = useT();
  const locale = useLocale();
  const f = data.filters;
  const busy = navigation.state === "loading" && !!navigation.location && pagePath(navigation.location.pathname) === "/all";
  const searchTabHref = (tab: "time" | "relevance") => feedListPath("/all", params, { tab: tab === "relevance" ? tab : null });
  const shownTag = f.tag ? displayTagIn(f.tag, locale) : null;
  const title = f.q ? t(`搜尋“${f.q}”`, `Search: “${f.q}”`) : f.tag ? (shownTag ? `#${shownTag}` : t("標籤篩選", "Tag filter")) : null;
  const updated = beijingTime(data.freshness);
  const found = data.total >= 2000 ? t("2000+", "2,000+") : t(String(data.total), data.total.toLocaleString("en-US"));
  // Searches are remembered in this browser for the phone search (listed in the privacy notice).
  useEffect(() => {
    if (f.q) addRecentSearch(f.q);
  }, [f.q]);
  // Older links (/all?search=1) opened the search field; they open the search now.
  useEffect(() => {
    if (params.get("search") === "1") openSearch(f.q ?? "");
  }, []);

  return (
    <div className="board-shell pb-6">
      {/* Phones: the bar, or for a search the query (tap to change it) and back to 全部. */}
      {f.q ? (
        <PhoneBar
          back={{ to: "/all", label: ALL_BACK }}
          center={
            <button type="button" onClick={(event) => openSearch(f.q ?? "", event.currentTarget)} className="flex h-11 min-w-0 max-w-full items-center gap-2 rounded-full bg-well px-3.5 text-ui-body text-ink ring-1 ring-inset ring-line-soft">
              <IconSearch size={16} className="shrink-0 text-ink-4" />
              <span className="truncate">{f.q}</span>
            </button>
          }
        />
      ) : (
        <FeedBar />
      )}
      <h1 data-page-title="" className="pb-3 pt-1 text-ui-title-5 font-bold leading-[1.25] text-ink">{title ?? t(ALL_TITLE)}</h1>
      <CategoryRow base="/all" category={f.category} channel={f.channel} />
      <ActiveFilters base="/all" channel={f.channel} tag={f.tag} />

      {f.q && (
        <div className="mb-3 mt-1 flex flex-wrap items-center justify-between gap-2 lg:mt-0">
          <PillTabs
            size="xs"
            layoutId="all-search-sort"
            label={t("搜尋排序", "Sort results")}
            active={f.tab}
            items={(["time", "relevance"] as const).map((tab) => ({
              key: tab,
              label: tab === "time" ? t("按時間（搜標題和摘要）", "Newest (titles and summaries)") : t("按相關度（含正文）", "Most relevant (with full text)"),
              to: searchTabHref(tab),
            }))}
          />
          <span className="text-ui-caption text-ink-4">
            {t(
              <>找到 <span className="num">{found}</span> 條 · 更新於 <span className="num">{updated}</span></>,
              <><span className="num">{found}</span> {data.total === 1 ? "result" : "results"} · updated <span className="num">{updated}</span> GMT+8</>,
            )}
          </span>
        </div>
      )}

      <div className={`transition-opacity duration-200 ${busy ? "opacity-50" : ""}`}>
        {data.items.length === 0 ? (
          <div>
            <EmptyState
              title={t("沒有找到相關內容", "Nothing found")}
              action={
                f.q && f.tab === "time" ? (
                  <Link to={searchTabHref("relevance")} className="text-ui-label font-medium text-accent hover:underline">
                    {t("試試“按相關度”，連正文一起搜", "Try “Most relevant” to search the full text too")}
                  </Link>
                ) : undefined
              }
            >
              {f.q ? t("換個說法，或者去掉篩選再試。", "Try different keywords, or clear the filters.") : t("這個篩選下暫時沒有內容。", "Nothing here with these filters yet.")}
            </EmptyState>
          </div>
        ) : (
          <ItemBoard items={data.items} />
        )}
      </div>
      <Pagination page={data.page} pageCount={data.pageCount} href={(p) => pageHref(params, p)} />
      {data.page >= 50 && <p className="mt-4 text-center text-ui-caption text-ink-4">{t("最多提供 50 頁，更早的內容請使用搜索或主題頁。", "Only the first 50 pages are shown. For older news, use Search or Topics.")}</p>}
    </div>
  );
}
