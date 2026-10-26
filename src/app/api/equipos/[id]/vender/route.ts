import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Marca un equipo como vendido ligándolo al número de su factura de venta (o añade/cambia la factura de uno ya vendido). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { numeroFactura?: unknown; comprador?: unknown; forzar?: unknown };
  const numeroFactura = typeof b.numeroFactura === "string" ? b.numeroFactura.trim() : "";
  if (!numeroFactura) return NextResponse.json({ ok: false, error: "Indica el número de factura de la venta" }, { status: 400 });

  try {
    const r = await kelatosApiPost<object>(`/v1/equipos/${encodeURIComponent(id)}/vender`, {
      usuario,
      numeroFactura,
      comprador: typeof b.comprador === "string" ? b.comprador.trim() : "",
      forzar: b.forzar === true,
    });
    return NextResponse.json(r);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
