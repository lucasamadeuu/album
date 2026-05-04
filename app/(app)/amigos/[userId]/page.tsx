import Link from "next/link";
import { headers } from "next/headers";
import { CopyLinkButton } from "@/components/copy-link-button";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/is-uuid";
import { sortStickersForAlbum } from "@/lib/sort-stickers";
import { spareCount } from "@/lib/spares";
import { stickerSlotLabel } from "@/lib/team-code";
import { mutualTradeStickerIds, spareCollectionStats } from "@/lib/trade-match";
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
          Esta coleção está privada. O usuário desativou o compartilhamento.
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
  const theirStats = spareCollectionStats(theirRows);
  const spareCopies = theirStats.extraCopies;
  const theirSpareTypes = theirStats.typesWithSpare;
  const haveCount = theirRows.length;
  const missingCount = Math.max(0, totalCat - haveCount);

  const { data: myOwned } = await supabase
    .from("user_owned_stickers")
    .select("sticker_id, quantity")
    .eq("user_id", user.id);
  const myRows = myOwned ?? [];
  const myHaveCount = myRows.length;
  const myMissingCount = Math.max(0, totalCat - myHaveCount);
  const mySpareStats = spareCollectionStats(myRows);

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
                Este é o seu perfil — é assim que os outros veem você.
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
            repetidas ({theirSpareTypes}{" "}
            {theirSpareTypes === 1 ? "tipo" : "tipos"})
          </span>
        </div>
      </header>

      <main className="space-y-4 px-4 pb-28 pt-3">
        {!isSelf ? (
          <section className="rounded-xl border border-border/70 bg-card/90 p-3 shadow-sm">
            <h2 className="text-[0.8rem] font-semibold tracking-tight text-foreground">
              Comparar comigo
            </h2>
            <p className="mt-1 text-[0.65rem] leading-relaxed text-muted-foreground">
              Veja num relance as coleções e, abaixo, o que cada um pode oferecer
              numa troca pessoal.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-primary/25 bg-primary/[0.06] p-2.5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
                  Você
                </p>
                <dl className="mt-2 space-y-1 text-[0.64rem] leading-snug text-muted-foreground">
                  <div className="flex justify-between gap-1">
                    <dt>No álbum</dt>
                    <dd className="shrink-0 tabular-nums font-medium text-foreground">
                      {myHaveCount}/{totalCat || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-1">
                    <dt>Faltam</dt>
                    <dd className="shrink-0 tabular-nums font-medium text-foreground">
                      {myMissingCount}
                    </dd>
                  </div>
                  <div className="border-t border-border/40 pt-1">
                    <dt className="font-medium text-foreground">Repetidas</dt>
                    <dd className="mt-0.5 tabular-nums">
                      {mySpareStats.extraCopies}{" "}
                      {mySpareStats.extraCopies === 1 ? "cópia extra" : "cópias extra"}{" "}
                      · {mySpareStats.typesWithSpare}{" "}
                      {mySpareStats.typesWithSpare === 1 ? "tipo" : "tipos"}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                <p className="line-clamp-2 text-[0.65rem] font-semibold text-foreground">
                  {profile.display_name}
                </p>
                <dl className="mt-2 space-y-1 text-[0.64rem] leading-snug text-muted-foreground">
                  <div className="flex justify-between gap-1">
                    <dt>No álbum</dt>
                    <dd className="shrink-0 tabular-nums font-medium text-foreground">
                      {haveCount}/{totalCat || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-1">
                    <dt>Faltam</dt>
                    <dd className="shrink-0 tabular-nums font-medium text-foreground">
                      {missingCount}
                    </dd>
                  </div>
                  <div className="border-t border-border/40 pt-1">
                    <dt className="font-medium text-foreground">Repetidas</dt>
                    <dd className="mt-0.5 tabular-nums">
                      {spareCopies}{" "}
                      {spareCopies === 1 ? "cópia extra" : "cópias extra"} ·{" "}
                      {theirSpareTypes} {theirSpareTypes === 1 ? "tipo" : "tipos"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
        ) : null}

        {!isSelf ? (
          <section className="space-y-3 rounded-lg border border-emerald-600/35 bg-emerald-500/[0.06] p-3">
            <div>
              <h2 className="text-[0.8rem] font-semibold text-foreground">
                Trocas com {profile.display_name}
              </h2>
              <p className="mt-1 text-[0.66rem] leading-relaxed text-muted-foreground">
                <strong className="font-medium text-foreground">
                  {profile.display_name} → Você
                </strong>
                : o que{" "}
                <strong className="font-medium text-foreground">
                  você pode receber
                </strong>{" "}
                (ela ou ele tem repetida; falta no seu álbum).
                <br />
                <strong className="font-medium text-foreground">
                  Você → {profile.display_name}
                </strong>
                : o que{" "}
                <strong className="font-medium text-foreground">você pode dar</strong>{" "}
                (você tem repetida; falta para ela ou ele no álbum). Ao combinar
                pessoalmente: “te dou X, você me dá Y”.
              </p>
              <p className="mt-1.5 text-[0.62rem] text-muted-foreground">
                {iReceiveRows.length}{" "}
                {iReceiveRows.length === 1 ? "tipo" : "tipos"} que você pode pedir ·{" "}
                {iOfferRows.length}{" "}
                {iOfferRows.length === 1 ? "tipo" : "tipos"} que você pode oferecer
              </p>
            </div>

            <div className="rounded-md border border-emerald-600/25 bg-background/50 p-2">
              <p className="text-[0.7rem] font-semibold text-emerald-900 dark:text-emerald-100">
                {profile.display_name} → Você · você pode receber (
                {iReceiveRows.length})
              </p>
              {iReceiveRows.length > 0 ? (
                <>
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
                          <span className="text-muted-foreground">
                            {" "}
                            · até ×{rep}{" "}
                            {rep === 1 ? "cópia" : "cópias"} para dar a você
                          </span>
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
                </>
              ) : (
                <p className="mt-1.5 text-[0.68rem] text-muted-foreground">
                  Não há repetidas dele(a) que você ainda precise no álbum.
                </p>
              )}
            </div>

            <div className="rounded-md border border-emerald-600/25 bg-background/50 p-2">
              <p className="text-[0.7rem] font-semibold text-emerald-900 dark:text-emerald-100">
                Você → {profile.display_name} · você pode dar ({iOfferRows.length})
              </p>
              {iOfferRows.length > 0 ? (
                <>
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
                            · você tem ×{rep} rep. para dar
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
                </>
              ) : (
                <p className="mt-1.5 text-[0.68rem] text-muted-foreground">
                  Você não tem repetidas que {profile.display_name} ainda precise
                  no álbum.
                </p>
              )}
            </div>

            {iOfferRows.length === 0 && iReceiveRows.length === 0 && haveCount > 0 ? (
              <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
                Nenhuma troca óbvia neste momento: as repetidas de um não batem com
                as faltas do outro (ou alguém ainda não tem repetidas no sistema).
              </p>
            ) : null}
          </section>
        ) : null}

        {totalCat === 0 ? (
          <p className="text-[0.75rem] text-muted-foreground">
            Catálogo ainda vazio no servidor; importe o CSV para os números
            baterem certo.
          </p>
        ) : null}
      </main>
    </>
  );
}
