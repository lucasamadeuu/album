import { spareCount } from "@/lib/spares";

export type OwnedQty = { sticker_id: string; quantity: number };

export function spareTotalsBySticker(rows: OwnedQty[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const extra = spareCount(r.quantity);
    if (extra > 0) m.set(r.sticker_id, extra);
  }
  return m;
}

export function spareCollectionStats(rows: OwnedQty[]): {
  extraCopies: number;
  typesWithSpare: number;
} {
  let extraCopies = 0;
  let typesWithSpare = 0;
  for (const r of rows) {
    const e = spareCount(r.quantity);
    extraCopies += e;
    if (e > 0) typesWithSpare += 1;
  }
  return { extraCopies, typesWithSpare };
}

/**
 * Trocas potenciais (presencial):
 * - iOffer: tenho repetidas e o amigo não tem no álbum.
 * - iReceive: o amigo tem repetidas e eu não tenho no álbum.
 */
export function mutualTradeStickerIds(
  myOwned: OwnedQty[],
  theirOwned: OwnedQty[],
): { iOffer: string[]; iReceive: string[] } {
  const myHave = new Set(myOwned.map((r) => r.sticker_id));
  const theirHave = new Set(theirOwned.map((r) => r.sticker_id));
  const mySpare = spareTotalsBySticker(myOwned);
  const theirSpare = spareTotalsBySticker(theirOwned);

  const iOffer: string[] = [];
  mySpare.forEach((_qty, sid) => {
    if (!theirHave.has(sid)) iOffer.push(sid);
  });

  const iReceive: string[] = [];
  theirSpare.forEach((_qty, sid) => {
    if (!myHave.has(sid)) iReceive.push(sid);
  });

  return { iOffer, iReceive };
}
