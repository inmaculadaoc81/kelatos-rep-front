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

  const { presupuestoId, accion, motivo, hayMas, mantenerEnAceptado } = (await req.json()) as {
    presupuestoId: string;
    accion: AccionCambioEstadoPresupuesto;
    motivo?: string;
    /** Solo aplica a accion:"aceptar" — reproduce mostrarConfirmacionAceptacion()
        del original: si hay más presupuestos por aceptar, no se rechaza al
        resto ni se cierra el estado todavía (ver GestionPresupuestosDialog,
        que ofrece "No hay más — Continuar" para ese caso). */
    hayMas?: boolean;
    /** Solo aplica a accion:"aceptar" — usado por el botón "Aceptar" del
        panel de Notificaciones (petición del usuario, 2026-09-04): ese
        botón nunca debe pasar la reparación a "En Reparación" aunque el
        presupuesto no necesite pedir pieza, se queda en "Presupuesto
        Aceptado" para que el técnico inicie la reparación manualmente. El
        botón de la ficha de la reparación no manda este campo — mantiene
        su comportamiento normal. */
    mantenerEnAceptado?: boolean;
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
      datos: {
        ...(motivo ? { motivo: motivo.trim() } : {}),
        ...(accion === "aceptar" && hayMas === true ? { hayMas: true } : {}),
        ...(accion === "aceptar" && mantenerEnAceptado === true ? { mantenerEnAceptado: true } : {}),
      },
    });

    return NextResponse.json({ ok: true, presupuesto: resultado.presupuesto, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
