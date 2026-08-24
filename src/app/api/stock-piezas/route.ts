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

/** Reproduce crearStockPieza() (backend/StockPiezas.js): referencia + nombre
    obligatorios, referencia en mayúsculas — el duplicado lo rechaza la
    propia clave primaria en Postgres (409). */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = (await req.json()) as DatosStockPiezaForm;
  const referencia = datos.referencia?.trim().toUpperCase();
  const nombre = datos.nombre?.trim();
  if (!referencia) return NextResponse.json({ ok: false, error: "La referencia es obligatoria" }, { status: 400 });
  if (!nombre) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; row: Parameters<typeof mapearStockPieza>[0] }>("/v1/stock_piezas", {
      referencia,
      nombre,
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
