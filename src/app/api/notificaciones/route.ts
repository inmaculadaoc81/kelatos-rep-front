import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import type { NotificacionApi } from "@/lib/notificaciones";

/**
 * Registro de notificaciones para el "Centro de notificaciones" — correos
 * registrados por el sistema + histórico anterior. `dias` (por defecto 180)
 * acota lo que se lee; el backend devuelve como máximo 30.000 filas.
 */
export async function GET(req: Request) {
  try {
    const dias = new URL(req.url).searchParams.get("dias") || "180";
    const data = await kelatosApiGet<{ ok: boolean; dias: number; notificaciones: NotificacionApi[] }>(
      "/v1/lecturas/centro-notificaciones",
      { dias }
    );
    return NextResponse.json({ ok: true, dias: data.dias, notificaciones: data.notificaciones });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
