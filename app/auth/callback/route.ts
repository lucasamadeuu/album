import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Origem pública (Vercel envia x-forwarded-host; dev usa URL da request). */
function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = forwardedHost.includes("localhost") ? "http" : "https";
    return `${proto}://${forwardedHost}`;
  }
  return url.origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next") ?? "/";
  const base = publicOrigin(request);
  const nextUrl = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${nextUrl}`);
    }
  }

  return NextResponse.redirect(`${base}/login?erro=sessao`);
}
