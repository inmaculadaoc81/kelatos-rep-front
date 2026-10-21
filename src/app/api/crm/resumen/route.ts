import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { puedeVerCrm, type ResumenCrm } from "@/lib/crm";

/** GET /api/crm/resumen — cifras de las tarjetas de arriba del tablero. */
export async function GET() {
  const session = await auth();
  if (!puedeVerCrm(session?.user)) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  try {
    const data = await kelatosApiGet<{ ok: boolean } & ResumenCrm>("/v1/crm/resumen");
    const { porEtapa, porOrigen, nuevos_hoy, sin_respuesta, acciones_vencidas } = data;
    return NextResponse.json({ ok: true, porEtapa, porOrigen, nuevos_hoy, sin_respuesta, acciones_vencidas });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
