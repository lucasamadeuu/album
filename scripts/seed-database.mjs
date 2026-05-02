/**
 * Envia data/wc2026-album.csv para a tabela public.stickers (Supabase).
 * Usa SUPABASE_SERVICE_ROLE_KEY do .env ou .env.local (nunca commite essa chave).
 *
 * Pré-requisitos:
 * 1. Rodar supabase/schema.sql (ou migration_002_album.sql) no projeto Supabase.
 * 2. Ter NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env
 * 3. Gerar o CSV: npm run album:csv
 *
 * Uso: npm run album:seed
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const STICKER_KINDS = new Set([
  "player",
  "crest",
  "team",
  "special",
  "mascot",
  "other",
]);

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function splitCsvLine(line) {
  const out = [];
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

function normalizeStickerKind(raw) {
  const k = raw.trim().toLowerCase();
  return STICKER_KINDS.has(k) ? k : null;
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const csvPath = path.join(root, "data", "wc2026-album.csv");

if (!url || !serviceKey) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env ou .env.local",
  );
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error("Arquivo não encontrado:", csvPath, "\nRode: npm run album:csv");
  process.exit(1);
}

const text = fs.readFileSync(csvPath, "utf8");
const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
if (lines.length < 2) {
  console.error("CSV vazio ou só cabeçalho.");
  process.exit(1);
}

const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
const idx = (name) => header.indexOf(name);
const iNum = idx("album_number");
const iCode = idx("album_code");
const iName = idx("player_name");
const iTeam = idx("team_name");
const iKind = idx("sticker_kind");
const iPhoto = idx("photo_url");

if (iNum < 0 || iName < 0 || iTeam < 0 || iKind < 0) {
  console.error("CSV precisa das colunas: album_number, player_name, team_name, sticker_kind");
  process.exit(1);
}

const now = new Date().toISOString();
const byNumber = new Map();
const errors = [];

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
    errors.push(`Linha ${li + 1}: sticker_kind inválido (${kindRaw}).`);
    continue;
  }
  if (!player_name || !team_name) {
    errors.push(`Linha ${li + 1}: player_name e team_name obrigatórios.`);
    continue;
  }
  const photoRaw = iPhoto >= 0 ? (cells[iPhoto] ?? "").trim() : "";
  const photo_url = photoRaw.length > 0 ? photoRaw : null;
  const codeRaw = iCode >= 0 ? (cells[iCode] ?? "").trim() : "";
  const album_code = codeRaw.length > 0 ? codeRaw.toUpperCase() : null;

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
  console.error("Nenhuma linha válida.", errors);
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const batchSize = 300;

for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize);
  const { error } = await admin.from("stickers").upsert(batch, {
    onConflict: "album_number",
  });
  if (error) {
    console.error("Erro do Supabase:", error.message, error.code, error.details);
    process.exit(1);
  }
  process.stdout.write(`… ${Math.min(i + batch.length, rows.length)}/${rows.length}\r`);
}

console.log(`\nPronto: ${rows.length} figurinhas na tabela stickers.`);
if (errors.length) console.warn("Avisos:", errors.slice(0, 15));
