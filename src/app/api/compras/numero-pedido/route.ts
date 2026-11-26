import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Proxy de POST /v1/compras/numero-pedido — corregir el nº de pedido de una fila de Compras. Solo superadmins (la API lo vuelve a exigir). */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!esSuperadmin(usuario)) return NextResponse.json({ ok: false, error: "Solo un superadministrador puede cambiar el nº de pedido" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { ref?: string; numeroPedido?: string };
  try {
    const r = await kelatosApiPost<{ ok: boolean; numeroPedido: string }>("/v1/compras/numero-pedido", { usuario, ref: body.ref, numeroPedido: body.numeroPedido });
    return NextResponse.json({ ok: true, numeroPedido: r.numeroPedido });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
