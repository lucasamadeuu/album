"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ScanMatch, ScanUnknown } from "@/lib/gemini-photo-scan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Camera, Check, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.82;

async function resizeToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não suportado.");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("Falha ao gerar JPEG.");
    return blob;
  } finally {
    bitmap.close();
  }
}

export function ScanPageClient() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [matched, setMatched] = useState<ScanMatch[] | null>(null);
  const [unknownFromModel, setUnknownFromModel] = useState<ScanUnknown[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualExtras, setManualExtras] = useState<
    { id: string; label: string }[]
  >([]);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [manualNum, setManualNum] = useState("");
  const [manualBusy, setManualBusy] = useState(false);

  const resetIaOnly = useCallback(() => {
    setMatched(null);
    setUnknownFromModel([]);
    setSelected(new Set());
    setModelLabel(null);
  }, []);

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...files];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (!f.type.startsWith("image/")) continue;
      next.push(f);
    }
    setFiles(next.slice(0, 12));
    resetIaOnly();
  };

  const removeAt = (i: number) => {
    setFiles((prev) => prev.filter((_, j) => j !== i));
    resetIaOnly();
  };

  const runScan = async () => {
    if (files.length === 0) {
      toast.error("Escolhe pelo menos uma foto.");
      return;
    }
    setBusy(true);
    resetIaOnly();
    try {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        const blob = await resizeToJpeg(files[i]);
        fd.append("files", blob, `page-${i}.jpg`);
      }
      const res = await fetch("/api/catalog/scan-photos", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "Erro ao analisar.",
        );
        return;
      }
      const list = (data.matched ?? []) as ScanMatch[];
      const unk = (data.unknownFromModel ?? []) as ScanUnknown[];
      setMatched(list);
      setUnknownFromModel(unk);
      setSelected(new Set(list.map((m) => m.stickerId)));
      setModelLabel(typeof data.model === "string" ? data.model : null);
      toast.success(
        list.length
          ? `${list.length} figurinha(s) reconhecida(s). Revisa e confirma.`
          : "Nenhuma colada reconhecida com certeza. Tenta outras fotos ou marca à mão.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSel = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const addByAlbumNumber = async () => {
    const n = parseInt(manualNum.trim(), 10);
    if (!Number.isFinite(n) || n < 1) {
      toast.error("Número de álbum inválido.");
      return;
    }
    setManualBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stickers")
        .select("id, album_number, player_name, team_name")
        .eq("album_number", n)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error(`Nº ${n} não está no catálogo.`);
        return;
      }
      setManualExtras((prev) =>
        prev.some((x) => x.id === data.id)
          ? prev
          : [
              ...prev,
              {
                id: data.id,
                label: `#${data.album_number} · ${data.player_name}`,
              },
            ],
      );
      toast.success(`${data.player_name} (${data.team_name}) adicionado.`);
      setManualNum("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao procurar.");
    } finally {
      setManualBusy(false);
    }
  };

  const removeManualExtra = (id: string) => {
    setManualExtras((prev) => prev.filter((x) => x.id !== id));
  };

  const applySelection = async () => {
    const idSet = new Set<string>();
    selected.forEach((id) => idSet.add(id));
    manualExtras.forEach((x) => idSet.add(x.id));
    const ids = Array.from(idSet);
    if (ids.length === 0) {
      toast.error("Nada selecionado para marcar.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/catalog/apply-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stickerIds: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "Erro ao gravar.",
        );
        return;
      }
      toast.success(
        `${ids.length} marcada(s) como tenho (quantidades antigas mantidas).`,
      );
      setMatched(null);
      setUnknownFromModel([]);
      setSelected(new Set());
      setManualExtras([]);
      setFiles([]);
      setModelLabel(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  };

  const idPick = new Set<string>();
  selected.forEach((id) => idPick.add(id));
  manualExtras.forEach((x) => idPick.add(x.id));
  const totalPick = idPick.size;

  return (
    <>
      <header className="border-b border-border/60 px-4 pb-3 pt-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Camera className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="text-[1.05rem] font-semibold tracking-tight">
              Por foto (IA)
            </h1>
            <p className="text-[0.72rem] leading-relaxed text-muted-foreground">
              Fotografa as páginas com boa luz. A IA só marca figurinhas que
              parecem <strong className="font-medium text-foreground">coladas</strong>
              ; o resto podes completar à mão. A chave Gemini fica no servidor.
            </p>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 pb-28 pt-3">
        <div className="rounded-lg border border-border/70 bg-card/80 p-3">
          <Label className="text-[0.72rem] font-medium text-muted-foreground">
            Fotos (até 12, JPEG após redimensionar)
          </Label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              disabled={busy}
              onClick={() => document.getElementById("scan-files")?.click()}
            >
              <ImagePlus className="mr-1.5 h-4 w-4" />
              Adicionar
            </Button>
            <input
              id="scan-files"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onPickFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              className="h-10"
              disabled={busy || files.length === 0}
              onClick={runScan}
            >
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Analisar com IA
            </Button>
          </div>
          {files.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 px-2 py-1.5 text-[0.75rem]"
                >
                  <span className="min-w-0 truncate">{f.name}</span>
                  <button
                    type="button"
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Remover"
                    onClick={() => removeAt(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[0.72rem] text-muted-foreground">
              Nenhuma foto selecionada.
            </p>
          )}
        </div>

        {matched && (
          <div className="space-y-2 rounded-lg border border-emerald-600/30 bg-emerald-500/[0.05] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[0.78rem] font-medium text-foreground">
                Reconhecidas ({matched.length})
              </p>
              {modelLabel ? (
                <span className="text-[0.62rem] text-muted-foreground">
                  modelo {modelLabel}
                </span>
              ) : null}
            </div>
            <p className="text-[0.68rem] text-muted-foreground">
              Desmarca o que a IA errou. Isto só <strong className="font-medium text-foreground">adiciona</strong>{" "}
              “tenho”; não remove figurinhas que já tinhas.
            </p>
            <ul className="max-h-[min(50vh,22rem)] space-y-1 overflow-y-auto pr-0.5">
              {matched.map((m) => {
                const on = selected.has(m.stickerId);
                return (
                  <li key={m.stickerId}>
                    <button
                      type="button"
                      onClick={() => toggleSel(m.stickerId)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md border px-2 py-2 text-left text-[0.78rem] transition-colors",
                        on
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-border/60 bg-card opacity-70",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                          on
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {on ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        ) : (
                          <X className="h-3 w-3 opacity-50" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="font-semibold text-foreground">
                          {m.albumNumber != null ? `#${m.albumNumber}` : "—"}{" "}
                          {m.albumCode ? `· ${m.albumCode}` : ""}
                        </span>
                        <span className="mt-0.5 block text-[0.72rem] text-muted-foreground">
                          {m.playerName} · {m.teamName}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-amber-500/35 bg-amber-500/[0.06] p-3">
          <p className="text-[0.78rem] font-medium text-foreground">
            À mão / dúvidas da IA
          </p>
          {unknownFromModel.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-[0.72rem] text-muted-foreground">
              {unknownFromModel.map((u, i) => (
                <li
                  key={`${u.description}-${i}`}
                  className="rounded border border-border/40 bg-background/60 px-2 py-1.5"
                >
                  {u.description}
                  {u.albumNumberGuess != null && (
                    <span className="mt-0.5 block text-[0.65rem] text-foreground/80">
                      Palpite: nº {u.albumNumberGuess}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : matched ? (
            <p className="mt-2 text-[0.72rem] text-muted-foreground">
              Nada pendente da IA — usa o número abaixo se faltar alguém.
            </p>
          ) : (
            <p className="mt-2 text-[0.72rem] text-muted-foreground">
              Sem análise ainda: podes só incluir por número do álbum.
            </p>
          )}
          {manualExtras.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {manualExtras.map((x) => (
                <li
                  key={x.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/70 px-2 py-1 text-[0.72rem]"
                >
                  <span className="min-w-0 truncate">{x.label}</span>
                  <button
                    type="button"
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Remover"
                    onClick={() => removeManualExtra(x.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor="manual-album" className="text-[0.7rem]">
                Número no álbum (catálogo)
              </Label>
              <Input
                id="manual-album"
                inputMode="numeric"
                placeholder="ex. 412"
                value={manualNum}
                onChange={(e) => setManualNum(e.target.value)}
                className="h-9 text-[0.85rem]"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-9 shrink-0"
              disabled={manualBusy}
              onClick={addByAlbumNumber}
            >
              {manualBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Incluir nº"
              )}
            </Button>
          </div>
        </div>

        {totalPick > 0 && (
          <Button
            type="button"
            className="h-11 w-full"
            disabled={busy || totalPick === 0}
            onClick={applySelection}
          >
            Gravar {totalPick} no meu álbum
          </Button>
        )}
      </main>
    </>
  );
}
