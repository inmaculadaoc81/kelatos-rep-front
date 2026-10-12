import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Corrección a mano de la forma de pago de un documento ya emitido ("por si
 * alguien se equivocó" al cobrar) — solo admin/superadmin (mismo criterio
 * que Contabilidad: session.user.role === "admin" || esSuperadmin). Cambia
 * el dato interno; el PDF ya generado no se toca. Petición del usuario,
 * 2026-10-12.
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const esAdmin = session?.user?.role === "admin" || esSuperadmin(email);
  if (!esAdmin) return NextResponse.json({ ok: false, error: "Solo un administrador puede corregir la forma de pago" }, { status: 403 });

  try {
    const body = (await req.json()) as {
      origen?: unknown; entidadId?: unknown; tipo?: unknown; tipoOriginal?: unknown; esTicket?: unknown;
      numeroDocumento?: unknown; formaPago?: unknown; banco?: unknown;
    };
    const data = await kelatosApiPost<{ ok: boolean; formaPago: string; banco: string }>("/v1/facturas-clientes/forma-pago", {
      usuario: email,
      origen: body.origen,
      entidadId: body.entidadId,
      tipo: body.tipo,
      tipoOriginal: body.tipoOriginal,
      esTicket: body.esTicket,
      numeroDocumento: body.numeroDocumento,
      formaPago: body.formaPago,
      banco: body.banco,
    });
    return NextResponse.json({ ok: true, formaPago: data.formaPago, banco: data.banco });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
