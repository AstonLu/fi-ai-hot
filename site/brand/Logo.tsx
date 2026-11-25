// 站點的字標和圓環標記：頁面用 Wordmark 畫站名（size 是字級，單位畫素），BarsMark 是字標裡的小圖，RingMark 轉起來是載入動畫。
import { SITE } from "../site.ts";

/** Three rising bars. */
export function BarsMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 22" className={className} fill="currentColor" aria-hidden="true">
      <path d="M0 13h5v9H0zM7.5 7h5v15h-5zM15 0h5v22h-5z" />
    </svg>
  );
}

export function Wordmark({ size = 29, className = "", title = SITE.name }: { size?: number; className?: string; title?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.21em] whitespace-nowrap leading-none tracking-[-0.02em] text-[var(--wordmark)] ${className}`} style={{ fontSize: size }} aria-label={title} role="img">
      <BarsMark className="h-[0.76em] w-auto text-brand" />
      <span aria-hidden="true">{SITE.name}</span>
    </span>
  );
}

/** A ring with a dot; spinning, it is the loader. */
export function RingMark({ className = "", spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g style={spinning ? { transformOrigin: "12px 12px", animation: "spin-slow 1.1s linear infinite" } : undefined}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="42 15" />
      </g>
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}
