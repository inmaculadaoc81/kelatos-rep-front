import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Guarda "Su Referencia" (PO/referencia propia del cliente, texto libre y
 * opcional) para un documento fiscal ya generado — nunca se imprime en el
 * PDF, solo alimenta la columna "Su Ref." de Facturas de Clientes. Proxy
 * fino de POST /v1/documentos/su-referencia (kelatos_app.documentos_su_referencia,
 * migración 069). Petición del usuario, 2026-09-01.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const usuario = session?.user?.email;
    if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

    const body = await request.json();
    const numero = typeof body?.numero === "string" ? body.numero.trim() : "";
    if (!numero) return NextResponse.json({ ok: false, error: "numero es obligatorio" }, { status: 400 });
    const suReferencia = typeof body?.suReferencia === "string" ? body.suReferencia.trim() : "";

    const resultado = await kelatosApiPost("/v1/documentos/su-referencia", { numero, suReferencia, usuario });
    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
