import type { StickerRow } from "@/lib/types";

export type CatalogRow = Pick<
  StickerRow,
  "id" | "album_number" | "album_code" | "player_name" | "team_name"
>;

export type ScanMatch = {
  stickerId: string;
  albumNumber: number | null;
  albumCode: string | null;
  playerName: string;
  teamName: string;
};

export type ScanUnknown = {
  description: string;
  albumNumberGuess: number | null;
};

export type GeminiScanRaw = {
  coladas?: Array<{
    album_number?: number | null;
    album_code?: string | null;
  }>;
  duvidas?: Array<{
    descricao?: string;
    album_number_talvez?: number | null;
  }>;
};

export function buildCatalogForPrompt(rows: CatalogRow[]): string {
  /** Só n/c para reduzir tokens (quota free tier) — nomes vêm da BD no mapeamento. */
  const mini = rows
    .filter((r) => r.album_number != null)
    .sort((a, b) => (a.album_number ?? 0) - (b.album_number ?? 0))
    .map((r) => ({
      n: r.album_number,
      c: r.album_code?.trim().toUpperCase() || null,
    }));
  return JSON.stringify(mini);
}

export function buildScanUserPrompt(imageCount: number, catalogJson: string): string {
  return [
    `Analise ${imageCount} foto(s) de páginas de um álbum de figurinhas da Copa (álbum oficial panini).`,
    "",
    "CATÁLOGO (n=número no álbum, c=código no verso se existir; lista compacta):",
    catalogJson,
    "",
    "Instruções:",
    "- Identifique só figurinhas que estão CLARAMENTE COLADAS no álbum (encaixadas no suporte branco), não pacotes nem cromos soltos sobre a página.",
    "- Cada slot preenchido no álbum corresponde a um item do catálogo: use o número visível na página ou o código/cróquio o mais fiel possível.",
    "- Se não tiver certeza absoluta, NÃO inclua em coladas; use duvidas.",
    "- Não invente números: album_number e album_code devem existir no catálogo acima quando possível.",
    "",
    "Responda em JSON com o formato exigido pelo schema (apenas JSON).",
  ].join("\n");
}

export function parseGeminiScanJson(text: string): GeminiScanRaw {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned) as GeminiScanRaw;
  return parsed;
}

export function indexesFromCatalog(rows: CatalogRow[]) {
  const byNumber = new Map<number, CatalogRow>();
  const byCode = new Map<string, CatalogRow>();
  for (const r of rows) {
    if (r.album_number != null) {
      byNumber.set(r.album_number, r);
    }
    const c = r.album_code?.trim().toUpperCase();
    if (c) byCode.set(c, r);
  }
  return { byNumber, byCode };
}

export function resolveScanPayload(
  raw: GeminiScanRaw,
  rows: CatalogRow[],
): { matched: ScanMatch[]; unknownFromModel: ScanUnknown[] } {
  const { byNumber, byCode } = indexesFromCatalog(rows);
  const matchedIds = new Set<string>();
  const matched: ScanMatch[] = [];
  const unknownFromModel: ScanUnknown[] = [];

  for (const item of raw.coladas ?? []) {
    const n =
      typeof item.album_number === "number" && Number.isFinite(item.album_number)
        ? Math.trunc(item.album_number)
        : null;
    const code =
      typeof item.album_code === "string" && item.album_code.trim().length > 0
        ? item.album_code.trim().toUpperCase()
        : null;

    let row: CatalogRow | undefined;
    if (n != null) row = byNumber.get(n);
    if (!row && code) row = byCode.get(code);
    if (!row && n != null && code) {
      const rN = byNumber.get(n);
      const rC = byCode.get(code);
      if (rN && rC && rN.id === rC.id) row = rN;
      else if (rN) row = rN;
      else if (rC) row = rC;
    }

    if (row && !matchedIds.has(row.id)) {
      matchedIds.add(row.id);
      matched.push({
        stickerId: row.id,
        albumNumber: row.album_number,
        albumCode: row.album_code,
        playerName: row.player_name,
        teamName: row.team_name,
      });
    } else if (!row) {
      unknownFromModel.push({
        description:
          n != null || code
            ? `Não encontrado no catálogo: n=${n ?? "?"}, código=${code ?? "—"}.`
            : "Entrada sem número nem código.",
        albumNumberGuess: n,
      });
    }
  }

  for (const d of raw.duvidas ?? []) {
    const desc = typeof d.descricao === "string" ? d.descricao.trim() : "";
    if (!desc) continue;
    const g =
      typeof d.album_number_talvez === "number" && Number.isFinite(d.album_number_talvez)
        ? Math.trunc(d.album_number_talvez)
        : null;
    unknownFromModel.push({
      description: desc,
      albumNumberGuess: g,
    });
  }

  return { matched, unknownFromModel };
}
