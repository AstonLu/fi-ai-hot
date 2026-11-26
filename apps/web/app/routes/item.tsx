import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Await, isRouteErrorResponse, useAsyncError, useLoaderData, useRevalidator, type ClientLoaderFunctionArgs } from "react-router";
import type { Route } from "./+types/item";
import { REPORT_NAMES, reportDateLabel, type FeedItemSummary, type SiteItemDetail, type StoryFollowupsResponse } from "@aihot/contracts/site";
import { categoryLabel, displayTagIn, topicName } from "@aihot/contracts/taxonomy";
import { monthDayEn } from "@aihot/contracts/time";
import { ITEM_COPY, SITE, withSubject } from "@aihot/site";
import { ENGLISH } from "@aihot/contracts/english";
import { linkMentions } from "@aihot/contracts/mentions";
import { addressRuns } from "@aihot/contracts/addresses";
import { cachedPage, loadOr404, pagePathname } from "../lib/api.server";
import { loadFollowups } from "../features/item/followups.server";
import { pageReuse } from "../lib/page-reuse";
import { articleLd, breadcrumbLd, pageMeta, siteUrl, titled, titleCacheSeconds } from "../lib/seo";
import { cardSource, fullDateTime, timeAgo } from "../lib/format";
import { markRead } from "../lib/local-state";
import { copyText } from "../lib/clipboard";
import { SameEventBadge, SelectedBadge } from "../components/ui/Badge";
import { ScoreLabel, shownScore } from "../components/ui/Score";
import { PillTabs } from "../components/ui/Tabs";
import { SourceAvatar } from "../components/ui/SourceAvatar";
import { sourceIcon } from "@aihot/site/brand/source-icons.ts";
import { Menu, MenuItem } from "../components/ui/Menu";
import { StarButton } from "../features/feed/parts";
import { GroupButton, GroupSources } from "../features/feed/ReadingGroup";
import { StoryFollowups } from "../features/item/StoryFollowups";
import { MediaGallery } from "../features/item/MediaGallery";
import { QuotedPost } from "../features/item/QuotedPost";
import { ArticleBody } from "../features/item/ArticleBody";
import { MentionText } from "../components/ui/MentionText";
import { ActionsSheet, ReaderToolbar, type ActionRow } from "../features/item/ReaderTools";
import { OutlineSheet } from "../components/ui/OutlineSheet";
import { takePreview } from "../features/item/preview";
import { IconArrowLeft, IconCopy, IconDownload, IconExternal, IconImage, IconList, IconMenu, IconMore, IconShare } from "../components/icons";
import { BarButton, PhoneBar } from "../components/shell/PhoneBar";
import { isPhone } from "../components/shell/screens";
import { Link, useNavigate } from "../lib/link";
import { apiIn, localeOf, localizePath, translator, useLocale, useT, type Locale } from "../lib/i18n";

export { pageHeaders as headers } from "../lib/api.server";

const PosterSheet = lazy(() => import("../features/item/PosterSheet"));

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = localeOf(pagePathname(request));
  const item = await loadOr404<SiteItemDetail>(apiIn(`/items/${encodeURIComponent(params.id)}`, locale), { signal: request.signal });
  return cachedPage(titleCacheSeconds(600, locale, item.indexable ? item.title : null), { item, followups: await loadFollowups(item, locale, request.signal) });
}

type Loaded = { item: SiteItemDetail; followups: StoryFollowupsResponse | null };
type Preview = { item: null; preview: FeedItemSummary; detail: Promise<Loaded> };

/**
 * Phones: an article tapped in a list opens at once with what the card showed (title, summary, reason),
 * while its full text loads. Opened any other way, or on desktop, the page waits for its data as usual.
 */
const reuse = pageReuse<typeof loader>();
export const { shouldRevalidate } = reuse;
export async function clientLoader(args: ClientLoaderFunctionArgs) {
  const { params } = args;
  const preview = isPhone() && params.id ? takePreview(params.id) : null;
  if (!preview) return reuse.clientLoader(args);
  return { item: null, preview, detail: reuse.clientLoader(args) } satisfies Preview;
}
clientLoader.hydrate = true as const;

export function meta({ loaderData, location }: Route.MetaArgs) {
  const locale = localeOf(location.pathname);
  const t = translator(locale);
  if (!loaderData) return [{ title: titled(t("內容不存在", "Article not found")) }, { name: "robots", content: "noindex" }];
  const { item } = loaderData;
  if (!item) return [{ title: titled(loaderData.preview.title) }];
  const section = [...new Set([...(item.category ? [categoryLabel(item.category, locale)] : []), ...item.topics.map((topic) => topicName(topic.slug, topic.name, locale))])];
  return pageMeta({
    locale,
    title: item.title,
    description: item.summary ?? undefined,
    path: `/items/${item.id}`,
    image: `/og/items/${item.id}.png`,
    type: "article",
    noindex: !item.indexable,
    googleNoindex: item.googleNoindex,
    jsonLd: [
      articleLd({ locale, path: `/items/${item.id}`, headline: item.title, description: item.summary, publishedAt: item.publishedAt ?? item.discoveredAt, image: `/og/items/${item.id}.png`, basedOn: item.links.original, section }),
      breadcrumbLd([
        { name: SITE.name, path: "/" },
        { name: item.selected ? t("精選", "Top Picks") : t("全部動態", `All ${SITE.subject} News`), path: item.selected ? "/" : "/all" },
        { name: item.title, path: `/items/${item.id}` },
      ], locale),
    ],
  });
}

/** A 2px accent line across the top that follows long bodies. */
function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (ref.current) ref.current.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return <div ref={ref} aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left scale-x-0 bg-accent transition-transform duration-150 ease-out" />;
}

/** WeChat's in-app browser cannot save downloads: there the Markdown is copied instead. */
function inWeChat(): boolean {
  return typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** The byline, unless the source's name already says it (公眾號：卡爾的AI沃茨 by AI沃茨, Claude：YouTube by Claude). */
function bylineOf(author: string | null, source: string): string | null {
  const key = (s: string) => s.toLowerCase().replace(/[\s\p{P}]/gu, "");
  const a = author ? key(author) : "";
  const s = key(source);
  return a && !s.includes(a) && !a.includes(s) ? author : null;
}

/** "11月7日 AI 日報 · 頭條" / "AI Daily, Nov 7 · Lead story": the daily that carries the article, named as the site names its issues. */
function dailyName(daily: NonNullable<SiteItemDetail["daily"]>, locale: Locale): string {
  const t = translator(locale);
  return t(
    `${reportDateLabel("daily", daily.key)} ${withSubject(REPORT_NAMES.daily)}${daily.lead ? " · 頭條" : ""}`,
    `${SITE.subject} Daily, ${monthDayEn(daily.key)}${daily.lead ? " · Lead story" : ""}`,
  );
}

/**
 * The tag chips that go beside the article's topic chips (every place showing tags shows all its topics): a
 * tag that is a topic's own leads to the topic's page, not to a filtered list search engines are kept from,
 * and beside that topic's chip it is not repeated.
 */
function tagChips(item: SiteItemDetail, locale: Locale): Array<{ tag: string; label: string; to: string }> {
  const shown = new Set(item.topics.map((topic) => topic.slug));
  return item.tags.flatMap((tag) => {
    const label = displayTagIn(tag, locale);
    if (!label) return [];
    const topic = item.tagTopics[tag];
    if (topic && shown.has(topic)) return [];
    return [{ tag, label, to: topic ? `/topics/${topic}` : `/all?tag=${encodeURIComponent(tag)}` }];
  });
}

async function shareOrCopy(item: Pick<SiteItemDetail, "id" | "title">, locale: Locale): Promise<"shared" | "copied" | null> {
  const url = `${siteUrl()}${localizePath(`/items/${item.id}`, locale)}`;
  try {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ title: item.title, url });
      return "shared";
    }
    await copyText(`${item.title}\n${url}`);
    return "copied";
  } catch {
    return null;
  }
}

/** A short line over the page's foot, gone after a moment. */
function useToast(): [string | null, (text: string) => void] {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);
  return [toast, setToast];
}

function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="status" className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-ui-label text-bg shadow-[var(--shadow-pop)] lg:bottom-8">
      {text}
    </div>
  );
}

/** Who published it and when: the source's icon and name as its card shows them, a relayed report's outlet included. */
function SourceRow({ item, byline, at, dated, className = "" }: { item: Pick<FeedItemSummary, "source" | "channel"> & { x: Pick<NonNullable<FeedItemSummary["x"]>, "authorName" | "handle" | "avatarUrl" | "avatarSrcSet"> | null }; byline: string | null; at: string; dated: boolean; className?: string }) {
  const t = useT();
  const locale = useLocale();
  const post = item.channel === "x" ? item.x : null;
  const source = cardSource(item.source);
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-ui-label text-ink-4 ${className}`}>
      <SourceAvatar id={source.id} name={post?.authorName ?? source.name} avatarUrl={post?.avatarUrl} avatarSrcSet={post?.avatarSrcSet} iconUrl={sourceIcon(source.id) ?? source.iconUrl} iconSrcSet={sourceIcon(source.id) ? undefined : source.iconSrcSet} size={28} />
      <span className="font-semibold text-ink">{post?.authorName ?? source.name}</span>
      {post && <span>@{post.handle} · X</span>}
      {byline && <span>{byline}</span>}
      <span>
        {!dated && t("收錄於 ", "Added ")}
        <time dateTime={at}>{fullDateTime(at)}</time>
      </span>
      <span className="empty:hidden" suppressHydrationWarning>{timeAgo(at, undefined, locale)}</span>
    </div>
  );
}

export default function ItemPage() {
  const data = useLoaderData<typeof clientLoader>() as Loaded | Preview;
  if (data.item) return <ItemView key={`${data.item.id}:${data.item.bodyLanguage}`} item={data.item} followups={data.followups} />;
  return (
    <Suspense fallback={<ItemPreview preview={data.preview} />}>
      <Await resolve={data.detail} errorElement={<ItemGone />}>
        {(loaded) => <ItemView key={`${loaded.item.id}:${loaded.item.bodyLanguage}`} item={loaded.item} followups={loaded.followups} />}
      </Await>
    </Suspense>
  );
}

/** Phones, while the article loads: what the card showed, in the article's own places. */
function ItemPreview({ preview }: { preview: FeedItemSummary }) {
  const t = useT();
  const locale = useLocale();
  const [toast, setToast] = useToast();
  const isX = preview.channel === "x" && !!preview.x;
  // A post reads under its author; one that publishes a long X Article reads like an article, under its headline.
  const isPost = isX && !preview.x!.article;
  // Without a reliable date from the original, the card's time is when it was collected, and says so.
  const shownAt = preview.publishedAt ?? preview.timelineAt;
  return (
    <div className="mx-auto max-w-[728px] pb-8">
      <PhoneBar back={{ to: preview.selected ? "/" : "/all", label: preview.selected ? t("精選", "Top Picks") : t("全部", "All") }} title={isPost ? preview.x!.authorName : preview.title} />
      <article className="pb-6 pt-3" aria-busy="true">
        <SourceRow item={preview} byline={null} at={shownAt} dated={!!preview.publishedAt} className={isPost ? "" : "mb-2"} />
        {isPost ? <h1 className="sr-only">{preview.title}</h1> : <h1 data-page-title="" className="text-ui-title-4 font-bold leading-[1.32] tracking-[-0.01em] text-ink lg:text-ui-display-2 lg:leading-[1.28]">{preview.title}</h1>}
        {preview.summary && (
          <section className="mt-4">
            <div className="mb-2 text-ui-caption font-semibold text-ink-4">{isPost && preview.summary.replace(/\s+/g, " ").trim() === preview.title ? t("原文", "Original") : t("AI 導讀", "AI brief")}</div>
            <p className="text-ui-heading-md leading-[1.68] text-ink"><MentionText runs={addressRuns(preview.summary)} /></p>
          </section>
        )}
        {preview.reason && (
          <section className="mt-6 border-t border-line pt-4">
            <div className="mb-1 text-ui-caption font-semibold text-ink-3">{t(ITEM_COPY.reasonLabel, ENGLISH?.reasonLabel ?? ITEM_COPY.reasonLabel)}</div>
            <p className="text-ui-body leading-[1.75] text-ink-2">{preview.reason}</p>
          </section>
        )}
        <div className="mt-9 space-y-3 border-t border-line pt-6" aria-hidden="true">
          {[92, 100, 96, 88, 98, 64].map((w, i) => (
            <div key={i} className="skeleton h-4" style={{ width: `${w}%` }} />
          ))}
        </div>
      </article>
      <ReaderToolbar
        item={preview}
        originalLabel={isX ? t("原推", "View on X") : t("原文", "Original")}
        onShare={async () => {
          if ((await shareOrCopy(preview, locale)) === "copied") setToast(t("連結已複製", "Link copied"));
        }}
      />
      <Toast text={toast} />
    </div>
  );
}

/** The article could not load after the tap: gone (withdrawn, merged away), or the service is busy. */
function ItemGone() {
  const t = useT();
  const error = useAsyncError();
  const revalidator = useRevalidator();
  const gone = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="mx-auto max-w-sm pb-8">
      <PhoneBar back={{ to: "/", label: t("精選", "Top Picks") }} />
      <div className="py-24 text-center">
        <div className="text-ui-heading font-bold text-ink">{gone ? t("找不到這篇內容", "Article not found") : t("暫時無法載入", "Can't load this page")}</div>
        <p className="mt-2 text-ui-label-lg leading-relaxed text-ink-3">{gone ? t("連結可能有誤，或者這篇內容已經下架。", "The link may be wrong, or this article has been taken down.") : t("服務暫時繁忙，請稍後再試。", "The service is busy right now. Please try again later.")}</p>
        {!gone && (
          <button type="button" onClick={() => void revalidator.revalidate()} className="btn btn-quiet mt-6">
            {t("重試", "Try again")}
          </button>
        )}
      </div>
    </div>
  );
}

function ItemView({ item, followups }: Loaded) {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const hasTranslation = item.hasTranslation;
  const lang = item.bodyLanguage;
  const [posterRequested, setPosterRequested] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [toast, setToast] = useToast();
  useEffect(() => { markRead(item.id); }, [item.id]);
  const closePoster = useCallback(() => setPosterOpen(false), []);
  const openPoster = () => {
    setPosterRequested(true);
    setPosterOpen(true);
  };
  const share = async () => {
    const r = await shareOrCopy(item, locale);
    if (r === "copied") setToast(t("連結已複製", "Link copied"));
  };
  const copyLink = async () => {
    try {
      await copyText(`${siteUrl()}${localizePath(`/items/${item.id}`, locale)}`);
      setToast(t("連結已複製", "Link copied"));
    } catch {
      // clipboard unavailable
    }
  };
  const copyMarkdown = async () => {
    try {
      const res = await fetch(`/items/${item.id}/markdown`);
      if (!res.ok) throw new Error(String(res.status));
      await copyText(await res.text());
      setToast(t("Markdown 已複製", "Markdown copied"));
    } catch {
      setToast(t("複製失敗，請在瀏覽器中開啟後匯出", "Couldn't copy. Open this page in a browser to export it."));
    }
  };

  const bodyHtml = lang === "zh" ? (item.body?.zh ?? item.body?.original) : (item.body?.original ?? item.body?.zh);
  const bodyLabel = !item.body ? null : lang === "zh" && item.body.zhKind === "translation" ? t("正文 · AI 翻譯", "Full text · AI translation") : lang === "original" ? t("正文 · 原文", "Full text · Original") : t("正文", "Full text");
  const isX = item.channel === "x" && !!item.x;
  // A post reads under its author; one that publishes a long X Article reads like an article, under its headline.
  const isPost = isX && !item.x!.article;
  // A relayed report's author is its outlet, which the row already names.
  const byline = isX || item.source.outlet ? null : bylineOf(item.author, item.source.name);
  // Without a reliable date from the original, the time shown is when it was collected, labelled as such.
  const shownAt = item.publishedAt ?? item.discoveredAt;
  const summaryOnly = item.readingMode === "summary-only";
  const showOutline = item.outline.length >= 3;
  const originalLabel = isX ? t("在 X 檢視原推", "View on X") : t("開啟原文", "Open original");

  const related = item.relatedStories.filter((s) => s.publicId !== item.story?.publicId);
  const [summaryRuns] = useMemo(() => linkMentions([item.summary], item.mentions), [item.summary, item.mentions]);
  const daily = item.daily && { to: `/daily/${item.daily.key}`, name: dailyName(item.daily, locale) };
  const tags = tagChips(item, locale);
  const reasonLabel = t(ITEM_COPY.reasonLabel, ENGLISH?.reasonLabel ?? ITEM_COPY.reasonLabel);

  const back = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(item.selected ? "/" : "/all");
  };
  const backButton = (
    <button type="button" onClick={back} className="-ml-1.5 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-1.5 text-ui-label text-ink-3 transition-colors hover:text-ink touch:h-11">
      <IconArrowLeft size={16} />{t(" 返回", " Back")}
    </button>
  );
  const moreMenu = (
    <Menu label={t("更多操作", "More actions")} trigger={<IconMenu size={17} />}>
      {(close) => (
        <>
          <MenuItem icon={<IconShare size={15} />} onSelect={() => { close(); void share(); }}>{t("分享連結", "Share link")}</MenuItem>
          <MenuItem icon={<IconImage size={15} />} onSelect={() => { close(); openPoster(); }}>{t("生成分享海報", "Share as image")}</MenuItem>
          <MenuItem icon={<IconCopy size={15} />} onSelect={() => { close(); void copyLink(); }}>{t("複製連結", "Copy link")}</MenuItem>
          {item.markdownAvailable &&
            (inWeChat() ? (
              <MenuItem icon={<IconDownload size={15} />} onSelect={() => { close(); void copyMarkdown(); }}>{t("複製 Markdown", "Copy as Markdown")}</MenuItem>
            ) : (
              <MenuItem icon={<IconDownload size={15} />} href={`/items/${item.id}/markdown`} download onSelect={close}>
                {t("匯出 Markdown", "Export as Markdown")}
              </MenuItem>
            ))}
        </>
      )}
    </Menu>
  );
  // Phones: the same actions as a sheet from the bar (分享 and 原文 are on the toolbar).
  const phoneActions: ActionRow[] = [
    { key: "poster", label: t("生成分享海報", "Share as image"), icon: <IconImage size={20} />, onSelect: openPoster },
    { key: "copy", label: t("複製連結", "Copy link"), icon: <IconCopy size={20} />, onSelect: () => void copyLink() },
    ...(item.markdownAvailable
      ? [inWeChat()
        ? { key: "markdown", label: t("複製 Markdown", "Copy as Markdown"), icon: <IconDownload size={20} />, onSelect: () => void copyMarkdown() }
        : { key: "markdown", label: t("匯出 Markdown", "Export as Markdown"), icon: <IconDownload size={20} />, href: `/items/${item.id}/markdown`, download: true }]
      : []),
  ];
  const verdict = (
    <>
      {item.selected && (item.sameEvent ? <SameEventBadge /> : <SelectedBadge />)}
      {shownScore(item.score) !== null && <ScoreLabel score={item.score} />}
    </>
  );

  return (
    <div className="mx-auto max-w-[728px] pb-8">
      {item.body && <ReadingProgress />}

      {/* Phones: back to where the reader came from, the title once it has scrolled away, more actions. */}
      <PhoneBar
        back={{ to: item.selected ? "/" : "/all", label: item.selected ? t("精選", "Top Picks") : t("全部", "All") }}
        title={isPost ? item.x!.authorName : item.title}
        actions={
          <BarButton label={t("更多操作", "More actions")} onClick={() => setActionsOpen(true)}>
            <IconMore size={22} />
          </BarButton>
        }
      />

      {/* Desktop: 返回 and the actions stay at the top while reading. */}
      <div className="sticky top-0 z-20 -mx-2 hidden items-center justify-between gap-3 bg-bg/95 px-2 py-1.5 backdrop-blur lg:flex">
        {backButton}
        <div className="flex items-center gap-1">
          {showOutline && (
            <button type="button" onClick={() => setOutlineOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-ui-caption-lg font-medium text-ink-3 transition-colors hover:bg-bg-sunk hover:text-ink touch:h-11">
              <IconList size={15} />{t(" 目錄", " Contents")}
            </button>
          )}
          <StarButton item={item} className="size-8 touch:size-11" />
          {moreMenu}
        </div>
      </div>
        <article className="pb-6 pt-3 lg:pt-2 2xl:pt-1">
          <SourceRow item={item} byline={byline} at={shownAt} dated={!!item.publishedAt} className={isPost ? "" : "mb-2"} />
          {isPost ? <h1 className="sr-only">{item.title}</h1> : <h1 data-page-title="" className="text-ui-title-4 font-bold leading-[1.32] tracking-[-0.01em] text-ink lg:text-ui-display-2 lg:leading-[1.28]">{item.title}</h1>}

          {item.summary && (!isPost || item.summary.replace(/\s+/g, " ").trim() !== item.title) && (
            <section className="mt-4">
              <div className="mb-2 text-ui-caption font-semibold text-ink-4">{summaryOnly ? t("摘要", "Summary") : t("AI 導讀", "AI brief")}</div>
              <p className="text-ui-heading-md leading-[1.68] text-ink"><MentionText runs={summaryRuns} /></p>
            </section>
          )}

          {item.reason && !summaryOnly && (
            <section className="mt-6 border-t border-line pt-4">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-ui-caption font-semibold text-ink-4">{reasonLabel}{verdict}</div>
              <p className="text-ui-body leading-[1.75] text-ink-2">{item.reason}</p>
            </section>
          )}

          {(!item.reason || summaryOnly) && <div className="mt-5 flex flex-wrap items-center gap-2 empty:hidden">{verdict}</div>}

          {item.sameEvent && (
            <p className="mt-5 text-ui-label leading-relaxed text-ink-4">
              {t("同一件事，精選收錄的是", "Same story in Top Picks: ")}
              <Link viewTransition to={`/items/${item.sameEvent.id}`} className="text-ink-3 transition-colors hover:text-accent">
                {t(<>《{item.sameEvent.title}》</>, <>“{item.sameEvent.title}”</>)}
              </Link>
            </p>
          )}

          {item.group && item.group.reportCount > 1 && (
            <div className="mt-5">
              <div className="hidden lg:block"><GroupSources group={item.group} parentId={item.id} /></div>
              <GroupButton group={item.group} parentId={item.id} />
            </div>
          )}

          {summaryOnly && <p className="mt-7 rounded-control bg-bg-sunk px-4 py-3 text-ui-label-lg leading-relaxed text-ink-3">{t("本站只提供摘要與原文連結。", "Only a summary and a link to the original are available here.")}</p>}

          {item.body && bodyHtml && (
            <section className="mt-9 border-t border-line pt-4 xl:mt-10">
              <div className="mb-6 flex items-center justify-between gap-3">
                <span className="text-ui-caption text-ink-4">{bodyLabel}</span>
                {hasTranslation && (
                  <PillTabs
                    size="xs"
                    layoutId="item-body-lang"
                    label={t("正文語言", "Full text language")}
                    active={lang}
                    items={[
                      { key: "zh", label: t("中文", "Chinese"), prefetchOnPress: true, replace: true, to: `/items/${item.id}` },
                      { key: "original", label: t("原文", "Original"), prefetchOnPress: true, replace: true, to: `/items/${item.id}/original` },
                    ]}
                  />
                )}
              </div>
              {hasTranslation && lang === "zh" && !item.body.complete && (
                <p className="mb-5 rounded-control bg-bg-sunk px-3 py-2 text-ui-label text-ink-3">{t("譯文尚不完整，完整內容請切換到原文。", "The translation isn't complete yet. Switch to the original for the full text.")}</p>
              )}
              <ArticleBody html={bodyHtml} />
            </section>
          )}

          {isX && item.x!.media.length > 0 && <MediaGallery media={item.x!.media} postUrl={item.links.original} />}
          {isX && item.x!.quoted?.html && <QuotedPost quoted={item.x!.quoted} original={lang === "original"} />}

          <a href={item.links.original} target="_blank" rel="noopener noreferrer" className="mt-8 flex items-center gap-3 rounded-card border border-line-soft bg-surface p-4 transition-colors hover:border-line-strong">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ui-caption font-semibold text-ink-3">{hostOf(item.links.original)}</span>
              {item.originalTitle && item.originalTitle !== item.title && <span className="mt-0.5 line-clamp-2 text-ui-body-lg leading-6 text-ink">{item.originalTitle}</span>}
              <span className="mt-0.5 block text-ui-label text-accent">{originalLabel}</span>
            </span>
            <IconExternal size={17} className="shrink-0 text-ink-4" />
          </a>

          {(daily || item.topics.length > 0 || tags.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {daily && (
                <Link viewTransition to={daily.to} className="chip">
                  {t(<>收錄於 {daily.name}</>, <>Featured in {daily.name}</>)}
                </Link>
              )}
              {item.topics.map((topic) => (
                <Link viewTransition key={topic.slug} to={`/topics/${topic.slug}`} className="chip">
                  {topicName(topic.slug, topic.name, locale)}
                </Link>
              ))}
              {tags.slice(0, 6).map(({ tag, label, to }) => (
                <Link key={tag} to={to} rel={to.startsWith("/all?") ? "nofollow" : undefined} className="chip">
                  #{label}
                </Link>
              ))}
            </div>
          )}

          {item.story && <StoryFollowups followups={followups} story={item.story} currentId={item.id} />}

          {related.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 text-ui-body-sm font-semibold text-ink">{t("相關事件", "Related stories")}</h2>
              <ul className="divide-y divide-line-soft">
                {related.map((s) => (
                  <li key={s.publicId}>
                    <Link viewTransition to={`/story/${s.publicId}`} className="block py-2.5 text-ui-body-sm text-ink-2 hover:text-accent">
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

      <ReaderToolbar
        item={item}
        originalUrl={item.links.original}
        originalLabel={isX ? t("原推", "View on X") : t("原文", "Original")}
        onOutline={showOutline ? () => setOutlineOpen(true) : undefined}
        onShare={() => void share()}
      />
      {showOutline && <OutlineSheet open={outlineOpen} onClose={() => setOutlineOpen(false)} outline={item.outline} />}
      <ActionsSheet open={actionsOpen} onClose={() => setActionsOpen(false)} rows={phoneActions} />

      {posterRequested && (
        <Suspense fallback={null}>
          <PosterSheet id={item.id} title={item.title} open={posterOpen} onClose={closePoster} />
        </Suspense>
      )}
      <Toast text={toast} />
    </div>
  );
}
