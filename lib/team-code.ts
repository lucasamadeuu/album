import type { StickerRow } from "@/lib/types";

/** Código da figurinha no álbum (ex.: BRA3, FWC1) ou #ordem. */
export function stickerSlotLabel(
  row: Pick<StickerRow, "album_code" | "album_number">,
): string {
  const c = row.album_code?.trim();
  if (c) return c.toUpperCase();
  if (row.album_number != null) return `#${row.album_number}`;
  return "—";
}

/** Selo tipo “BRA”: prefixo alfabético do album_code, senão deriva do país. */
export function teamAbbrevFromSticker(row: Pick<StickerRow, "album_code" | "team_name">): string {
  const c = row.album_code?.trim();
  if (c) {
    const m = c.match(/^([A-Za-z]+)/);
    if (m && m[1].length >= 1) return m[1].toUpperCase();
  }
  return teamCodeFromName(row.team_name);
}

/** Abreviação curta para exibir no slot (não é código FIFA oficial). */
export function teamCodeFromName(teamName: string): string {
  const t = teamName.trim();
  if (!t) return "—";
  if (t === "Copa 2026") return "C26";
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const w = words[0].replace(/[^a-zA-ZÀ-ÿ]/g, "");
    if (w.length <= 4) return w.toUpperCase();
    return w.slice(0, 3).toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((w) => w.replace(/[^a-zA-ZÀ-ÿ]/g, "")[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 4);
}
