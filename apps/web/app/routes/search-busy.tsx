import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { RingMark } from "@aihot/site/brand/Logo.tsx";
import { PhoneBar } from "../components/shell/PhoneBar";
import { titled } from "../lib/seo";
import { Link } from "../lib/link";
import { localeOf, pagePath, translator, useT } from "../lib/i18n";

export function meta({ location }: { location: { pathname: string } }) {
  const t = translator(localeOf(location.pathname));
  return [{ title: titled(t("搜尋繁忙", "Search is busy")) }, { name: "robots", content: "noindex, follow" }];
}
export function headers() {
  return { "Cache-Control": "no-store" };
}

const RETRY_AFTER_SECONDS = 5;
const SEARCH_PARAMS = ["q", "tag", "channel", "category", "page", "tab"];

/** The busy page after an overloaded search: the same search can be tried again after a few seconds. */
export default function SearchBusy() {
  const { pathname, search } = useLocation();
  const t = useT();
  const [wait, setWait] = useState(RETRY_AFTER_SECONDS);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  const kept = new URLSearchParams();
  for (const [k, v] of new URLSearchParams(search)) if (SEARCH_PARAMS.includes(k)) kept.append(k, v);
  const base = pagePath(pathname).startsWith("/all") ? "/all" : "/";
  const retry = kept.toString() ? `${base}?${kept}` : base;
  const hasSearch = kept.has("q");
  const button = "btn";
  return (
    <>
    <PhoneBar back={{ to: base, label: base === "/all" ? t("全部", "All") : t("精選", "Top Picks") }} />
    <div className="mx-auto max-w-sm py-24 text-center" aria-live="polite">
      <RingMark className="mx-auto mb-5 size-10 text-accent" spinning />
      <h1 className="text-ui-heading font-bold text-ink">{t("搜尋有點忙", "Search is busy")}</h1>
      <p className="mt-2 text-ui-body-sm leading-relaxed text-ink-3">
        {t(
          `現在搜尋的人比較多，請 ${RETRY_AFTER_SECONDS} 秒以後重試。列表瀏覽不受影響。`,
          `A lot of people are searching right now. Try again in ${RETRY_AFTER_SECONDS} seconds—you can still browse the news as usual.`,
        )}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        {hasSearch &&
          (wait > 0 ? (
            <span aria-disabled="true" className={`${button} num cursor-default bg-bg-sunk font-medium text-ink-4`}>{t(`${wait} 秒後可重試`, `Try again in ${wait}s`)}</span>
          ) : (
            <Link to={retry} className={`${button} btn-brand`}>{t("重試這次搜尋", "Search again")}</Link>
          ))}
        <Link to="/all" className={`${button} ${hasSearch ? "btn-quiet" : "btn-brand"}`}>{t("瀏覽全部動態", `Browse all news`)}</Link>
        <Link to="/" className={`${button} btn-quiet`}>{t("回到精選", "Back to Top Picks")}</Link>
      </div>
    </div>
    </>
  );
}
