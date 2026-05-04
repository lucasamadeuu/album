import type { StickerRow } from "@/lib/types";

/**
 * Ordem aproximada das páginas do álbum físico Road to FIFA World Cup 2026
 * (alinhada a `data/wc2026-album.csv` → coluna team_name).
 * Equipas fora da lista aparecem no fim, por nome.
 */
export const ALBUM_BOOK_TEAM_ORDER: string[] = [
  "Copa 2026",
  "FIFA Museum",
  "Host Countries & Cities",
  "Mexico",
  "South Africa",
  "South Korea",
  "Czechia",
  "Canada",
  "Bosnia and Herzegovina",
  "Qatar",
  "Switzerland",
  "Brazil",
  "Morocco",
  "Haiti",
  "Scotland",
  "USA",
  "Paraguay",
  "Australia",
  "Türkiye",
  "Germany",
  "Curaçao",
  "Ivory Coast",
  "Ecuador",
  "Netherlands",
  "Japan",
  "Sweden",
  "Tunisia",
  "Belgium",
  "Egypt",
  "Iran",
  "New Zealand",
  "Spain",
  "Cape Verde",
  "Saudi Arabia",
  "Uruguay",
  "France",
  "Senegal",
  "Iraq",
  "Norway",
  "Argentina",
  "Algeria",
  "Austria",
  "Jordan",
  "Portugal",
  "Congo DR",
  "Uzbekistan",
  "Colombia",
  "England",
  "Croatia",
  "Ghana",
  "Panama",
];

export function pagesForAlbumBook(rows: StickerRow[]): {
  team: string;
  stickers: StickerRow[];
}[] {
  const byTeam = new Map<string, StickerRow[]>();
  for (const r of rows) {
    const list = byTeam.get(r.team_name) ?? [];
    list.push(r);
    byTeam.set(r.team_name, list);
  }
  byTeam.forEach((list) => {
    list.sort(
      (a, b) =>
        (a.album_number ?? 999999) - (b.album_number ?? 999999) ||
        a.player_name.localeCompare(b.player_name, "pt-BR"),
    );
  });

  const pages: { team: string; stickers: StickerRow[] }[] = [];
  const used = new Set<string>();

  for (const team of ALBUM_BOOK_TEAM_ORDER) {
    const stickers = byTeam.get(team);
    if (stickers?.length) {
      pages.push({ team, stickers });
      used.add(team);
    }
  }

  const rest = Array.from(byTeam.keys())
    .filter((t) => !used.has(t))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  for (const team of rest) {
    const stickers = byTeam.get(team);
    if (stickers?.length) pages.push({ team, stickers });
  }

  return pages;
}
