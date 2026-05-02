import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const API = "https://v3.football.api-sports.io/players";
/** Mundial FIFA na API-Sports — vide documentação “World Cup”. */
const LEAGUE = "1";
/** Plano Free costuma aceitar temporadas 2022–2024; 2026 exige plano pago. */
const DEFAULT_SEASON_FREE = "2022";

type ApiPlayerBundle = {
  player?: {
    id?: number;
    name?: string;
    photo?: string | null;
  };
  statistics?: Array<{
    team?: { id?: number; name?: string };
    games?: { position?: string | null; number?: number | null };
  }>;
};

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const apiKey = process.env.APISPORTS_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Defina APISPORTS_KEY no .env (dashboard API-Sports / API-Football).",
      },
      { status: 400 },
    );
  }

  const season =
    process.env.APISPORTS_SEASON?.trim() || DEFAULT_SEASON_FREE;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Defina SUPABASE_SERVICE_ROLE_KEY no .env para importar o elenco (grava em stickers).",
      },
      { status: 400 },
    );
  }

  const rows: Array<{
    api_player_id: number;
    album_number: number | null;
    album_code: string | null;
    sticker_kind: string;
    player_name: string;
    team_name: string;
    api_team_id: number | null;
    photo_url: string | null;
    position: string | null;
    shirt_number: number | null;
    updated_at: string;
  }> = [];

  let page = 1;
  let totalPages = 1;
  const now = new Date().toISOString();

  do {
    const url = `${API}?league=${LEAGUE}&season=${encodeURIComponent(season)}&page=${page}`;
    const res = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          error: `API-Sports respondeu ${res.status}`,
          detail: text.slice(0, 500),
        },
        { status: 502 },
      );
    }
    const json = (await res.json()) as {
      errors?: unknown;
      response?: ApiPlayerBundle[];
      paging?: { total?: number; current?: number };
    };

    if (json.errors && Object.keys(json.errors as object).length > 0) {
      return NextResponse.json(
        { error: "API-Sports retornou erro.", detail: json.errors },
        { status: 502 },
      );
    }

    const chunk = json.response ?? [];
    for (const item of chunk) {
      const pid = item.player?.id;
      if (pid == null) continue;
      const p = item.player;
      const stats = item.statistics?.[0];
      const team = stats?.team;
      rows.push({
        api_player_id: pid,
        album_number: null,
        album_code: null,
        sticker_kind: "player",
        player_name: (p?.name ?? "—").trim(),
        team_name: (team?.name ?? "—").trim(),
        api_team_id: team?.id ?? null,
        photo_url: p?.photo ?? null,
        position: stats?.games?.position ?? null,
        shirt_number:
          stats?.games?.number != null ? Number(stats.games.number) : null,
        updated_at: now,
      });
    }

    totalPages = json.paging?.total ?? 1;
    page += 1;
    if (page > 120) break;
  } while (page <= totalPages);

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await admin.from("stickers").upsert(batch, {
      onConflict: "api_player_id",
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
    season: Number(season) || season,
    league: Number(LEAGUE),
  });
}
