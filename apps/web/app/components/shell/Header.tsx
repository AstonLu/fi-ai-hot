import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { SITE } from "@aihot/site";
import { Wordmark } from "@aihot/site/brand/Logo.tsx";
import { openSearch, useSearchShortcut } from "../../features/search/SearchOverlay";
import { useChangelogSeen } from "../../lib/local-state";
import { IntentLink } from "../ui/IntentLink";
import { Link } from "../../lib/link";
import { pagePath, useLocale, useT } from "../../lib/i18n";
import { headerItems, navIsActive } from "./nav";
import { MoreMenu } from "./MoreMenu";

/** True while the changelog has an entry newer than the one this reader last opened; never on English pages, which have no changelog. */
export function useChangelogDot(latestVersion: string | null): boolean {
  const seen = useChangelogSeen();
  const english = useLocale() === "en";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !latestVersion || english) return false;
  return !seen || seen < latestVersion;
}

/** The brand, leading home. */
export function Brand({ size, className = "" }: { size?: number; className?: string }) {
  const t = useT();
  return (
    <Link to="/" aria-label={t(`${SITE.name} 首頁`, `${SITE.name} home`)} className={`flex shrink-0 items-center ${className}`}>
      <Wordmark size={size} />
    </Link>
  );
}

export function SearchButton({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <button type="button" onClick={(event) => openSearch("", event.currentTarget)} className={`btn btn-brand shrink-0 ${className}`}>
      {t("搜尋", "Search")}
    </button>
  );
}

/** The site's header on desktop (lg up); on phones each page brings its own bar (PhoneBar). It scrolls away with the page. */
export function Header({ changelogVersion }: { changelogVersion: string | null }) {
  const dot = useChangelogDot(changelogVersion);
  const pathname = pagePath(useLocation().pathname);
  const locale = useLocale();
  const t = useT();
  useSearchShortcut();
  return (
    <header className="hidden px-5 lg:block">
      <div className="board-shell flex h-16 items-center gap-6">
        <Brand className="mr-auto h-11" />
        <nav className="flex items-center gap-6" aria-label={t("主導航", "Main")}>
          {headerItems(locale).map((item) => {
            const on = navIsActive(item, pathname);
            return (
              <IntentLink key={item.to} to={item.to} aria-current={on ? "page" : undefined} className={`flex h-11 items-center whitespace-nowrap text-ui-body font-semibold transition-colors hover:text-accent ${on ? "text-accent" : "text-ink"}`}>
                {t(item.label)}
              </IntentLink>
            );
          })}
          <MoreMenu dot={dot} />
        </nav>
        <SearchButton />
      </div>
    </header>
  );
}
