"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyPlus, LayoutGrid, ListChecks, LogOut } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/album");
    router.prefetch("/repetidas");
  }, [router]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const linkClass = (href: string) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.7rem] font-medium tracking-wide transition-colors",
      pathname === href ? "text-primary" : "text-muted-foreground",
    );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        <Link href="/" className={linkClass("/")} prefetch scroll={false}>
          <ListChecks className="h-5 w-5" strokeWidth={1.75} />
          Lista
        </Link>
        <Link href="/album" className={linkClass("/album")} prefetch scroll={false}>
          <LayoutGrid className="h-5 w-5" strokeWidth={1.75} />
          Álbum
        </Link>
        <Link
          href="/repetidas"
          className={linkClass("/repetidas")}
          prefetch
          scroll={false}
        >
          <CopyPlus className="h-5 w-5" strokeWidth={1.75} />
          Repetidas
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="h-auto flex-1 flex-col gap-0.5 rounded-none py-2 text-[0.7rem] font-medium text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" strokeWidth={1.75} />
          Sair
        </Button>
      </div>
    </nav>
  );
}
