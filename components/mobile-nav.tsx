"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Camera, CopyPlus, LayoutGrid, ListChecks, LogOut, Users } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/album");
    router.prefetch("/repetidas");
    router.prefetch("/escanear");
    router.prefetch("/amigos");
  }, [router]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const linkClass = (active: boolean) =>
    cn(
      "flex flex-col items-center justify-center gap-0.5 py-1.5 text-[0.58rem] font-medium leading-tight tracking-wide transition-colors sm:text-[0.62rem]",
      active ? "text-primary" : "text-muted-foreground",
    );

  const amigosActive =
    pathname === "/amigos" || pathname.startsWith("/amigos/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto grid max-w-lg grid-cols-6 gap-0 px-0.5 pt-0.5">
        <Link href="/" className={linkClass(pathname === "/")} prefetch scroll={false}>
          <ListChecks className="mx-auto h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={1.75} />
          Lista
        </Link>
        <Link
          href="/album"
          className={linkClass(pathname === "/album")}
          prefetch
          scroll={false}
        >
          <LayoutGrid className="mx-auto h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={1.75} />
          Álbum
        </Link>
        <Link
          href="/repetidas"
          className={linkClass(pathname === "/repetidas")}
          prefetch
          scroll={false}
        >
          <CopyPlus className="mx-auto h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={1.75} />
          Rep.
        </Link>
        <Link
          href="/escanear"
          className={linkClass(pathname === "/escanear")}
          prefetch
          scroll={false}
        >
          <Camera className="mx-auto h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={1.75} />
          Foto
        </Link>
        <Link
          href="/amigos"
          className={linkClass(amigosActive)}
          prefetch
          scroll={false}
        >
          <Users className="mx-auto h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={1.75} />
          Amigos
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="h-auto flex-col gap-0.5 rounded-md py-1.5 text-[0.58rem] font-medium leading-tight text-muted-foreground sm:text-[0.62rem]"
          onClick={signOut}
        >
          <LogOut className="mx-auto h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={1.75} />
          Sair
        </Button>
      </div>
    </nav>
  );
}
