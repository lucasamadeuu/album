"use client";

import { useState } from "react";
import { AlbumBookSlider } from "@/components/album-book-slider";
import { AlbumGrid } from "@/components/album-grid";
import { CollectionToolbar } from "@/components/collection-toolbar";
import { pagesForAlbumBook } from "@/lib/album-book-order";
import type { StickerRow } from "@/lib/types";
import {
  type FilterTab,
  type OwnedRow,
  useOwnedQuantities,
  useStickerFilter,
} from "@/lib/use-sticker-filter";

type Props = {
  stickers: StickerRow[];
  ownedRows: OwnedRow[];
  userId: string;
};

export function AlbumPageClient({ stickers, ownedRows, userId }: Props) {
  const { owned, getQty, toggleLocal, setQuantityLocal } =
    useOwnedQuantities(ownedRows);
  const [team, setTeam] = useState("__all__");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  const { teams, filtered } = useStickerFilter(
    stickers,
    owned,
    team,
    search,
    tab,
  );

  const bookPages = pagesForAlbumBook(filtered);

  return (
    <>
      <header className="border-b border-border/60 px-4 pb-3 pt-3">
        <div className="max-w-xl">
          <h1 className="text-[1.02rem] font-semibold tracking-tight text-foreground">
            Páginas do álbum
          </h1>
          <p className="mt-1 text-[0.65rem] leading-snug text-muted-foreground">
            Com <strong className="font-medium text-foreground">Todas as seleções</strong>, desliza
            o dedo para virar página (ordem do livro). Escolhe um time no filtro para ver só essa
            grelha.
          </p>
        </div>
        <div className="mt-3">
          <CollectionToolbar
            teams={teams}
            team={team}
            onTeam={setTeam}
            search={search}
            onSearch={setSearch}
            tab={tab}
            onTab={setTab}
            totalListed={filtered.length}
            totalOwned={owned.size}
            totalStickers={stickers.length}
          />
        </div>
      </header>
      <main className="px-3 pb-28 pt-4 sm:px-4">
        <div className="mx-auto max-w-xl rounded-xl border border-border/40 bg-gradient-to-b from-card/80 to-muted/15 p-3 shadow-sm sm:p-4">
          {team === "__all__" ? (
            <AlbumBookSlider
              pages={bookPages}
              owned={owned}
              getQty={getQty}
              userId={userId}
              onToggleLocal={toggleLocal}
              onQuantityLocal={setQuantityLocal}
            />
          ) : (
            <AlbumGrid
              stickers={filtered}
              owned={owned}
              getQty={getQty}
              userId={userId}
              onToggleLocal={toggleLocal}
              onQuantityLocal={setQuantityLocal}
            />
          )}
        </div>
      </main>
    </>
  );
}
