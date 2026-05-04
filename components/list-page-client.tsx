"use client";

import { useMemo, useState } from "react";
import { CollectionToolbar } from "@/components/collection-toolbar";
import { CollectionList } from "@/components/collection-list";
import type { StickerRow } from "@/lib/types";
import { teamProgressBySelection } from "@/lib/team-progress";
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

export function ListPageClient({ stickers, ownedRows, userId }: Props) {
  const { owned, getQty, toggleLocal, setQuantityLocal } =
    useOwnedQuantities(ownedRows);
  const [team, setTeam] = useState("__all__");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("missing");

  const { teams, filtered } = useStickerFilter(
    stickers,
    owned,
    team,
    search,
    tab,
  );

  const hasAlbumNumbers = stickers.some(
    (s) => s.album_number != null || (s.album_code?.trim() ?? "").length > 0,
  );

  const teamProgress = useMemo(
    () => teamProgressBySelection(stickers, owned),
    [stickers, owned],
  );

  return (
    <>
      <header className="flex flex-col gap-2.5 border-b border-border/60 px-4 pb-3 pt-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-xl">
            <h1 className="text-[1.05rem] font-semibold tracking-tight">
              Checklist
            </h1>
          </div>
        </div>
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
          teamProgress={teamProgress}
        />
      </header>
      <main className="px-4 pb-28 pt-1">
        {stickers.length === 0 ? (
          <p className="py-10 text-center text-[0.8rem] leading-relaxed text-muted-foreground">
            Catálogo vazio. Importe{" "}
            <strong className="font-medium text-foreground">data/wc2026-album.csv</strong>{" "}
            pelo botão CSV, ou rode <code className="text-[0.7rem]">npm run album:csv</code>.
          </p>
        ) : !hasAlbumNumbers ? (
          <p className="mb-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[0.72rem] leading-relaxed text-foreground">
            Sem números de álbum nas figurinhas. Rode o SQL de migração e reimporte o CSV.
          </p>
        ) : null}
        {stickers.length > 0 ? (
          <CollectionList
            stickers={filtered}
            owned={owned}
            getQty={getQty}
            userId={userId}
            onToggleLocal={toggleLocal}
            onQuantityLocal={setQuantityLocal}
          />
        ) : null}
      </main>
    </>
  );
}
