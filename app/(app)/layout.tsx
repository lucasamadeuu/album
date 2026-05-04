import { MobileNav } from "@/components/mobile-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[radial-gradient(ellipse_at_top,_hsl(150_15%_94%)_0%,_transparent_55%)] pb-24 dark:bg-background">
      {children}
      <MobileNav />
    </div>
  );
}
