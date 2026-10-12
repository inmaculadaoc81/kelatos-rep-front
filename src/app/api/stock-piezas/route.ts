import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearStockPieza, DatosStockPiezaForm } from "@/lib/stock-piezas";

interface RespuestaStockPiezas {
  ok: boolean;
  piezas: Parameters<typeof mapearStockPieza>[0][];
}

export async function GET() {
  try {
    const data = await kelatosApiGet<RespuestaStockPiezas>("/v1/lecturas/stock-piezas");
    return NextResponse.json({ ok: true, piezas: data.piezas.map(mapearStockPieza) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/** Reproduce crearStockPieza() (backend/StockPiezas.js): referencia
    obligatoria, referencia en mayúsculas — el duplicado lo rechaza la
    propia clave primaria en Postgres (409). El nombre comercial es
    obligatorio SALVO que se dé un nombre interno de proveedor (pieza
    creada automáticamente desde un pantallazo, cuyo nombre comercial lo
    pone alguien a mano más tarde — ver "Editar pieza"). Petición del
    usuario, 2026-10-12. */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = (await req.json()) as DatosStockPiezaForm;
  const referencia = datos.referencia?.trim().toUpperCase();
  const nombre = datos.nombre?.trim();
  const nombreInternoProveedor = datos.nombreInternoProveedor?.trim();
  if (!referencia) return NextResponse.json({ ok: false, error: "La referencia es obligatoria" }, { status: 400 });
  if (!nombre && !nombreInternoProveedor) {
    return NextResponse.json({ ok: false, error: "El nombre (comercial o interno de proveedor) es obligatorio" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; row: Parameters<typeof mapearStockPieza>[0] }>("/v1/stock_piezas", {
      referencia,
      nombre: nombre || "",
      nombre_interno_proveedor: nombreInternoProveedor || "",
      codigo_proveedor: (datos.codigoProveedor || "").trim(),
      id_pedido_proveedor: (datos.idPedidoProveedor || "").trim(),
      descripcion: (datos.descripcion || "").trim(),
      categoria: (datos.categoria || "").trim(),
      coste_interno: datos.costeInterno || 0,
      precio_cliente: datos.precioCliente || 0,
      mano_obra: datos.manoObra || 0,
      proveedor: (datos.proveedor || "").trim(),
      stock_disponible: datos.stockDisponible || 0,
      stock_minimo: datos.stockMinimo || 0,
      activo: true,
      fecha_creacion: new Date().toISOString(),
      ultimo_usuario: usuario,
      origen_resguardo: datos.origenResguardo?.trim() || undefined,
    });
    return NextResponse.json({ ok: true, pieza: mapearStockPieza(resultado.row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
