"use client";

import { useMemo, useState } from "react";
import type { StickerRow } from "@/lib/types";

export type FilterTab = "all" | "have" | "missing";

export type OwnedRow = { sticker_id: string; quantity: number };

export function useStickerFilter(
  stickers: StickerRow[],
  owned: Set<string>,
  team: string,
  search: string,
  tab: FilterTab,
) {
  const teams = useMemo(() => {
    const s = new Set(stickers.map((x) => x.team_name));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [stickers]);

  const filtered = useMemo(() => {
    let rows = stickers;
    if (team && team !== "__all__") {
      rows = rows.filter((x) => x.team_name === team);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((x) => {
        if (x.player_name.toLowerCase().includes(q)) return true;
        if (x.team_name.toLowerCase().includes(q)) return true;
        if (x.album_number != null && String(x.album_number).includes(q)) {
          return true;
        }
        const code = x.album_code?.trim().toLowerCase() ?? "";
        if (code && code.includes(q.replace(/^#/, ""))) return true;
        return false;
      });
    }
    if (tab === "have") rows = rows.filter((x) => owned.has(x.id));
    if (tab === "missing") rows = rows.filter((x) => !owned.has(x.id));
    return rows;
  }, [stickers, team, search, tab, owned]);

  return { teams, filtered };
}

/** Quantidade total por figurinha (≥1 quando consta na coleção). */
export function useOwnedQuantities(initial: OwnedRow[]) {
  const [qtyBySticker, setQtyBySticker] = useState(() => {
    const m = new Map<string, number>();
    for (const r of initial) {
      m.set(r.sticker_id, Math.max(1, r.quantity));
    }
    return m;
  });

  const owned = useMemo(() => new Set(qtyBySticker.keys()), [qtyBySticker]);

  const getQty = (id: string) => qtyBySticker.get(id) ?? 0;

  const toggleLocal = (stickerId: string, nextOwned: boolean) => {
    setQtyBySticker((prev) => {
      const n = new Map(prev);
      if (nextOwned) n.set(stickerId, 1);
      else n.delete(stickerId);
      return n;
    });
  };

  const setQuantityLocal = (stickerId: string, qty: number) => {
    setQtyBySticker((prev) => {
      const n = new Map(prev);
      if (qty < 1) n.delete(stickerId);
      else n.set(stickerId, qty);
      return n;
    });
  };

  return { owned, getQty, toggleLocal, setQuantityLocal, qtyBySticker };
}
