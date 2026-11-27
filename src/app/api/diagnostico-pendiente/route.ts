import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import type { DiagnosticoPendiente } from "@/lib/diagnostico-pendiente";

/** GET — equipos que deberían tener la revisión (diagnóstico) cobrada y no la tienen. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const data = await kelatosApiGet<{ ok: boolean; dias: number; pendientes: DiagnosticoPendiente[] }>("/v1/diagnostico-pendiente");
    return NextResponse.json({ ok: true, dias: data.dias, pendientes: data.pendientes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
