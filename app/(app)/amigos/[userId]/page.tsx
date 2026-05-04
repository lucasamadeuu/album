import Link from "next/link";
import { headers } from "next/headers";
import { CopyLinkButton } from "@/components/copy-link-button";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/is-uuid";
import { sortStickersForAlbum } from "@/lib/sort-stickers";
import { spareCount } from "@/lib/spares";
import { stickerSlotLabel } from "@/lib/team-code";
import { mutualTradeStickerIds } from "@/lib/trade-match";
import type { StickerRow } from "@/lib/types";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const MAX_LIST = 100;

function absoluteProfileUrl(userId: string): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = host.includes("localhost") ? "http" : "https";
  if (!host) return "";
  return `${proto}://${host}/amigos/${userId}`;
}

export default async function AmigoPerfilPage({
  params,
}: {
  params: { userId: string };
}) {
  const targetId = params.userId?.trim() ?? "";
  if (!isUuid(targetId)) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", targetId)
    .maybeSingle();

  if (!profile) notFound();

  const isSelf = user.id === targetId;
  const canViewCollection = profile.share_collection || isSelf;

  if (!canViewCollection) {
    return (
      <main className="px-4 pb-28 pt-4">
        <Link
          href="/amigos"
          className="text-[0.78rem] font-medium text-primary"
        >
          ← Amigos
        </Link>
        <p className="mt-6 text-[0.84rem] text-muted-foreground">
          Esta coleção está privada. O utilizador desativou a partilha.
        </p>
      </main>
    );
  }

  const { data: stickersData } = await supabase.from("stickers").select("*");
  const stickers = sortStickersForAlbum((stickersData ?? []) as StickerRow[]);
  const totalCat = stickers.length;

  const { data: theirOwned } = await supabase
    .from("user_owned_stickers")
    .select("sticker_id, quantity")
    .eq("user_id", targetId);

  const theirRows = theirOwned ?? [];
  const haveCount = theirRows.length;
  const missingCount = Math.max(0, totalCat - haveCount);
  let spareCopies = 0;
  for (const r of theirRows) spareCopies += spareCount(r.quantity);

  const { data: myOwned } = await supabase
    .from("user_owned_stickers")
    .select("sticker_id, quantity")
    .eq("user_id", user.id);
  const myRows = myOwned ?? [];

  let iOfferIds: string[] = [];
  let iReceiveIds: string[] = [];
  if (!isSelf) {
    const t = mutualTradeStickerIds(myRows, theirRows);
    iOfferIds = t.iOffer;
    iReceiveIds = t.iReceive;
  }

  const offerSet = new Set(iOfferIds);
  const receiveSet = new Set(iReceiveIds);
  const iOfferRows = stickers.filter((s) => offerSet.has(s.id));
  const iReceiveRows = stickers.filter((s) => receiveSet.has(s.id));

  const myQty = new Map(myRows.map((r) => [r.sticker_id, r.quantity]));
  const theirQty = new Map(theirRows.map((r) => [r.sticker_id, r.quantity]));

  const profileUrl = absoluteProfileUrl(targetId);

  return (
    <>
      <header className="border-b border-border/60 px-4 pb-3 pt-3">
        <Link
          href="/amigos"
          className="text-[0.72rem] font-medium text-primary"
        >
          ← Amigos
        </Link>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[1.05rem] font-semibold tracking-tight">
              {profile.display_name}
            </h1>
            {isSelf ? (
              <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
                És tu — assim os outros te vêem.
              </p>
            ) : null}
          </div>
          {profileUrl ? (
            <CopyLinkButton href={profileUrl} label="Copiar link" />
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[0.68rem]">
          <span className="rounded-full border border-border/70 bg-muted/35 px-2.5 py-1">
            <span className="font-semibold tabular-nums text-foreground">
              {haveCount}
            </span>{" "}
            / {totalCat || "—"} no álbum
          </span>
          <span className="rounded-full border border-border/70 bg-muted/35 px-2.5 py-1">
            <span className="font-semibold tabular-nums text-foreground">
              {missingCount}
            </span>{" "}
            faltam
          </span>
          <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-amber-950 dark:text-amber-100">
            <span className="font-semibold tabular-nums">{spareCopies}</span>{" "}
            repetidas (cópias extra)
          </span>
        </div>
      </header>

      <main className="space-y-4 px-4 pb-28 pt-3">
        {!isSelf && (iOfferRows.length > 0 || iReceiveRows.length > 0) ? (
          <div className="space-y-3 rounded-lg border border-emerald-600/35 bg-emerald-500/[0.06] p-3">
            <p className="text-[0.78rem] font-semibold text-foreground">
              Trocas contigo (combinar ao vivo)
            </p>
            <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
              <strong className="font-medium text-foreground">Podes dar</strong>{" "}
              repetidas tuas que a esta pessoa falta.
              <br />
              <strong className="font-medium text-foreground">
                Podes receber
              </strong>{" "}
              repetidas dela que a ti faltam no álbum.
            </p>
            {iReceiveRows.length > 0 ? (
              <div>
                <p className="text-[0.72rem] font-medium text-emerald-900 dark:text-emerald-200">
                  Pedir / receber ({iReceiveRows.length})
                </p>
                <ul className="mt-1.5 max-h-[min(40vh,16rem)] space-y-1 overflow-y-auto text-[0.72rem]">
                  {iReceiveRows.slice(0, MAX_LIST).map((s) => {
                    const q = theirQty.get(s.id) ?? 1;
                    const rep = spareCount(q);
                    return (
                      <li
                        key={s.id}
                        className="rounded border border-border/40 bg-background/70 px-2 py-1.5"
                      >
                        <span className="font-semibold text-foreground">
                          {stickerSlotLabel(s)}
                        </span>
                        {rep > 1 ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · até ×{rep} rep. para dar
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {" "}
                            · 1 rep. para dar
                          </span>
                        )}
                        <span className="mt-0.5 block text-[0.65rem] text-muted-foreground">
                          {s.player_name} · {s.team_name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {iReceiveRows.length > MAX_LIST ? (
                  <p className="mt-1 text-[0.62rem] text-muted-foreground">
                    +{iReceiveRows.length - MAX_LIST} mais…
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-[0.68rem] text-muted-foreground">
                Nenhuma repetida dela que te falte ao álbum.
              </p>
            )}
            {iOfferRows.length > 0 ? (
              <div>
                <p className="text-[0.72rem] font-medium text-emerald-900 dark:text-emerald-200">
                  Ofertar / dar ({iOfferRows.length})
                </p>
                <ul className="mt-1.5 max-h-[min(40vh,16rem)] space-y-1 overflow-y-auto text-[0.72rem]">
                  {iOfferRows.slice(0, MAX_LIST).map((s) => {
                    const q = myQty.get(s.id) ?? 1;
                    const rep = spareCount(q);
                    return (
                      <li
                        key={s.id}
                        className="rounded border border-border/40 bg-background/70 px-2 py-1.5"
                      >
                        <span className="font-semibold text-foreground">
                          {stickerSlotLabel(s)}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · tens ×{rep} rep.
                        </span>
                        <span className="mt-0.5 block text-[0.65rem] text-muted-foreground">
                          {s.player_name} · {s.team_name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {iOfferRows.length > MAX_LIST ? (
                  <p className="mt-1 text-[0.62rem] text-muted-foreground">
                    +{iOfferRows.length - MAX_LIST} mais…
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-[0.68rem] text-muted-foreground">
                Não tens repetidas que a ela falte (ou já tem tudo o que podes
                oferecer).
              </p>
            )}
          </div>
        ) : null}

        {!isSelf &&
        iOfferRows.length === 0 &&
        iReceiveRows.length === 0 &&
        haveCount > 0 ? (
          <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[0.72rem] text-muted-foreground">
            Nenhuma troca óbvia neste momento — um de vocês não tem repetidas que
            coincidam com faltas do outro.
          </p>
        ) : null}

        {totalCat === 0 ? (
          <p className="text-[0.75rem] text-muted-foreground">
            Catálogo ainda vazio no servidor; importa o CSV para números
            baterem certo.
          </p>
        ) : null}
      </main>
    </>
  );
}
