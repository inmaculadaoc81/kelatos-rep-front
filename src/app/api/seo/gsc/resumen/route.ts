import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

export interface FilaConsulta { consulta: string; clics: number; impresiones: number; ctr?: string | null; posicion: string | null }
export interface ResumenGsc {
  site: string; dias: number; ultimaSync: string | null; ultimoError: string | null;
  totales: { clics: number; impresiones: number; consultas: number };
  tendencia: { fecha: string; clics: number; impresiones: number }[];
  principales: FilaConsulta[]; oportunidades: FilaConsulta[]; nuevas: FilaConsulta[];
}

/** Proxy de GET /v1/seo/gsc/resumen — consultas principales, oportunidades y nuevas de una propiedad de Search Console. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const site = searchParams.get("site") || "";
  if (!site) return NextResponse.json({ ok: false, error: "Falta la propiedad" }, { status: 400 });
  try {
    const r = await kelatosApiGet<ResumenGsc & { ok: boolean }>("/v1/seo/gsc/resumen", { site, dias: searchParams.get("dias") ?? "28" });
    return NextResponse.json({ ok: true, resumen: r });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
