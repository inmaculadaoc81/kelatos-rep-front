import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * «Pasar a stock»: convierte una pieza reservada para una reparación (COMPRA POR PEDIDO) o en devolución al proveedor en una pieza normal y
 * disponible del catálogo. Cualquier cuenta con sesión puede hacerlo (lo decide quien tiene la pieza en la mano); el servidor comprueba el estado.
 */
export async function POST(req: Request, { params }: { params: Promise<{ referencia: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { referencia } = await params;
  const body = (await req.json().catch(() => ({}))) as { categoria?: unknown };
  const categoria = typeof body.categoria === "string" ? body.categoria : "";
  try {
    const data = await kelatosApiPost(`/v1/stock-piezas-liberar/${encodeURIComponent(referencia)}/liberar`, { categoria, usuario });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
