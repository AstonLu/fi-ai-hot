import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { SITE } from "@aihot/site";
import { ENGLISH } from "@aihot/contracts/english";
import { Presence } from "../ui/Presence";
import { IconChevronDown } from "../icons";
import { Link } from "../../lib/link";
import { pagePath, useLocale, useT } from "../../lib/i18n";
import { webModules } from "../../site-modules";
import { Filings } from "./Filings";
import { FontSelect } from "./FontSelect";
import { LanguageSwitch } from "./LanguageSwitch";
import { ThemeSwitch } from "./ThemeSwitch";
import { menuSections, navIsActive } from "./nav";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-10 items-center gap-3 px-3 touch:min-h-11">
      <span className="min-w-0 flex-1 text-ui-label text-ink-2">{label}</span>
      {children}
    </div>
  );
}

/**
 * 更多 in the desktop header: the pages the header does not name, the reader's account, the appearance and
 * font settings and, on a site with an English edition, the language switch. Phones have them at /more.
 */
export function MoreMenu({ dot }: { dot: boolean }) {
  const t = useT();
  const locale = useLocale();
  const { key, pathname: address } = useLocation();
  const pathname = pagePath(address);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const Account = webModules().find((m) => m.account)?.account;

  useEffect(() => setOpen(false), [key]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="more-menu"
        onClick={() => setOpen(!open)}
        className="btn btn-text gap-1"
      >
        {t("更多", "More")}
        <IconChevronDown size={15} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        {dot && <span className="size-1.5 rounded-full bg-hot" aria-label={t("有新的更新", "New updates")} />}
      </button>
      <div id="more-menu" inert={!open}>
        <Presence show={open} enter="anim-drop-in" exit="anim-drop-out" duration={140}>
          <div className="absolute right-0 top-full z-50 max-h-[calc(100dvh-72px)] w-[248px] overflow-y-auto rounded-card border border-line bg-raised py-1 shadow-[var(--shadow-pop)]">
            {Account && (
              <div className="mb-1 border-b border-line-soft pb-1" onClickCapture={() => { trigger.current?.focus(); setOpen(false); }}>
                <Account place="menu" />
              </div>
            )}
            {menuSections(locale).map((section) => (
              <ul key={section.key} aria-label={t(section.title)} className="mb-1 border-b border-line-soft pb-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const on = navIsActive(item, pathname);
                  return (
                    <li key={item.to}>
                      <Link to={item.to} aria-current={on ? "page" : undefined} className={`flex min-h-10 items-center gap-2.5 px-3 text-ui-body-sm transition-colors hover:bg-bg-sunk touch:min-h-11 ${on ? "font-semibold text-accent" : "text-ink"}`}>
                        <Icon size={17} />
                        {t(item.label)}
                        {dot && item.changelog && <span className="ml-auto size-1.5 rounded-full bg-hot" aria-label={t("有新的更新", "New updates")} />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ))}
            <Row label={t("外觀", "Appearance")}>
              <ThemeSwitch compact className="w-24" />
            </Row>
            <Row label={t("字型", "Font")}>
              <FontSelect />
            </Row>
            {ENGLISH && (
              <Row label={t("語言", "Language")}>
                <LanguageSwitch compact className="w-[124px]" />
              </Row>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft px-3 py-2 text-ui-caption-sm text-ink-4">
              {SITE.github && (
                <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="hover:text-ink-2">
                  {t("GitHub 開源", "Open source on GitHub")}
                </a>
              )}
              {SITE.poweredBy && (
                <a href={SITE.poweredBy.url} target="_blank" rel="noopener" className="hover:text-ink-2">
                  {t(<>由 {SITE.poweredBy.name} 驅動</>, <>Powered by {SITE.poweredBy.name}</>)}
                </a>
              )}
              <Filings className="hover:text-ink-2" badgeSize={11} />
            </div>
          </div>
        </Presence>
      </div>
    </div>
  );
}
