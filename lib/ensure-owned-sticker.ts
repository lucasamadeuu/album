import { createClient } from "@/lib/supabase/client";

type SupabaseBrowser = ReturnType<typeof createClient>;

export async function ensureStickerOwnedRow(
  supabase: SupabaseBrowser,
  userId: string,
  stickerId: string,
): Promise<number> {
  const { error: upErr } = await supabase.from("user_owned_stickers").upsert(
    { user_id: userId, sticker_id: stickerId, quantity: 1 },
    { onConflict: "user_id,sticker_id", ignoreDuplicates: true },
  );
  if (upErr) throw upErr;

  const { data, error: selErr } = await supabase
    .from("user_owned_stickers")
    .select("quantity")
    .eq("user_id", userId)
    .eq("sticker_id", stickerId)
    .maybeSingle();

  if (selErr) throw selErr;
  if (data == null || data.quantity == null) {
    throw new Error("Não foi possível confirmar a figurinha gravada.");
  }
  return Math.max(1, data.quantity);
}
