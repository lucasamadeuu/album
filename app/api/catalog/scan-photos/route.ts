import { createClient } from "@/lib/supabase/server";
import {
  buildCatalogForPrompt,
  buildScanUserPrompt,
  indexesFromCatalog,
  parseGeminiScanJson,
  resolveScanPayload,
  type CatalogRow,
} from "@/lib/gemini-photo-scan";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { ObjectSchema } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const MAX_FILES = 12;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function visionModelId(): string {
  return (
    process.env.GEMINI_VISION_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.5-flash"
  );
}

const responseSchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    coladas: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          album_number: { type: SchemaType.INTEGER, nullable: true },
          album_code: { type: SchemaType.STRING, nullable: true },
        },
      },
    },
    duvidas: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          descricao: { type: SchemaType.STRING },
          album_number_talvez: { type: SchemaType.INTEGER, nullable: true },
        },
        required: ["descricao"],
      },
    },
  },
  required: ["coladas", "duvidas"],
};

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Defina GOOGLE_GENERATIVE_AI_API_KEY no ambiente (Vercel → Environment Variables).",
      },
      { status: 503 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Envie imagens com multipart/form-data (campo files)." },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const rawFiles = form.getAll("files");
  const files = rawFiles.filter((x): x is File => x instanceof File);
  if (files.length === 0) {
    return NextResponse.json(
      { error: "Adicione pelo menos uma foto (campo files)." },
      { status: 400 },
    );
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `No máximo ${MAX_FILES} fotos por vez.` },
      { status: 400 },
    );
  }

  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Arquivo "${f.name}" excede ${MAX_FILE_BYTES / 1024 / 1024} MB.` },
        { status: 400 },
      );
    }
    const mime = (f.type || "image/jpeg").toLowerCase();
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: `Tipo não suportado: ${mime}. Use JPEG, PNG ou WebP.` },
        { status: 400 },
      );
    }
  }

  const { data: stickerData, error: stickersError } = await supabase
    .from("stickers")
    .select("id, album_number, album_code, player_name, team_name")
    .order("album_number", { ascending: true, nullsFirst: false });

  if (stickersError) {
    return NextResponse.json({ error: stickersError.message }, { status: 500 });
  }

  const catalogRows = (stickerData ?? []) as CatalogRow[];
  if (catalogRows.length === 0) {
    return NextResponse.json(
      { error: "Catálogo vazio. Importe o CSV primeiro." },
      { status: 400 },
    );
  }

  const { byNumber } = indexesFromCatalog(catalogRows);
  if (byNumber.size === 0) {
    return NextResponse.json(
      {
        error:
          "Figurinhas sem album_number. Complete o catálogo ou reimporte o CSV com números.",
      },
      { status: 400 },
    );
  }

  const catalogJson = buildCatalogForPrompt(catalogRows);
  const userPrompt = buildScanUserPrompt(files.length, catalogJson);

  const imageParts: { inlineData: { mimeType: string; data: string } }[] = [];
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    const mime = (f.type || "image/jpeg").toLowerCase();
    imageParts.push({
      inlineData: {
        mimeType: ALLOWED.has(mime) ? mime : "image/jpeg",
        data: buf.toString("base64"),
      },
    });
  }

  const modelId = visionModelId();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: [
      "És um assistente especializado em álbuns de cromos da Copa do Mundo.",
      "Devolves apenas JSON válido, sem texto fora do objeto.",
      "És conservador: em dúvida, não marques como colada; descreve a dúvida em duvidas.",
    ].join(" "),
    generationConfig: {
      temperature: 0.15,
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  let rawText: string;
  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }, ...imageParts],
        },
      ],
    });
    rawText = result.response.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha na API Gemini.";
    const is429 = /429|quota|Quota exceeded/i.test(msg);
    return NextResponse.json(
      {
        error: is429
          ? "Limite de uso (quota) do Gemini atingido ou modelo sem cota no plano gratuito. Espera alguns minutos, ativa billing na Google AI Studio ou troca de modelo."
          : msg,
        hint: is429
          ? "No cashflow usas o mesmo padrão: GEMINI_MODEL=gemini-2.5-flash. Também podes definir GEMINI_VISION_MODEL=gemini-1.5-flash (ou latest)."
          : "Modelo padrão do álbum: gemini-2.5-flash (variável GEMINI_MODEL ou GEMINI_VISION_MODEL).",
      },
      { status: is429 ? 429 : 502 },
    );
  }

  let parsed;
  try {
    parsed = parseGeminiScanJson(rawText);
  } catch {
    return NextResponse.json(
      {
        error:
          "Resposta da IA em formato inválido. Tenta fotos mais nítidas ou menos fotos de uma vez.",
      },
      { status: 422 },
    );
  }

  const { matched, unknownFromModel } = resolveScanPayload(parsed, catalogRows);

  return NextResponse.json({
    matched,
    unknownFromModel,
    model: modelId,
  });
}
