import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeStickerKind } from "@/lib/sticker-kind";
import { NextResponse } from "next/server";

const MAX_BYTES = 2 * 1024 * 1024;

/** Uma linha CSV simples: vírgula, campos sem vírgula interna ou entre aspas "..." */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out.map((s) => s.replace(/^"|"$/g, ""));
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Defina SUPABASE_SERVICE_ROLE_KEY no .env para importar o catálogo (grava em stickers).",
      },
      { status: 400 },
    );
  }

  const ct = request.headers.get("content-type") ?? "";
  let text: string;
  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Envie o arquivo CSV no campo "file".' },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máx. 2 MB)." },
        { status: 400 },
      );
    }
    text = await file.text();
  } else {
    text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BYTES) {
      return NextResponse.json(
        { error: "Corpo muito grande (máx. 2 MB)." },
        { status: 400 },
      );
    }
  }

  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return NextResponse.json(
      {
        error:
          "CSV precisa de cabeçalho + pelo menos uma linha. Veja data/album-exemplo.csv.",
      },
      { status: 400 },
    );
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iNum = idx("album_number");
  const iCode = idx("album_code");
  const iName = idx("player_name");
  const iTeam = idx("team_name");
  const iKind = idx("sticker_kind");
  const iPhoto = idx("photo_url");

  if (iNum < 0 || iName < 0 || iTeam < 0 || iKind < 0) {
    return NextResponse.json(
      {
        error:
          "Cabeçalho obrigatório: album_number, player_name, team_name, sticker_kind. Opcional: album_code, photo_url.",
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  type Row = {
    album_number: number;
    album_code: string | null;
    player_name: string;
    team_name: string;
    sticker_kind: string;
    photo_url: string | null;
    api_player_id: null;
    api_team_id: null;
    position: null;
    shirt_number: null;
    updated_at: string;
  };

  const byNumber = new Map<number, Row>();
  const errors: string[] = [];

  for (let li = 1; li < lines.length; li++) {
    const cells = splitCsvLine(lines[li]);
    const rawNum = cells[iNum]?.trim();
    const num = rawNum ? parseInt(rawNum, 10) : NaN;
    if (!Number.isFinite(num) || num < 1) {
      errors.push(`Linha ${li + 1}: album_number inválido.`);
      continue;
    }
    const player_name = (cells[iName] ?? "").trim();
    const team_name = (cells[iTeam] ?? "").trim();
    const kindRaw = (cells[iKind] ?? "player").trim();
    const kind = normalizeStickerKind(kindRaw);
    if (!kind) {
      errors.push(
        `Linha ${li + 1}: sticker_kind inválido (${kindRaw}). Use player, crest, team, special, mascot, other.`,
      );
      continue;
    }
    if (!player_name || !team_name) {
      errors.push(`Linha ${li + 1}: player_name e team_name são obrigatórios.`);
      continue;
    }
    const photoRaw = iPhoto >= 0 ? (cells[iPhoto] ?? "").trim() : "";
    const photo_url = photoRaw.length > 0 ? photoRaw : null;
    const codeRaw = iCode >= 0 ? (cells[iCode] ?? "").trim() : "";
    const album_code =
      codeRaw.length > 0 ? codeRaw.toUpperCase() : null;

    byNumber.set(num, {
      album_number: num,
      album_code,
      player_name,
      team_name,
      sticker_kind: kind,
      photo_url,
      api_player_id: null,
      api_team_id: null,
      position: null,
      shirt_number: null,
      updated_at: now,
    });
  }

  const rows = Array.from(byNumber.values());

  if (rows.length === 0) {
    return NextResponse.json(
      {
        error:
          errors.length > 0
            ? errors.slice(0, 10).join(" ")
            : "Nenhuma linha válida no CSV.",
      },
      { status: 400 },
    );
  }

  const batchSize = 300;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await admin.from("stickers").upsert(batch, {
      onConflict: "album_number",
    });
    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    imported: rows.length,
    warnings: errors.length > 0 ? errors.slice(0, 20) : undefined,
  });
}
