/** Cópias além da primeira (para colar no álbum). */
export function spareCount(totalQuantity: number): number {
  return Math.max(0, totalQuantity - 1);
}
