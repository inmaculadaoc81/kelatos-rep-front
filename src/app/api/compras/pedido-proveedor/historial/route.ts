import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import type { LineaRegistroPedidoProveedor } from "../registro/route";

interface FilaRegistroSql {
  id: number;
  fecha: string;
  usuario: string | null;
  proveedor_nombre: string | null;
  numero_pedido_global: string | null;
  pedidos_stock: number;
  pedidos_resguardo: number;
  lineas_fallidas: number;
  resumen: LineaRegistroPedidoProveedor[];
}

export interface RegistroPedidoProveedor {
  id: number;
  fecha: string;
  usuario: string;
  proveedorNombre: string;
  numeroPedidoGlobal: string | null;
  pedidosStock: number;
  pedidosResguardo: number;
  lineasFallidas: number;
  resumen: LineaRegistroPedidoProveedor[];
}

function mapear(f: FilaRegistroSql): RegistroPedidoProveedor {
  return {
    id: f.id,
    fecha: f.fecha,
    usuario: f.usuario || "",
    proveedorNombre: f.proveedor_nombre || "",
    numeroPedidoGlobal: f.numero_pedido_global,
    pedidosStock: f.pedidos_stock,
    pedidosResguardo: f.pedidos_resguardo,
    lineasFallidas: f.lineas_fallidas,
    resumen: Array.isArray(f.resumen) ? f.resumen : [],
  };
}

/** Proxy de GET /v1/compras/pedido-proveedor/registros — para el botón
    "Historial" junto a "Pedido por pantallazo": qué se ha registrado con
    esa función, más reciente primero. */
export async function GET() {
  try {
    const data = await kelatosApiGet<{ ok: boolean; registros: FilaRegistroSql[] }>("/v1/compras/pedido-proveedor/registros", { limite: 30 });
    return NextResponse.json({ ok: true, registros: data.registros.map(mapear) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
