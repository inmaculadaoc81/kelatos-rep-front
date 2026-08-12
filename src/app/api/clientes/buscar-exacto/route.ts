import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearCliente, Cliente } from "@/lib/clientes";

interface RespuestaBuscarCliente {
  ok: boolean;
  cliente: Parameters<typeof mapearCliente>[0] | null;
}

/**
 * Wrapper autenticado (staff) de GET /v1/formulario/buscar-cliente — misma
 * coincidencia EXACTA por DNI/teléfono que usa el formulario público, pero
 * para el auto-relleno de "Código" (y dirección si falta) en los diálogos
 * de facturación, igual que el bloque "Código y dirección de cliente
 * (lookup si alguno falta)" de abrirVistaFactura() en el original —
 * _buscarClienteEnRegistro allí, misma condición de disparo aquí.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dni = searchParams.get("dni") || "";
  const telefono = searchParams.get("telefono") || "";

  try {
    const data = await kelatosApiGet<RespuestaBuscarCliente>("/v1/formulario/buscar-cliente", { dni, telefono });
    const cliente: Cliente | null = data.cliente ? mapearCliente(data.cliente) : null;
    return NextResponse.json({ ok: true, cliente });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
