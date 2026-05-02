"use client";

import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StickerRow } from "@/lib/types";
import { spareCount } from "@/lib/spares";
import { stickerKindLabel } from "@/lib/sticker-kind";
import { stickerSlotLabel } from "@/lib/team-code";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, CircleOff, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

type Props = {
  stickers: StickerRow[];
  owned: Set<string>;
  getQty: (stickerId: string) => number;
  userId: string;
  onToggleLocal: (stickerId: string, nextOwned: boolean) => void;
  onQuantityLocal: (stickerId: string, qty: number) => void;
};

export function CollectionList({
  stickers,
  owned,
  getQty,
  userId,
  onToggleLocal,
  onQuantityLocal,
}: Props) {
  const busy = useRef(false);

  const toggle = async (row: StickerRow) => {
    if (busy.current) return;
    busy.current = true;
    const next = !owned.has(row.id);
    const supabase = createClient();
    try {
      if (next) {
        const { error } = await supabase.from("user_owned_stickers").insert({
          user_id: userId,
          sticker_id: row.id,
          quantity: 1,
        });
        if (error) throw error;
        onToggleLocal(row.id, true);
      } else {
        const { error } = await supabase
          .from("user_owned_stickers")
          .delete()
          .eq("user_id", userId)
          .eq("sticker_id", row.id);
        if (error) throw error;
        onToggleLocal(row.id, false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      busy.current = false;
    }
  };

  const changeQty = async (row: StickerRow, delta: number) => {
    if (busy.current) return;
    const q = getQty(row.id);
    if (delta > 0 && !owned.has(row.id)) return;
    busy.current = true;
    const supabase = createClient();
    try {
      if (delta < 0 && q <= 1) {
        const { error } = await supabase
          .from("user_owned_stickers")
          .delete()
          .eq("user_id", userId)
          .eq("sticker_id", row.id);
        if (error) throw error;
        onToggleLocal(row.id, false);
      } else if (delta < 0) {
        const nq = q - 1;
        const { error } = await supabase
          .from("user_owned_stickers")
          .update({ quantity: nq })
          .eq("user_id", userId)
          .eq("sticker_id", row.id);
        if (error) throw error;
        onQuantityLocal(row.id, nq);
      } else {
        const nq = q + 1;
        const { error } = await supabase
          .from("user_owned_stickers")
          .update({ quantity: nq })
          .eq("user_id", userId)
          .eq("sticker_id", row.id);
        if (error) throw error;
        onQuantityLocal(row.id, nq);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      busy.current = false;
    }
  };

  if (stickers.length === 0) {
    return (
      <p className="py-12 text-center text-[0.8rem] text-muted-foreground">
        Nenhuma figurinha neste filtro.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5 pb-28 pt-2">
      {stickers.map((s) => {
        const has = owned.has(s.id);
        const slot = stickerSlotLabel(s);
        const kind = stickerKindLabel(s.sticker_kind);
        const qty = getQty(s.id);
        const spares = spareCount(qty);
        return (
          <li key={s.id} className="overflow-hidden rounded-lg border border-border/80 bg-card">
            <button
              type="button"
              onClick={() => toggle(s)}
              className={cn(
                "flex w-full min-h-[48px] items-start gap-2.5 px-2.5 py-2 text-left transition-colors active:bg-muted/30",
                has ? "bg-emerald-500/[0.04]" : "hover:bg-muted/30",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  has
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {has ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <CircleOff className="h-4 w-4" strokeWidth={2} />
                )}
              </span>
              <span className="min-w-0 flex-1 overflow-visible text-left">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                  {slot !== "—" && (
                    <span className="shrink-0 text-[0.68rem] font-bold uppercase tracking-tight text-primary">
                      {slot}
                    </span>
                  )}
                  <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
                    {has ? (
                      <span className="text-emerald-700 dark:text-emerald-400">Tenho</span>
                    ) : (
                      "Falta"
                    )}
                  </span>
                </span>
                <span className="mt-0.5 block text-balance break-words text-[0.84rem] font-semibold leading-snug text-foreground">
                  {s.player_name}
                </span>
                <span className="mt-0.5 block text-balance break-words text-[0.74rem] leading-snug text-muted-foreground">
                  {kind} · {s.team_name}
                  {s.shirt_number != null ? ` · #${s.shirt_number}` : ""}
                </span>
              </span>
            </button>
            {has && qty >= 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-muted/25 px-2.5 py-2">
                <div className="min-w-0 text-[0.68rem] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground">{qty}</span> no total
                  {spares > 0 && (
                    <>
                      {" · "}
                      <span className="font-medium text-foreground">{spares}</span> repetida
                      {spares > 1 ? "s" : ""}
                    </>
                  )}
                </div>
                <div
                  className="flex shrink-0 items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={busy.current}
                    aria-label="Menos uma"
                    onClick={() => changeQty(s, -1)}
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={busy.current}
                    aria-label="Mais uma repetida"
                    onClick={() => changeQty(s, 1)}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </Button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
