import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Reproduce solicitarPresupuestoDesdeGarantia() (Index.html) — el escape del
 * estado "Garantía" cuando el equipo resulta NO estar cubierto. El original
 * hace un ÚNICO write directo de "estado" (API.actualizarReparacion), sin
 * pasar por cambiarEstadoReparacion — a propósito no genera evento de
 * historial ni dispara el email de cambio de estado. Aquí el equivalente es
 * el PATCH genérico (sin ningún efecto secundario), no una de las rutas de
 * negocio con historial/notificación.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;

  try {
    await kelatosApiPost(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}`,
      { estado: "Presupuesto Pendiente" },
      "PATCH"
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
