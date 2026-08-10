import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { AccionCambioEstadoPresupuesto } from "@/lib/presupuesto-cambiar-estado";

interface RespuestaCambiarEstado {
  ok: boolean;
  presupuesto: Record<string, unknown>;
  reparacion: Record<string, unknown> | null;
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { presupuestoId, accion, motivo } = (await req.json()) as {
    presupuestoId: string;
    accion: AccionCambioEstadoPresupuesto;
    motivo?: string;
  };

  if (!presupuestoId) return NextResponse.json({ ok: false, error: "presupuestoId es obligatorio" }, { status: 400 });
  if (!["aceptar", "rechazar", "anular"].includes(accion)) {
    return NextResponse.json({ ok: false, error: "acción no reconocida" }, { status: 400 });
  }
  if (accion === "rechazar" && !motivo?.trim()) {
    return NextResponse.json({ ok: false, error: "El motivo del rechazo es obligatorio" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<RespuestaCambiarEstado>("/v1/presupuestos/cambiar-estado", {
      requestId: crypto.randomUUID(),
      origen: "dashboard",
      accion,
      presupuestoId,
      usuario,
      datos: motivo ? { motivo: motivo.trim() } : {},
    });

    return NextResponse.json({ ok: true, presupuesto: resultado.presupuesto, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
