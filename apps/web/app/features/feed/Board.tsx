// A list of reports as a board of uneven cards (layout.ts decides kinds, sizes and places). The card is a link
// as a whole, so addresses in its text read short as plain words.
import { memo, useMemo, type CSSProperties } from "react";
import type { FeedItemSummary, GroupInfo, TimelineFilters } from "@aihot/contracts/site";
import { categoryLabel } from "@aihot/contracts/taxonomy";
import { shortAddresses } from "@aihot/contracts/addresses";
import { IntentLink } from "../../components/ui/IntentLink";
import { Picture } from "../../components/ui/Picture";
import { SourceAvatar } from "../../components/ui/SourceAvatar";
import { sourceIcon } from "@aihot/site/brand/source-icons.ts";
import { Link } from "../../lib/link";
import { cardSource, cardTime } from "../../lib/format";
import { useLocale, useT } from "../../lib/i18n";
import { rememberPreview } from "../item/preview";
import { coverOf, isPost, layoutBoard, type BoardCard } from "./layout";
import { GroupButton } from "./ReadingGroup";
import { StarButton, readTone } from "./parts";

export interface BoardEntry {
  key: string;
  item: FeedItemSummary;
  group: GroupInfo | null;
}

/** `pages` are the list's parts as they were loaded; `complete` once there are no more. */
export function Board({ pages, complete = true, filters, isRead, onOpen, fresh }: {
  pages: BoardEntry[][];
  complete?: boolean;
  filters?: TimelineFilters;
  isRead: (entry: BoardEntry) => boolean;
  onOpen: (id: string) => void;
  /** Cards that have just been loaded come in softly. */
  fresh?: ReadonlySet<string>;
}) {
  const cards = useMemo(() => layoutBoard(pages.map((p) => p.map((e) => e.item)), complete), [pages, complete]);
  return (
    <ol className="board">
      {pages.flat().map((entry, i) => {
        const card = cards[i]!;
        const place = {
          "--in-2": card.areas[2], "--in-3": card.areas[3], "--in-4": card.areas[4],
          "--lines": card.lines[1], "--lines-2": card.lines[2], "--lines-3": card.lines[3], "--lines-4": card.lines[4],
        } as CSSProperties;
        return (
          <li key={entry.key} data-card-key={entry.key} style={place} className={fresh?.has(entry.key) ? "animate-fade-up" : undefined}>
            <Card entry={entry} kind={card.kind} filters={filters} read={isRead(entry)} onOpen={onOpen} />
          </li>
        );
      })}
    </ol>
  );
}

const Card = memo(function Card({ entry: { item, group }, kind, filters, read, onOpen }: {
  entry: BoardEntry;
  kind: BoardCard["kind"];
  filters?: TimelineFilters;
  read: boolean;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const post = isPost(item);
  const cover = coverOf(item);
  const wide = kind === "feature" || kind === "over" || kind === "lead";
  const open = () => {
    rememberPreview(item);
    onOpen(item.id);
  };
  const summary = item.summary ? shortAddresses(item.summary) : "";
  const link = (text: string) => (
    <IntentLink viewTransition to={`/items/${item.id}`} onClick={open} className="after:absolute after:inset-0 after:content-['']">
      {text}
    </IntentLink>
  );
  const author = item.channel === "x" ? item.x : null;
  const source = cardSource(item.source);
  const name = author?.authorName ?? source.name;
  const tone = kind === "over" ? "" : readTone(read, "text-ink");
  const time = cardTime(item, Date.now(), locale);
  const picture = cover && (kind === "picture" || kind === "feature" || kind === "over") && (
    <span className="board-picture">
      <Picture
        src={(wide && cover.fullUrl) || cover.poster || cover.url}
        srcSet={wide && cover.fullUrl ? undefined : cover.srcSet}
        sizes={wide ? "(min-width: 700px) 584px, 100vw" : "(min-width: 700px) 252px, 92vw"}
        alt={cover.alt ?? ""}
        loading="lazy"
        decoding="async"
      />
    </span>
  );
  return (
    <article data-item-id={item.id} className={`board-card is-${kind} ${wide ? "board-wide" : ""}`}>
      {wide && picture}
      <header className="board-source">
        <SourceAvatar id={source.id} name={name} avatarUrl={author?.avatarUrl} avatarSrcSet={author?.avatarSrcSet} iconUrl={sourceIcon(source.id) ?? source.iconUrl} iconSrcSet={sourceIcon(source.id) ? undefined : source.iconSrcSet} size={wide ? 20 : 28} />
        <span className="min-w-0 truncate">{name}</span>
        <StarButton item={item} className="board-star size-7" />
      </header>
      {wide ? (
        <>
          <h3 className={`board-title ${tone}`}>{link(item.title)}</h3>
          {summary && <p className="board-summary">{summary}</p>}
        </>
      ) : post ? (
        <p className={`board-text whitespace-pre-line ${tone}`}>{link(summary || item.title)}</p>
      ) : (
        <div className={`board-text ${tone}`}>
          <h3 className="font-semibold">{link(item.title)}</h3>
          {summary && <p>{summary}</p>}
        </div>
      )}
      {!wide && picture}
      {kind === "quote" && item.x?.quoted && (
        <div className="board-quote">
          <span className="block truncate font-semibold">{item.x.quoted.authorName || `@${item.x.quoted.handle}`}</span>
          <span className="line-clamp-3">{shortAddresses(item.x.quoted.translation ?? item.x.quoted.text)}</span>
        </div>
      )}
      <footer className="board-foot">
        {item.sameEvent && (
          <span className="block truncate">
            {t("同一件事，精選收錄的是", "Same story in Top Picks: ")}
            <Link viewTransition to={`/items/${item.sameEvent.id}`} className="relative z-10 hover:underline">
              {t(`《${item.sameEvent.title}》`, `“${item.sameEvent.title}”`)}
            </Link>
          </span>
        )}
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate">
            {group && (group.additionalSourceCount > 0 || group.reportCount > 1) ? <GroupButton compact group={group} filters={filters} parentId={item.id} /> : wide && item.category ? categoryLabel(item.category, locale) : null}
          </span>
          <time dateTime={time.dateTime} suppressHydrationWarning className="shrink-0">{time.text}</time>
        </span>
      </footer>
    </article>
  );
});
