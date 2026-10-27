import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

export const maxDuration = 60;

export interface SitioGsc { site: string; activo: boolean; organizacion_id: number | null; ultima_sync: string | null; ultimo_error: string | null }
export interface RespuestaSitiosGsc {
  configurado: boolean;
  cuentaServicio: string | null;
  /** Propiedades de Search Console a las que la cuenta de servicio ya tiene acceso. */
  visibles: { site: string; permiso: string }[];
  /** Propiedades que se sincronizan, con su organización de Agentes V2. */
  sitios: SitioGsc[];
}

/** Proxy de GET /v1/seo/gsc/sitios — propiedades de Search Console y a qué organización pertenece cada una. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const r = await kelatosApiGet<{ ok: boolean; configurado: boolean; cuentaServicio: string | null; visibles: { site: string; permiso: string }[]; configurados: SitioGsc[] }>("/v1/seo/gsc/sitios");
    const respuesta: RespuestaSitiosGsc = { configurado: r.configurado, cuentaServicio: r.cuentaServicio, visibles: r.visibles, sitios: r.configurados };
    return NextResponse.json({ ok: true, ...respuesta });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/** Asigna una propiedad a una organización, la activa y hace la primera descarga (90 días). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { site?: string; organizacionId?: number | string };
  if (!body.site || !body.organizacionId) return NextResponse.json({ ok: false, error: "Faltan la propiedad o la organización" }, { status: 400 });
  try {
    await kelatosApiPost("/v1/seo/gsc/sitios", { site: body.site, activo: true, organizacionId: body.organizacionId });
    const s = await kelatosApiPost<{ ok: boolean; filas: number }>("/v1/seo/gsc/sincronizar", { site: body.site, dias: 90 });
    return NextResponse.json({ ok: true, filas: s.filas });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
