"use client";

import { useState } from "react";
import { AlbumGrid } from "@/components/album-grid";
import { CollectionToolbar } from "@/components/collection-toolbar";
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

  return (
    <>
      <header className="border-b border-border/60 px-4 pb-3 pt-3">
        <div className="max-w-xl">
          <h1 className="text-[1.02rem] font-semibold tracking-tight text-foreground">
            Páginas do álbum
          </h1>
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
          <AlbumGrid
            stickers={filtered}
            owned={owned}
            getQty={getQty}
            userId={userId}
            onToggleLocal={toggleLocal}
            onQuantityLocal={setQuantityLocal}
          />
        </div>
      </main>
    </>
  );
}
