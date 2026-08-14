import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Proxy de POST /v1/presupuestos/finalizar-aceptacion (finalizarAceptacion
 * del original) — se usa cuando se aceptó un presupuesto marcando "Sí, habrá
 * más por aceptar" y luego resulta que no había ninguno más: rechaza los que
 * quedaron pendientes y recalcula el estado de la reparación.
 */
export async function POST(req: Request, { params }: { params: Promise<{ resguardo: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;

  try {
    const resultado = await kelatosApiPost<{
      ok: boolean;
      reparacion: Record<string, unknown>;
      presupuestosReparacion: Record<string, unknown>[];
    }>("/v1/presupuestos/finalizar-aceptacion", {
      requestId: crypto.randomUUID(),
      usuario,
      resguardo,
    });
    return NextResponse.json({
      ok: true,
      reparacion: resultado.reparacion,
      presupuestosReparacion: resultado.presupuestosReparacion,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
