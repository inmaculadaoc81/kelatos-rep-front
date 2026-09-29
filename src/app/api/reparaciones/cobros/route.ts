import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

export interface CobroReparacion {
  resguardo: string;
  tipo: string;
  fecha: string | null;
  total: string | null;
  forma_pago: string | null;
  banco: string | null;
  referencia: string | null;
  numero: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  equipo_modelo: string | null;
  transferencia_estado: "Pendiente" | "Conciliada" | null;
  estadoCobro: "Pendiente" | "Cobrado";
}

/** Vista "Cobros" de Reparaciones: un documento de cobro por fila (factura/
    ticket × general/revisión/anticipo/mensajería), con su forma de pago y
    su estado (Cobrado salvo transferencia sin conciliar todavía) — ver
    /v1/lecturas/reparaciones-cobros en el backend. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const resultado = await kelatosApiGet<{ ok: boolean; resultados: CobroReparacion[] }>("/v1/lecturas/reparaciones-cobros");
    return NextResponse.json({ ok: true, resultados: resultado.resultados });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
