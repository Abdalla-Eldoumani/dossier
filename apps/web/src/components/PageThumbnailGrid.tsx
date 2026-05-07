"use client";

// Virtualised grid of page thumbnails. Operation views (reorder, delete, rotate, crop)
// share this component so the heavy lifting — layout, scroll-windowing, lazy thumbnail
// loading — lives in one place.
//
// Rendering strategy: every page reserves a fixed-size slot in a tall absolutely-positioned
// container, but only the rows currently in (or near) the viewport are committed to the DOM.
// At 1000+ pages the unrendered rows cost nothing — there is no item there at all, only
// the parent's height reservation. Thumbnail bytes are produced on demand via the caller's
// `renderThumbnail` callback (which routes through `usePdfWorker` so pdfjs-dist runs off-thread).

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const ITEM_WIDTH = 160;
const ITEM_HEIGHT = 220;
const GAP = 16;
const ROW_HEIGHT = ITEM_HEIGHT + GAP;
const BUFFER_ROWS = 2;

export interface PageThumbnailGridProps {
  pageCount: number;
  /** Produces a thumbnail URL (data: or blob:) for the given page index. */
  renderThumbnail: (pageIndex: number) => Promise<string>;
  /** Set of selected page indices. Pass undefined to disable selection. */
  selected?: ReadonlySet<number>;
  /** Called when a page is clicked. Only fired when selection is enabled. */
  onToggle?: (pageIndex: number) => void;
  className?: string;
}

export function PageThumbnailGrid({
  pageCount,
  renderThumbnail,
  selected,
  onToggle,
  className,
}: PageThumbnailGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setContainerWidth(el.clientWidth);
      setViewportHeight(el.clientHeight);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colsPerRow = useMemo(() => {
    if (containerWidth === 0) return 1;
    return Math.max(1, Math.floor((containerWidth + GAP) / (ITEM_WIDTH + GAP)));
  }, [containerWidth]);

  const totalRows = Math.ceil(pageCount / colsPerRow);
  const totalHeight = totalRows * ROW_HEIGHT;

  const { startIndex, endIndex } = useMemo(() => {
    if (viewportHeight === 0) {
      return { startIndex: 0, endIndex: Math.min(pageCount, colsPerRow * 4) };
    }
    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const endRow = Math.min(
      totalRows,
      Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER_ROWS,
    );
    return {
      startIndex: startRow * colsPerRow,
      endIndex: Math.min(pageCount, endRow * colsPerRow),
    };
  }, [scrollTop, viewportHeight, totalRows, pageCount, colsPerRow]);

  const visibleCount = Math.max(0, endIndex - startIndex);

  return (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      className={cn("relative overflow-y-auto", className)}
    >
      <div style={{ position: "relative", height: totalHeight }}>
        {Array.from({ length: visibleCount }, (_, i) => {
          const pageIndex = startIndex + i;
          const row = Math.floor(pageIndex / colsPerRow);
          const col = pageIndex % colsPerRow;
          return (
            <PageItem
              key={pageIndex}
              pageIndex={pageIndex}
              top={row * ROW_HEIGHT}
              left={col * (ITEM_WIDTH + GAP)}
              renderThumbnail={renderThumbnail}
              isSelected={selected?.has(pageIndex) ?? false}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </div>
  );
}

interface PageItemProps {
  pageIndex: number;
  top: number;
  left: number;
  renderThumbnail: (pageIndex: number) => Promise<string>;
  isSelected: boolean;
  onToggle?: (pageIndex: number) => void;
}

function PageItem({
  pageIndex,
  top,
  left,
  renderThumbnail,
  isSelected,
  onToggle,
}: PageItemProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    renderThumbnail(pageIndex)
      .then((url) => {
        if (!cancelled) setThumbUrl(url);
      })
      .catch(() => {
        // Per-thumbnail errors are silenced. Operation views surface them globally
        // through the toast pipeline if the underlying render call rejects.
      });
    return () => {
      cancelled = true;
    };
  }, [pageIndex, renderThumbnail]);

  const interactive = onToggle !== undefined;
  const containerClass = cn(
    "rounded-[var(--radius-sm)] border overflow-hidden",
    "transition-colors duration-150 ease-[cubic-bezier(0.32,0.72,0,1)]",
    isSelected
      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
      : "border-[var(--color-rule)] bg-[var(--color-paper-2)]",
  );
  const inner = (
    <>
      {thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl}
          alt={`Page ${pageIndex + 1}`}
          className="flex-1 min-h-0 w-full object-contain"
        />
      ) : (
        <div className="flex-1 animate-pulse bg-[var(--color-paper-3)]" />
      )}
      <span
        className="px-2 py-1 text-[12px] text-[var(--color-ink-2)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        Page {pageIndex + 1}
      </span>
    </>
  );

  const style = {
    position: "absolute" as const,
    top,
    left,
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
  };

  if (interactive) {
    return (
      <button
        type="button"
        style={style}
        className={cn(containerClass, "flex flex-col text-left")}
        aria-pressed={isSelected}
        aria-label={`Page ${pageIndex + 1}`}
        onClick={() => onToggle?.(pageIndex)}
      >
        {inner}
      </button>
    );
  }

  return (
    <div style={style} className={cn(containerClass, "flex flex-col")}>
      {inner}
    </div>
  );
}
