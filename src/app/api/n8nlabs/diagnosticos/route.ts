import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { puedeVerCrm } from "@/lib/crm";
import { tienePermiso } from "@/lib/permisos";

/** GET /api/n8nlabs/diagnosticos — respuestas del formulario de automatizacionesn8n.com ya puntuadas (filtros: clasificacion, estado, q). */
export async function GET(req: Request) {
  const session = await auth();
  if (!(await tienePermiso(session?.user?.email, "crm.ver", puedeVerCrm(session?.user)))) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  try {
    return NextResponse.json(await kelatosApiGet("/v1/n8nlabs/diagnosticos", { clasificacion: sp.get("clasificacion") ?? undefined, estado: sp.get("estado") ?? undefined, q: sp.get("q") ?? undefined }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
