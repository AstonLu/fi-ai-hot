// The home page's banner: one story per category on a small stack of cards. The front card's bar fills, and
// when it is full the next card comes forward and the headline's word changes with it. Every card and word
// stays mounted, so each change is one movement. Still under reduced motion, where 下一則 turns the stack.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { categoryLabel } from "@aihot/contracts/taxonomy";
import { shortAddresses } from "@aihot/contracts/addresses";
import { sourceIcon } from "@aihot/site/brand/source-icons.ts";
import { IconArrowRight } from "../../components/icons";
import { IntentLink } from "../../components/ui/IntentLink";
import { Picture } from "../../components/ui/Picture";
import { SourceAvatar } from "../../components/ui/SourceAvatar";
import { useLocale, useT } from "../../lib/i18n";
import { reducedMotion } from "../../lib/motion";
import type { HeroStory } from "./hero-stories";

export function Hero({ stories }: { stories: HeroStory[] }) {
  const t = useT();
  const locale = useLocale();
  const [turn, setTurn] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const box = useRef<HTMLElement>(null);
  const n = stories.length;
  const at = turn % n;
  const front = stories[at]!;
  const next = () => setTurn((v) => v + 1);

  // Out of sight or in a hidden tab nothing turns.
  useEffect(() => {
    let seen = true;
    const update = () => setInView(seen && !document.hidden);
    const watch = new IntersectionObserver(([entry]) => { seen = entry!.isIntersecting; update(); }, { threshold: 0.3 });
    watch.observe(box.current!);
    document.addEventListener("visibilitychange", update);
    return () => {
      watch.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // The stack leans a little towards a mouse.
  const lean = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || reducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--lean-x", String(((e.clientX - r.left) / r.width - 0.5) * 2));
    e.currentTarget.style.setProperty("--lean-y", String(((e.clientY - r.top) / r.height - 0.5) * 2));
  };
  const rest = (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.style.removeProperty("--lean-x");
    e.currentTarget.style.removeProperty("--lean-y");
  };
  const names = [...new Set(stories.map((s) => s.source.name))];
  const word = (s: HeroStory) => (s.category ? t(`${categoryLabel(s.category, "zh")}動態`, categoryLabel(s.category, locale)) : "");

  return (
    <section ref={box} aria-label={t("近期值得看", "Worth reading")} className={`hero ${paused || !inView ? "is-paused" : ""}`} onPointerMove={lean} onPointerLeave={rest}>
      <div className="hero-copy">
        <p className="hero-sources">
          <span className="flex" aria-hidden="true">
            {[...new Map(stories.map((s) => [s.source.name, s.source])).values()].slice(0, 4).map((s) => (
              <span key={s.name} className="hero-face"><SourceAvatar id={s.id} name={s.name} iconUrl={sourceIcon(s.id)} size={30} /></span>
            ))}
          </span>
          <span>{t(`來自 ${names.length} 個來源`, `From ${names.length} ${names.length === 1 ? "source" : "sources"}`)}</span>
        </p>
        <p className="hero-title">
          {t("近期值得看的", "Worth reading in")}
          <span className="hero-words">
            {stories.map((s, i) => (
              <span key={s.id} className="hero-word" data-state={i === at ? "on" : turn > 0 && i === (turn - 1) % n ? "off" : undefined} aria-hidden={i !== at || undefined}>
                {[...word(s)].map((c, k) => <span key={k} style={{ "--k": k } as CSSProperties}>{c === " " ? " " : c}</span>)}
              </span>
            ))}
          </span>
        </p>
        <div className="flex items-center gap-2.5">
          <IntentLink viewTransition to={`/items/${front.id}`} className="btn btn-white">
            {t("讀這則", "Read it")}
            <IconArrowRight size={18} className="btn-arrow" />
          </IntentLink>
          <button type="button" className="btn btn-round hero-pause" onClick={() => setPaused(!paused)} aria-label={paused ? t("繼續輪播", "Play") : t("暫停輪播", "Pause")}>
            <span className="hero-pause-mark" data-paused={paused || undefined} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-round" onClick={next} aria-label={t("下一則", "Next story")}>
            <IconArrowRight size={17} />
          </button>
        </div>
      </div>
      <div className="hero-stage">
        {stories.map((s, i) => {
          const k = (i - at + n) % n;
          const place = k === 0 ? "front" : k === 1 ? "next" : k === n - 1 ? "last" : "behind";
          return (
            // Only the front card is the link readers reach by keyboard; the ones behind turn the stack under a pointer.
            <div key={s.id} className="hero-card" data-place={place} aria-hidden={k !== 0 || undefined} onClick={k ? () => setTurn((v) => v + k) : undefined}>
              {s.cover ? (
                <span className="hero-picture"><Picture src={s.cover.fullUrl || s.cover.poster || s.cover.url} alt="" decoding="async" /></span>
              ) : null}
              {k === 0 && <span key={turn} className="hero-bar" onAnimationEnd={next} aria-hidden="true" />}
              <span className={`hero-text ${s.cover ? "" : "is-plain"}`}>
                <span className="hero-source">
                  <SourceAvatar id={s.source.id} name={s.source.name} iconUrl={sourceIcon(s.source.id)} size={28} />
                  <span className="min-w-0 truncate">{s.source.name}</span>
                </span>
                <span className="hero-headline">{s.title}</span>
                {!s.cover && s.summary && <span className="hero-summary">{shortAddresses(s.summary)}</span>}
              </span>
              {k === 0 && <IntentLink viewTransition to={`/items/${s.id}`} tabIndex={-1} aria-label={s.title} className="absolute inset-0" />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
