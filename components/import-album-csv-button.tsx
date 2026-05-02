"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ImportAlbumCsvButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/catalog/import-csv", {
        method: "POST",
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "Falha ao importar CSV.");
        return;
      }
      const w = body.warnings as string[] | undefined;
      if (w?.length) {
        toast.message(
          `Importadas ${body.imported} figurinhas. Alguns avisos no console.`,
        );
        console.warn("[import-csv]", w);
      } else {
        toast.success(`Importadas ${body.imported} figurinhas do CSV.`);
      }
      router.refresh();
    } catch {
      toast.error("Erro de rede ao enviar CSV.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onFile}
      />
      <Button
        type="button"
        size="sm"
        className="h-8 gap-1.5 text-[0.72rem]"
        disabled={loading}
        onClick={pickFile}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileUp className="h-3.5 w-3.5" />
        )}
        CSV do álbum
      </Button>
    </>
  );
}
