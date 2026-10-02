import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Catálogo de etiquetas ya usadas (más populares primero) — para sugerir
    "por tipo" al crear/editar una tarea en vez de que cada quien escriba
    lo que le parezca. Sin datos sensibles. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const data = await kelatosApiGet<{ ok: boolean; etiquetas: string[] }>("/v1/tareas/etiquetas");
    return NextResponse.json({ ok: true, etiquetas: data.etiquetas });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
