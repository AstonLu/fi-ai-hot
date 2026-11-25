import { redirect, useLoaderData } from "react-router";
import { SITE } from "@aihot/site";
import type { Route } from "./+types/home";
import type { PoolResponse, TimelineResponse } from "@aihot/contracts/site";
import { displayTagIn } from "@aihot/contracts/taxonomy";
import { apiGet, cachedPage, loadOr404, pagePathname } from "../lib/api.server";
import { pageReuse } from "../lib/page-reuse";
import { filterParams, hasFeedFilters, itemListLd, listPath, pageMeta, readFilters, siteLd } from "../lib/seo";
import type { Screen } from "../components/shell/screens";
import { Timeline, UnreadToggle } from "../features/feed/Timeline";
import { Hero } from "../features/feed/Hero";
import { heroStories } from "../features/feed/hero-stories";
import { ActiveFilters, CategoryRow, FeedBar } from "../features/feed/Filters";
import { apiIn, L, localeOf, localizePath, translator, useLocale, useT } from "../lib/i18n";

export const handle: Screen = { name: L("精選", "Top Picks") };
export { pageHeaders as headers } from "../lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const locale = localeOf(pagePathname(request));
  const q = url.searchParams.get("q");
  // Search lives on /all; keep the parameters so old links still land on results.
  if (q && q.trim()) throw redirect(localizePath(`/all${url.search}`, locale));
  const filters = readFilters(url.searchParams);
  const upstream = new Headers();
  // The banner is drawn from everything tracked, so it has stories when few are selected; the page does without it when that fails.
  const recent = apiGet<PoolResponse>(apiIn("/pool", locale), { signal: AbortSignal.any([request.signal, AbortSignal.timeout(2_000)]) }).then((r) => heroStories(r.items), () => null);
  const data = await loadOr404<TimelineResponse>(listPath(apiIn("/timeline", locale), filterParams(filters)), { responseHeaders: upstream, signal: request.signal });
  // A minute at most, here and on /all: new selections must not wait longer at the edge or in a browser.
  return cachedPage(60, { data, filters, hero: await recent }, upstream);
}

export function meta({ loaderData, location }: Route.MetaArgs) {
  const locale = localeOf(location.pathname);
  const t = translator(locale);
  const path = listPath("/", loaderData ? filterParams(loaderData.filters) : {});
  const titles = loaderData?.data.cards.map((c) => c.item.title) ?? [];
  const jsonLd = path === "/" ? [...siteLd(locale), itemListLd("/", t("精選", "Top Picks"), titles, locale)] : undefined;
  const tags = pageMeta({ locale, path, noindex: hasFeedFilters(loaderData?.filters), jsonLd });
  // Webmaster platforms look for their verification tag on the (Chinese) home page only.
  if (path !== "/" || locale === "en") return tags;
  return [...tags, ...Object.entries(SITE.siteVerification).map(([name, content]) => ({ name, content }))];
}

export default function Home() {
  const { data, filters, hero } = useLoaderData<typeof loader>();
  const t = useT();
  const locale = useLocale();
  const shownTag = filters.tag ? displayTagIn(filters.tag, locale) : null;
  return (
    <div className="board-shell">
      <FeedBar />
      <h1 className="sr-only">{shownTag ? `#${shownTag}` : t("精選", "Top Picks")}</h1>
      {hero && <Hero stories={hero} />}
      <CategoryRow base="/" category={filters.category} channel={filters.channel}>
        <UnreadToggle />
      </CategoryRow>
      <ActiveFilters base="/" channel={filters.channel} tag={filters.tag} />
      <Timeline initial={data} filters={data.filters} />
    </div>
  );
}
