"use client";

import { useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { StickerRow } from "@/lib/types";
import { spareCount } from "@/lib/spares";
import { teamSlotGradientStyle } from "@/lib/team-slot-gradient";
import {
  stickerSlotLabel,
  teamAbbrevFromSticker,
} from "@/lib/team-code";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type Props = {
  stickers: StickerRow[];
  owned: Set<string>;
  getQty: (stickerId: string) => number;
  userId: string;
  onToggleLocal: (stickerId: string, nextOwned: boolean) => void;
  onQuantityLocal: (stickerId: string, qty: number) => void;
};

function SlotPlaceholder({
  has,
  slotLabel,
  playerName,
  teamAbbrev,
  teamName,
}: {
  has: boolean;
  slotLabel: string;
  playerName: string;
  teamAbbrev: string;
  teamName: string;
}) {
  const showWatermark = slotLabel !== "—";

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col justify-between overflow-hidden p-2.5",
        has &&
          "ring-2 ring-emerald-400/50 ring-inset dark:ring-emerald-500/40",
      )}
      style={teamSlotGradientStyle(teamName)}
    >
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-1"
        aria-hidden
      >
        {showWatermark && (
          <span
            className="max-w-full select-none break-all text-center font-black uppercase leading-none tracking-tight text-white opacity-[0.1] sm:opacity-[0.09]"
            style={{
              fontSize: "clamp(0.75rem, 5vmin, 1.85rem)",
              WebkitTextStroke: "0.5px rgba(255,255,255,0.28)",
            }}
          >
            {slotLabel}
          </span>
        )}
      </div>
      <div className="relative z-[1] flex flex-col items-center gap-1 px-0.5 pt-2 text-center text-[hsl(var(--album-slot-ink))]">
        <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/95">
          {teamAbbrev}
        </span>
        <span className="max-w-full text-balance text-[0.68rem] font-bold uppercase leading-snug text-white">
          {playerName}
        </span>
      </div>
      {has ? (
        <div className="relative z-[2] flex justify-center pb-1.5">
          <span className="rounded-full bg-white/95 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-emerald-800 shadow-sm ring-1 ring-emerald-600/25 dark:text-emerald-950">
            Tenho
          </span>
        </div>
      ) : (
        <div className="relative z-[2] flex justify-center pb-1.5">
          <span className="rounded-full bg-black/25 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-[2px]">
            Falta
          </span>
        </div>
      )}
    </div>
  );
}

export function AlbumGrid({
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

  const addOne = async (row: StickerRow) => {
    if (busy.current || !owned.has(row.id)) return;
    busy.current = true;
    const q = getQty(row.id);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("user_owned_stickers")
        .update({ quantity: q + 1 })
        .eq("user_id", userId)
        .eq("sticker_id", row.id);
      if (error) throw error;
      onQuantityLocal(row.id, q + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      busy.current = false;
    }
  };

  if (stickers.length === 0) {
    return (
      <p className="py-14 text-center text-[0.8rem] text-muted-foreground">
        Nada neste filtro. Ajuste acima ou importe o catálogo na lista.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5">
      {stickers.map((s) => {
        const has = owned.has(s.id);
        const qty = getQty(s.id);
        const spares = spareCount(qty);
        const slotLabel = stickerSlotLabel(s);
        const teamAbbrev = teamAbbrevFromSticker(s);
        return (
          <div
            key={s.id}
            className={cn(
              "group flex w-full flex-col overflow-hidden rounded-lg border text-left shadow-sm transition-all duration-200",
              has
                ? "border-emerald-600/35 bg-card ring-1 ring-emerald-500/20"
                : "border-border/80 bg-card/90",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(s)}
              className="flex w-full flex-col text-left active:scale-[0.99]"
            >
              <div
                className={cn(
                  "flex items-center justify-between gap-2 border-b px-2 py-1",
                  has
                    ? "border-emerald-600/20 bg-emerald-500/[0.07]"
                    : "border-border/50 bg-muted/35",
                )}
              >
                <span
                  className={cn(
                    "text-[0.58rem] font-bold uppercase tracking-[0.14em]",
                    has ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  {has ? "Tenho" : "Falta"}
                </span>
                <span className="max-w-[58%] break-all text-right text-[0.65rem] font-semibold uppercase leading-none tracking-tight text-foreground/90">
                  {slotLabel}
                </span>
              </div>

              <div
                className={cn(
                  "relative aspect-[3/4] w-full bg-muted/50",
                  !has && s.photo_url && "brightness-[0.88] saturate-[0.72]",
                )}
              >
                {s.photo_url ? (
                  <>
                    <Image
                      src={s.photo_url}
                      alt={s.player_name}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width:640px) 50vw, 33vw"
                    />
                    <div className="pointer-events-none absolute left-1 top-1 z-10 max-w-[calc(100%-0.5rem)] rounded bg-black/55 px-1.5 py-0.5 text-[0.58rem] font-bold uppercase leading-tight text-white backdrop-blur-sm">
                      {slotLabel}
                    </div>
                    {has && qty > 1 && (
                      <div className="pointer-events-none absolute right-1 top-8 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[0.55rem] font-bold tabular-nums text-white">
                        ×{qty}
                        {spares > 0 && (
                          <span className="block text-[0.5rem] font-normal opacity-90">
                            +{spares} rep.
                          </span>
                        )}
                      </div>
                    )}
                    {has && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-950/88 via-emerald-950/35 to-transparent px-2 pb-2 pt-10">
                        <p className="text-center text-[0.6rem] font-bold uppercase tracking-wide text-emerald-50">
                          Na coleção
                        </p>
                      </div>
                    )}
                    {!has && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/50 to-transparent px-2 pb-8 pt-1.5">
                        <p className="text-center text-[0.58rem] font-semibold uppercase tracking-wide text-white/95">
                          Falta colar
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <SlotPlaceholder
                      has={has}
                      slotLabel={slotLabel}
                      playerName={s.player_name}
                      teamAbbrev={teamAbbrev}
                      teamName={s.team_name}
                    />
                    {has && qty > 1 && (
                      <div className="pointer-events-none absolute right-1 top-8 z-10 rounded bg-black/45 px-1.5 py-0.5 text-[0.55rem] font-bold tabular-nums text-white">
                        ×{qty}
                      </div>
                    )}
                  </>
                )}
                {has && (
                  <div
                    className="absolute bottom-1.5 right-1.5 z-20"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full shadow-md"
                      aria-label="Adicionar repetida"
                      disabled={busy.current}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addOne(s);
                      }}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t border-border/35 bg-[hsl(45_20%_99%/0.92)] px-2 py-2 dark:bg-card/95">
                <p className="text-balance break-words text-center text-[0.72rem] font-semibold leading-snug text-foreground">
                  {s.player_name}
                </p>
                <p className="mt-1 text-balance break-words text-center text-[0.65rem] font-medium leading-snug text-muted-foreground">
                  {s.team_name}
                </p>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
