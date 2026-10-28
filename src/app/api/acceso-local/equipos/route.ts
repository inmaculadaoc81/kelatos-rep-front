import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { origenPropio } from "@/lib/publico-seguridad";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

export const dynamic = "force-dynamic";

/** Solo administradores: equipos del local autorizados para la cuenta restringida (ver src/lib/acceso-local.ts). */
async function exigirAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !(session?.user?.role === "admin" || esSuperadmin(email))) return null;
  return email;
}

export async function GET() {
  if (!(await exigirAdmin())) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    const data = await kelatosApiGet<{ ok: boolean; equipos: unknown[]; altasPendientes: unknown[] }>("/v1/seguridad/acceso-local/equipos");
    return NextResponse.json({ ok: true, equipos: data.equipos, altasPendientes: data.altasPendientes });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const email = await exigirAdmin();
  if (!email) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  if (!origenPropio(req)) return NextResponse.json({ ok: false, error: "Solicitud no permitida" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { accion?: string; nombre?: string; id?: number | string; minutos?: number };
  try {
    if (body.accion === "alta") {
      const r = await kelatosApiPost<{ ok: boolean; codigo: string; caduca_en: string }>("/v1/seguridad/acceso-local/altas", {
        nombre: body.nombre, minutos: body.minutos ?? 60, creadoPor: email,
      });
      // El enlace se construye con el dominio desde el que el administrador está usando el dashboard (así lleva el www correcto).
      const origen = new URL(req.url).origin;
      return NextResponse.json({ ok: true, url: `${origen}/api/acceso-local/alta?codigo=${r.codigo}`, caduca_en: r.caduca_en });
    }
    if (body.accion === "revocar" && /^\d{1,15}$/.test(String(body.id))) {
      await kelatosApiPost(`/v1/seguridad/acceso-local/equipos/${body.id}/revocar`, {});
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error" }, { status: 502 });
  }
}
