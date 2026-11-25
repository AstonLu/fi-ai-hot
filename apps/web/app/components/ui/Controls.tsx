import type { ReactNode, SelectHTMLAttributes } from "react";
import { IconCheck, IconChevronDown } from "../icons";

/** The classes of a button, and of links that look like one. */
export function buttonClass(variant: "primary" | "secondary" = "secondary"): string {
  return `btn ${variant === "primary" ? "btn-brand" : "btn-quiet"}`;
}

/** Native select as a pill, like the site's other controls. */
export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select
        className="h-11 w-full cursor-pointer appearance-none rounded-full border border-line-strong bg-surface py-0 pl-3.5 pr-8 text-ui-body-lg text-ink-2 outline-none lg:h-8 lg:text-ui-caption-lg transition-colors hover:border-ink-4 focus:border-accent"
        {...rest}
      >
        {children}
      </select>
      <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-4" />
    </span>
  );
}

/**
 * A filter that combines with others: a pill with its own small check mark, so a row of them reads
 * as "pick any" rather than the one-of-many `PillTabs` switch.
 */
export function ToggleChip({ on, onToggle, children }: { on: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`inline-flex h-11 shrink-0 lg:h-8 select-none items-center gap-1.5 whitespace-nowrap rounded-full border pl-2 pr-3.5 text-ui-label font-medium transition-colors duration-150 active:scale-[0.98] ${on ? "border-accent/35 bg-accent-soft text-accent" : "border-line-strong bg-surface text-ink-2 hover:border-ink-4 hover:text-ink"}`}
    >
      <span aria-hidden="true" className={`inline-flex size-4 items-center justify-center rounded-full border transition-colors duration-150 ${on ? "border-accent bg-accent text-accent-contrast" : "border-line-strong"}`}>
        {on && <IconCheck size={11} strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}
