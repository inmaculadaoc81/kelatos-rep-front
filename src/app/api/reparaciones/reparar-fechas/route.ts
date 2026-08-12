import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

interface RespuestaRepararFechas {
  ok: boolean;
  arregladas: number;
  sinHistorial: number;
  entregaArregladas: number;
}

/**
 * Reproduce apiRepararFechasHistorial() — botón "Reparar fechas" del
 * Historial. Solo rellena fecha_reparacion/fecha_entrega donde estén en
 * blanco; nunca sobrescribe un valor ya presente, así que es seguro
 * repetir la llamada.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const resultado = await kelatosApiPost<RespuestaRepararFechas>("/v1/reparaciones/reparar-fechas", {});
    return NextResponse.json({
      ok: true,
      arregladas: resultado.arregladas,
      sinHistorial: resultado.sinHistorial,
      entregaArregladas: resultado.entregaArregladas,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
