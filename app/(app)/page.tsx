import { ListPageClient } from "@/components/list-page-client";
import { createClient } from "@/lib/supabase/server";
import { sortStickersForAlbum } from "@/lib/sort-stickers";
import type { StickerRow } from "@/lib/types";
import type { OwnedRow } from "@/lib/use-sticker-filter";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stickersData } = await supabase.from("stickers").select("*");

  const { data: ownedData } = await supabase
    .from("user_owned_stickers")
    .select("sticker_id, quantity")
    .eq("user_id", user.id);

  const stickers = sortStickersForAlbum((stickersData ?? []) as StickerRow[]);
  const ownedRows: OwnedRow[] = (ownedData ?? []).map((r) => ({
    sticker_id: r.sticker_id,
    quantity: Math.max(1, Number((r as { quantity?: number }).quantity ?? 1)),
  }));

  return (
    <ListPageClient
      stickers={stickers}
      ownedRows={ownedRows}
      userId={user.id}
    />
  );
}
