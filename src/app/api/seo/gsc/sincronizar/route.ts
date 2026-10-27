import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export const maxDuration = 60;

/** Proxy de POST /v1/seo/gsc/sincronizar — descarga ahora las consultas recientes de Search Console. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { site?: string; dias?: number };
  if (!body.site) return NextResponse.json({ ok: false, error: "Falta la propiedad" }, { status: 400 });
  try {
    const r = await kelatosApiPost<{ ok: boolean; filas: number; desde: string; hasta: string }>("/v1/seo/gsc/sincronizar", { site: body.site, dias: body.dias ?? 10 });
    return NextResponse.json({ ok: true, filas: r.filas, desde: r.desde, hasta: r.hasta });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
