import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_BATCH = 500;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { stickerIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const ids =
    body.stickerIds?.filter(
      (x): x is string => typeof x === "string" && x.length > 0,
    ) ?? [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Envie stickerIds com pelo menos um id." },
      { status: 400 },
    );
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `No máximo ${MAX_BATCH} figurinhas por pedido.` },
      { status: 400 },
    );
  }

  const rows = ids.map((sticker_id) => ({
    user_id: user.id,
    sticker_id,
    quantity: 1 as const,
  }));

  const { error } = await supabase.from("user_owned_stickers").upsert(rows, {
    onConflict: "user_id,sticker_id",
    ignoreDuplicates: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, requested: ids.length });
}
