import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Mismo catálogo de etiquetas que /api/tareas/etiquetas (admin) — se
    repite aquí porque el kiosco está confinado a /api/asistencia/kiosk/*
    (src/proxy.ts), nunca puede llamar a /api/tareas/*. Sin datos sensibles,
    no hace falta ningún employeeId. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.asistenciaEmpleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const data = await kelatosApiGet<{ ok: boolean; etiquetas: string[] }>("/v1/tareas/etiquetas");
    return NextResponse.json({ ok: true, etiquetas: data.etiquetas });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
