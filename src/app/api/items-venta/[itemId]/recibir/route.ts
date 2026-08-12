import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearItem } from "@/lib/ventas";

/** Reproduce recibirItemUI() — pasa el item a "Pieza Recibida". */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { itemId } = await params;
  try {
    const resultado = await kelatosApiPost<{ ok: boolean; item: Parameters<typeof mapearItem>[0]; todosRecibidos: boolean | null }>(
      `/v1/items-venta/${encodeURIComponent(itemId)}/recibir`,
      { requestId: crypto.randomUUID(), usuario }
    );
    return NextResponse.json({ ok: true, item: mapearItem(resultado.item), todosRecibidos: resultado.todosRecibidos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
