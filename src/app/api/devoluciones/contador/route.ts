import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet } from "@/lib/kelatos-api";

export async function GET() {
  const session = await auth();
  if (!esSuperadmin(session?.user?.email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  try {
    const data = await kelatosApiGet<{ ok: boolean; pendientes: number; completadas: number; importe_pendiente: string; importe_devuelto: string }>(
      "/v1/lecturas/devoluciones/contador"
    );
    return NextResponse.json({
      ok: true,
      pendientes: data.pendientes,
      completadas: data.completadas,
      importePendiente: Number(data.importe_pendiente),
      importeDevuelto: Number(data.importe_devuelto),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
