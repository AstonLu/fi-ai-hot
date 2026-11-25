// Feed filters: the row of categories, the choice in use that the row does not name, and the phone bar of
// 精選 and 全部.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { CATEGORY_KEYS, categoryLabel, channelLabel, displayTagIn, type CategoryKey, type ChannelKey } from "@aihot/contracts/taxonomy";
import { IconClose } from "../../components/icons";
import { IntentLink } from "../../components/ui/IntentLink";
import { PhoneBar } from "../../components/shell/PhoneBar";
import { Brand, SearchButton } from "../../components/shell/Header";
import { feedListPath } from "../../lib/seo";
import { reducedMotion } from "../../lib/motion";
import { Link } from "../../lib/link";
import { useLocale, useT } from "../../lib/i18n";

// The server has nothing to measure.
const useMeasure = typeof document === "undefined" ? useEffect : useLayoutEffect;

/** The feed's categories (精選 and 全部動態 alike), one at a time; the row scrolls sideways where it does not fit. */
export function CategoryRow({ base, category, channel = "all", children }: { base: string; category: CategoryKey | null; channel?: ChannelKey; children?: React.ReactNode }) {
  const [params] = useSearchParams();
  const t = useT();
  const locale = useLocale();
  const row = useRef<HTMLElement>(null);
  const all = category === null && channel === "all";
  // The choice in use stays in sight in a row that scrolls.
  useEffect(() => {
    const on = row.current?.querySelector<HTMLElement>("[aria-current]");
    if (on && row.current) row.current.scrollTo({ left: on.offsetLeft - 16, behavior: reducedMotion() ? "instant" : "smooth" });
  }, [category]);
  // One dark pill moves to the choice in use; until it is measured the choice carries the colour itself.
  const [lens, setLens] = useState<{ left: number; width: number } | null>(null);
  useMeasure(() => {
    const measure = () => {
      const on = row.current?.querySelector<HTMLElement>("[aria-current]");
      setLens(on ? { left: on.offsetLeft, width: on.offsetWidth } : null);
    };
    measure();
    const resized = new ResizeObserver(measure);
    resized.observe(row.current!);
    return () => resized.disconnect();
  }, [category, channel, locale]);
  const options = [
    { key: "all", label: t("全部", "All"), on: all, to: feedListPath(base, params, { category: null, channel: null }) },
    ...CATEGORY_KEYS.map((k) => ({ key: k as string, label: categoryLabel(k, locale), on: category === k, to: feedListPath(base, params, { category: k, channel: null }) })),
  ];
  return (
    <nav ref={row} aria-label={t("類別", "Categories")} className="bleed scrollbar-none relative flex items-center gap-2 overflow-x-auto pb-4 pt-1 lg:mx-0 lg:px-0">
      {lens && <span aria-hidden="true" className="pill-lens" style={{ width: lens.width, transform: `translateX(${lens.left}px)` }} />}
      {options.map((o) => (
        <IntentLink
          key={o.key}
          to={o.to}
          // Filtered feed views are noindex; keep crawler focus on the unfiltered list.
          rel={o.to.includes("?") ? "nofollow" : undefined}
          aria-current={o.on ? "page" : undefined}
          className={`pill ${o.on ? (lens ? "is-on" : "is-on bg-ink") : ""}`}
        >
          {o.label}
        </IntentLink>
      ))}
      {children && <div className="ml-auto shrink-0 pl-2">{children}</div>}
    </nav>
  );
}

/** The phone bar of 精選 and 全部: the header of the desktop, in one line. */
export function FeedBar() {
  const t = useT();
  const item = "flex h-11 items-center px-1.5 text-ui-body font-semibold text-ink active:opacity-50";
  return (
    <PhoneBar
      center={
        <div className="flex w-full items-center justify-end gap-1 pr-1.5">
          <Link to="/daily" className={item}>{t("日報", "Daily")}</Link>
          <Link to="/starred" className={`${item} hidden min-[360px]:flex`}>{t("收藏", "Saved")}</Link>
          <Link to="/more" className={item}>{t("更多", "More")}</Link>
        </div>
      }
      brand={<Brand size={21} className="h-11 pl-2.5" />}
      actions={<SearchButton className="mr-2.5" />}
    />
  );
}

/** A tag, or 一手 from an older link: the choice in use as a chip that clears itself. */
export function ActiveFilters({ base, channel, tag }: { base: string; channel: ChannelKey; tag: string | null }) {
  const [params] = useSearchParams();
  const t = useT();
  const locale = useLocale();
  const label = channel === "firstParty" ? channelLabel("firstParty", locale) : null;
  const shownTag = tag ? displayTagIn(tag, locale) : null;
  if (!label && !tag) return null;
  const chip = "inline-flex min-h-11 max-w-full items-center gap-1 rounded-full bg-accent-soft pl-3 pr-2 text-ui-label font-medium text-accent-ink dark:text-accent transition-opacity active:opacity-60";
  const clearFilter = feedListPath(base, params, { channel: null });
  const clearTag = feedListPath(base, params, { tag: null });
  return (
    <div className="flex flex-wrap gap-2 pb-4">
      {label && (
        <Link to={clearFilter} rel={clearFilter.includes("?") ? "nofollow" : undefined} aria-label={t(`取消篩選：${label}`, `Clear filter: ${label}`)} className={chip}>
          {t(<>只看{label}</>, <>{label} only</>)}
          <IconClose size={14} strokeWidth={2} />
        </Link>
      )}
      {tag && (
        <Link to={clearTag} rel={clearTag.includes("?") ? "nofollow" : undefined} aria-label={shownTag ? t(`取消標籤：${shownTag}`, `Clear tag: ${shownTag}`) : t("取消標籤篩選", "Clear tag filter")} className={chip}>
          <span className="truncate">{shownTag ? `#${shownTag}` : t("標籤篩選", "Tag filter")}</span>
          <IconClose size={14} strokeWidth={2} className="shrink-0" />
        </Link>
      )}
    </div>
  );
}
