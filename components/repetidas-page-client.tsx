"use client";

import { useMemo, useState } from "react";
import { CollectionList } from "@/components/collection-list";
import { CollectionToolbar } from "@/components/collection-toolbar";
import { spareCount } from "@/lib/spares";
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

export function RepetidasPageClient({ stickers, ownedRows, userId }: Props) {
  const { owned, getQty, toggleLocal, setQuantityLocal, qtyBySticker } =
    useOwnedQuantities(ownedRows);

  const [team, setTeam] = useState("__all__");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  const withDuplicates = useMemo(
    () => stickers.filter((s) => (qtyBySticker.get(s.id) ?? 0) > 1),
    [stickers, qtyBySticker],
  );

  const { teams, filtered } = useStickerFilter(
    withDuplicates,
    owned,
    team,
    search,
    tab,
  );

  const { duplicateTypes, extraCopies } = useMemo(() => {
    let extra = 0;
    let types = 0;
    qtyBySticker.forEach((q) => {
      extra += spareCount(q);
      if (q > 1) types += 1;
    });
    return { duplicateTypes: types, extraCopies: extra };
  }, [qtyBySticker]);

  return (
    <>
      <header className="flex flex-col gap-2.5 border-b border-border/60 px-4 pb-3 pt-3">
        <div className="min-w-0 max-w-xl space-y-1.5">
          <h1 className="text-[1.05rem] font-semibold tracking-tight">
            Repetidas
          </h1>
          <p className="text-[0.72rem] leading-relaxed text-muted-foreground">
            Figurinhas com mais de um exemplar: uma conta para o álbum, o resto
            como repetidas para trocar.
          </p>
          <div className="flex flex-wrap gap-2 text-[0.7rem]">
            <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1">
              <span className="font-semibold text-foreground">
                {duplicateTypes}
              </span>{" "}
              tipos com repetida
            </span>
            <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-amber-950 dark:text-amber-100">
              <span className="font-semibold">{extraCopies}</span> cópias
              extras no total
            </span>
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
        />
      </header>
      <main className="px-4 pb-28 pt-1">
        {withDuplicates.length === 0 ? (
          <p className="py-12 text-center text-[0.8rem] leading-relaxed text-muted-foreground">
            Nenhuma repetida registada. Na lista ou no álbum, use{" "}
            <strong className="font-medium text-foreground">+</strong> para
            marcar mais exemplares da mesma figurinha.
          </p>
        ) : (
          <CollectionList
            stickers={filtered}
            owned={owned}
            getQty={getQty}
            userId={userId}
            onToggleLocal={toggleLocal}
            onQuantityLocal={setQuantityLocal}
          />
        )}
      </main>
    </>
  );
}
