import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Proxy de GET /v1/seo/gsc/sitios — propiedades de Search Console que se sincronizan. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const r = await kelatosApiGet<{ ok: boolean; configurado: boolean; configurados: { site: string; activo: boolean; ultima_sync: string | null; ultimo_error: string | null }[] }>("/v1/seo/gsc/sitios");
    return NextResponse.json({ ok: true, configurado: r.configurado, sitios: r.configurados });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
