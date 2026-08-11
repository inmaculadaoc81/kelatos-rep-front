import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/**
 * GET — próximo número de resguardo, solo para mostrarlo en el Sheet de
 * "Nueva Reparación" antes de guardar. Usa /v1/lecturas/resguardo-seq
 * (diagnóstico de solo lectura, nunca ejecuta nextval/setval) — a
 * diferencia de /v1/reparaciones/altas/preparar, que SÍ consume el
 * número de la secuencia aunque se llame en dryRun. El número real y
 * definitivo se asigna solo al guardar, como en el original.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const data = await kelatosApiGet<{ ok: boolean; siguienteValor: number }>("/v1/lecturas/resguardo-seq");
    return NextResponse.json({ ok: true, siguiente: data.siguienteValor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
