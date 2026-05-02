export const STICKER_KINDS = [
  "player",
  "crest",
  "team",
  "special",
  "mascot",
  "other",
] as const;

export type StickerKind = (typeof STICKER_KINDS)[number];

const LABELS: Record<StickerKind, string> = {
  player: "Jogador",
  crest: "Brasão",
  team: "Página do time",
  special: "Especial",
  mascot: "Mascote",
  other: "Outro",
};

export function stickerKindLabel(kind: string | null | undefined): string {
  if (kind && kind in LABELS) return LABELS[kind as StickerKind];
  return LABELS.player;
}

export function normalizeStickerKind(raw: string): StickerKind | null {
  const k = raw.trim().toLowerCase();
  if ((STICKER_KINDS as readonly string[]).includes(k)) return k as StickerKind;
  return null;
}
