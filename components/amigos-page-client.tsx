"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type FriendBrief = { user_id: string; display_name: string };

type Props = {
  myUserId: string;
  initialProfile: ProfileRow | null;
  friends: FriendBrief[];
};

export function AmigosPageClient({
  myUserId,
  initialProfile,
  friends,
}: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(
    initialProfile?.display_name ?? "",
  );
  const [share, setShare] = useState(initialProfile?.share_collection ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialProfile) return;
    setDisplayName(initialProfile.display_name);
    setShare(initialProfile.share_collection);
  }, [initialProfile]);

  const saveProfile = async () => {
    const name = displayName.trim() || "Colecionador";
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").upsert(
        {
          user_id: myUserId,
          display_name: name,
          share_collection: share,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      toast.success("Perfil atualizado.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gravar perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="border-b border-border/60 px-4 pb-3 pt-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Users className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="text-[1.05rem] font-semibold tracking-tight">
              Amigos
            </h1>
            <p className="text-[0.72rem] leading-relaxed text-muted-foreground">
              Quem partilha a coleção aparece na lista. Abre o perfil para ver
              faltas, repetidas e sugestões de troca contigo.
            </p>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 pb-28 pt-3">
        <div className="rounded-lg border border-border/70 bg-card/90 p-3">
          <p className="text-[0.78rem] font-medium text-foreground">
            O teu perfil
          </p>
          <p className="mt-1 text-[0.68rem] text-muted-foreground">
            Sem partilha ativa, ninguém vê a tua coleção nem apareces na lista.
          </p>
          <div className="mt-3 space-y-2">
            <div className="space-y-1">
              <Label htmlFor="dn" className="text-[0.7rem]">
                Nome público
              </Label>
              <Input
                id="dn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como te chamam nas trocas"
                className="h-9 text-[0.85rem]"
                maxLength={80}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 py-1 text-[0.78rem]">
              <input
                type="checkbox"
                checked={share}
                onChange={(e) => setShare(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Partilhar coleção com outros utilizadores autenticados
            </label>
            <Button
              type="button"
              size="sm"
              className="h-9"
              disabled={saving}
              onClick={saveProfile}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Guardar perfil"
              )}
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[0.78rem] font-medium text-foreground">
            Colecionadores ({friends.length})
          </p>
          {friends.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-center text-[0.75rem] text-muted-foreground">
              Ninguém com partilha ativa além de ti — convida amigos a
              registar-se e a ativar “Partilhar coleção”.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {friends.map((f) => (
                <li key={f.user_id}>
                  <Link
                    href={`/amigos/${f.user_id}`}
                    className="flex min-h-[48px] items-center rounded-lg border border-border/60 bg-card px-3 py-2 text-[0.84rem] font-medium transition-colors active:bg-muted/40"
                  >
                    {f.display_name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
