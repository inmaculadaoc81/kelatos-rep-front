import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import type { TransferenciaCandidata } from "@/lib/soporte-transferencia";

/** Transferencias de los últimos 90 días aún sin vincular a ningún documento, para asociarlas al crear una venta o un alquiler. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const r = await kelatosApiGet<{ ok: boolean; transferencias: TransferenciaCandidata[] }>("/v1/comprobantes-transferencia/candidatas");
    return NextResponse.json({ ok: true, transferencias: r.transferencias });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
