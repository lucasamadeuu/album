import type { StickerRow } from "@/lib/types";

export type TeamProgress = { team: string; have: number; total: number };

/** Quantas figurinhas (slots) você tem vs total do catálogo, por seleção (= team_name). */
export function teamProgressBySelection(
  stickers: StickerRow[],
  owned: Set<string>,
): TeamProgress[] {
  const m = new Map<string, { total: number; have: number }>();
  for (const s of stickers) {
    let row = m.get(s.team_name);
    if (!row) {
      row = { total: 0, have: 0 };
      m.set(s.team_name, row);
    }
    row.total += 1;
    if (owned.has(s.id)) row.have += 1;
  }
  return Array.from(m.entries())
    .map(([team, { have, total }]) => ({ team, have, total }))
    .sort((a, b) => a.team.localeCompare(b.team, "pt-BR"));
}

export function stickersHaveCount(rows: StickerRow[], owned: Set<string>): number {
  let n = 0;
  for (const s of rows) {
    if (owned.has(s.id)) n += 1;
  }
  return n;
}
