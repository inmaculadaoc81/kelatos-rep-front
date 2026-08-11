import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";

export interface Proveedor {
  proveedorId: string;
  nombre: string;
  activo: boolean;
}

interface FilaProveedorSql {
  proveedor_id: string;
  nombre: string | null;
  activo: boolean | null;
}

interface RespuestaProveedores {
  ok: boolean;
  rows: FilaProveedorSql[];
}

/** Proxy de GET /v1/proveedores — catálogo usado por el selector de "Proveedor" en piezas a pedir. */
export async function GET() {
  try {
    const data = await kelatosApiGet<RespuestaProveedores>("/v1/proveedores", { limit: 500, order: "nombre" });
    const proveedores: Proveedor[] = data.rows
      .filter((r) => r.activo !== false)
      .map((r) => ({ proveedorId: r.proveedor_id, nombre: r.nombre || r.proveedor_id, activo: r.activo !== false }));
    return NextResponse.json({ ok: true, proveedores });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
