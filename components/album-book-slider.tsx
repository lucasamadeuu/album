"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlbumGrid } from "@/components/album-grid";
import { cn } from "@/lib/utils";
import { stickersHaveCount } from "@/lib/team-progress";
import type { StickerRow } from "@/lib/types";

type BookPage = { team: string; stickers: StickerRow[] };

type Props = {
  pages: BookPage[];
  owned: Set<string>;
  getQty: (stickerId: string) => number;
  userId: string;
  onToggleLocal: (stickerId: string, nextOwned: boolean) => void;
  onQuantityLocal: (stickerId: string, qty: number) => void;
};

export function AlbumBookSlider({
  pages,
  owned,
  getQty,
  userId,
  onToggleLocal,
  onQuantityLocal,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [pageIdx, setPageIdx] = useState(0);

  const clampIdx = useCallback(
    (i: number) => Math.max(0, Math.min(i, Math.max(0, pages.length - 1))),
    [pages.length],
  );

  const syncIdxFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || pages.length === 0) return;
    const w = el.clientWidth || 1;
    const i = clampIdx(Math.round(el.scrollLeft / w));
    setPageIdx(i);
  }, [clampIdx, pages.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncIdxFromScroll();
    el.addEventListener("scroll", syncIdxFromScroll, { passive: true });
    return () => el.removeEventListener("scroll", syncIdxFromScroll);
  }, [syncIdxFromScroll, pages.length]);

  useEffect(() => {
    setPageIdx((i) => clampIdx(i));
  }, [clampIdx, pages.length]);

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollTo({ left: clampIdx(i) * w, behavior: "smooth" });
  };

  if (pages.length === 0) {
    return (
      <p className="py-12 text-center text-[0.8rem] text-muted-foreground">
        Nada neste filtro. Ajuste a pesquisa ou o separador Todas / Tenho / Faltam.
      </p>
    );
  }

  const current = pages[pageIdx];
  const pageHave = current ? stickersHaveCount(current.stickers, owned) : 0;
  const pageTotal = current?.stickers.length ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="sticky top-0 z-10 -mx-1 rounded-lg border border-border/50 bg-background/90 px-2 py-1.5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[0.78rem] font-semibold text-foreground">
            {current?.team ?? "—"}
            {pageTotal > 0 ? (
              <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{pageHave}</span>
                <span className="text-muted-foreground/80"> de </span>
                {pageTotal}
              </span>
            ) : null}
          </p>
          <p className="shrink-0 text-[0.65rem] tabular-nums text-muted-foreground">
            {pageIdx + 1} / {pages.length}
          </p>
        </div>
        <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pages.map((p, i) => (
            <button
              key={p.team}
              type="button"
              onClick={() => goTo(i)}
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-medium transition-colors",
                i === pageIdx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted",
              )}
            >
              {p.team.length > 14 ? `${p.team.slice(0, 12)}…` : p.team}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto scroll-smooth",
          "[-webkit-overflow-scrolling:touch]",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]",
          "overscroll-x-contain",
        )}
      >
        {pages.map((p, i) => (
          <div
            key={p.team}
            className="w-full min-w-full shrink-0 snap-start snap-always px-0.5"
            data-book-page-index={i}
          >
            <AlbumGrid
              stickers={p.stickers}
              owned={owned}
              getQty={getQty}
              userId={userId}
              onToggleLocal={onToggleLocal}
              onQuantityLocal={onQuantityLocal}
            />
          </div>
        ))}
      </div>

      <p className="text-center text-[0.62rem] text-muted-foreground">
        Desliza <strong className="font-medium text-foreground">para os lados</strong> para mudar
        de seleção; <strong className="font-medium text-foreground">para cima/baixo</strong> para
        ver a grelha.
      </p>
    </div>
  );
}
