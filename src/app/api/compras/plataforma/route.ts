import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Proxy de POST /v1/compras/plataforma — anota en qué plataforma (Wallapop, AliExpress...) se hizo cada pedido recién
    registrado con "Subir pedido con IA". La plataforma es distinta del proveedor (quien vende). */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { pedidos?: { ref: string; plataforma: string }[] };
  try {
    const r = await kelatosApiPost<{ ok: boolean; guardados: number }>("/v1/compras/plataforma", { usuario, pedidos: body.pedidos || [] });
    return NextResponse.json({ ok: true, guardados: r.guardados });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
