import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearStockPieza, DatosStockPiezaForm } from "@/lib/stock-piezas";

/** Reproduce actualizarStockPieza() (backend/StockPiezas.js) — la referencia
    no se puede cambiar (readOnly en el modal de edición del original). */
export async function PATCH(req: Request, { params }: { params: Promise<{ referencia: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { referencia } = await params;
  const datos = (await req.json()) as DatosStockPiezaForm;
  const nombre = datos.nombre?.trim();
  if (!nombre) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; row: Parameters<typeof mapearStockPieza>[0] }>(
      `/v1/stock_piezas/${encodeURIComponent(referencia)}`,
      {
        nombre,
        descripcion: (datos.descripcion || "").trim(),
        categoria: (datos.categoria || "").trim(),
        coste_interno: datos.costeInterno || 0,
        precio_cliente: datos.precioCliente || 0,
        mano_obra: datos.manoObra || 0,
        proveedor: (datos.proveedor || "").trim(),
        stock_disponible: datos.stockDisponible || 0,
        stock_minimo: datos.stockMinimo || 0,
        ultimo_usuario: usuario,
      },
      "PATCH"
    );
    return NextResponse.json({ ok: true, pieza: mapearStockPieza(resultado.row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/** Reproduce eliminarStockPieza() (backend/StockPiezas.js): borrado lógico
    (activo=false), nunca elimina la fila — igual que el resto del catálogo,
    para no perder el histórico de piezas ya usadas en presupuestos/facturas. */
export async function DELETE(req: Request, { params }: { params: Promise<{ referencia: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { referencia } = await params;
  try {
    await kelatosApiPost(`/v1/stock_piezas/${encodeURIComponent(referencia)}`, { activo: false, ultimo_usuario: usuario }, "PATCH");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
