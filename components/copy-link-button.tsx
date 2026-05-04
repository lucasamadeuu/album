"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Check } from "lucide-react";
import { toast } from "sonner";

type Props = { href: string; label?: string };

export function CopyLinkButton({ href, label = "Copiar link do perfil" }: Props) {
  const [ok, setOk] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setOk(true);
      toast.success("Link copiado.");
      setTimeout(() => setOk(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 gap-1.5 text-[0.72rem]"
      onClick={copy}
    >
      {ok ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} />
      ) : (
        <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
      )}
      {label}
    </Button>
  );
}
