import type { StickerRow } from "@/lib/types";

const NO_NUMBER_SORT = 1_000_000;

/** Ordem do álbum: número oficial, depois time e título. */
export function sortStickersForAlbum(rows: StickerRow[]): StickerRow[] {
  return [...rows].sort((a, b) => {
    const an = a.album_number ?? NO_NUMBER_SORT;
    const bn = b.album_number ?? NO_NUMBER_SORT;
    if (an !== bn) return an - bn;
    const t = a.team_name.localeCompare(b.team_name, "pt-BR");
    if (t !== 0) return t;
    return a.player_name.localeCompare(b.player_name, "pt-BR");
  });
}
