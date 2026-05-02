/**
 * Lê `figurinhas` (checklist em ordem do álbum) e gera `data/wc2026-album.csv`
 * para importar no app (campo CSV do álbum).
 *
 * Uso: node scripts/build-album-csv.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const inputPath = path.join(root, "figurinhas");
const outPath = path.join(root, "data", "wc2026-album.csv");

/** Código no início: 00, FWC1, MEX12, BRA3, etc. */
const CODE_RE = /^(\d{2}|[A-Z]{2,4}\d+)\s+(.+)$/i;

function inferKind(description) {
  const d = description.toLowerCase();
  if (d.includes("team logo")) return "crest";
  if (d.includes("team photo")) return "team";
  if (d.includes("fifa museum")) return "special";
  if (d.includes("panini logo")) return "special";
  if (d.includes("official emblem")) return "special";
  if (d.includes("official mascots")) return "special";
  if (d.includes("official slogan")) return "special";
  if (d.includes("official ball")) return "special";
  if (d.includes("host countries") || d.includes("host countries & cities"))
    return "special";
  return "player";
}

function stripFoilSuffix(s) {
  return s.replace(/\s+FOIL\s*$/i, "").trim();
}

function splitTitle(rest) {
  const idx = rest.lastIndexOf(" - ");
  if (idx === -1) {
    const t = stripFoilSuffix(rest.trim());
    return { title: t, team: "Copa 2026" };
  }
  const title = stripFoilSuffix(rest.slice(0, idx).trim());
  const team = stripFoilSuffix(rest.slice(idx + 3).trim());
  return {
    title: title || stripFoilSuffix(rest.trim()),
    team: team || "Copa 2026",
  };
}

function csvField(s) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normalizeAlbumCode(raw) {
  return String(raw).trim().toUpperCase();
}

const raw = fs.readFileSync(inputPath, "utf8");
const lines = raw.split(/\r?\n/);

const rows = [];
let albumNumber = 0;

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const m = trimmed.match(CODE_RE);
  if (!m) continue;
  const album_code = normalizeAlbumCode(m[1]);
  const afterCode = m[2].trim();
  albumNumber += 1;
  const { title, team } = splitTitle(afterCode);
  const sticker_kind = inferKind(afterCode);
  rows.push({
    album_number: albumNumber,
    album_code,
    player_name: title,
    team_name: team,
    sticker_kind,
    photo_url: "",
  });
}

if (rows.length !== 980) {
  console.warn(
    `Esperado 980 figurinhas; obtido ${rows.length}. Confira o arquivo fonte.`,
  );
}

const header =
  "album_number,album_code,player_name,team_name,sticker_kind,photo_url\n";
const body = rows
  .map(
    (r) =>
      [
        r.album_number,
        csvField(r.album_code),
        csvField(r.player_name),
        csvField(r.team_name),
        r.sticker_kind,
        r.photo_url,
      ].join(","),
  )
  .join("\n");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, header + body + "\n", "utf8");
console.log(`Escrito ${outPath} (${rows.length} linhas).`);
