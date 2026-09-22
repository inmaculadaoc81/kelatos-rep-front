import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearProveedor, generarProveedorId, type ProveedorFormData } from "@/lib/proveedores";

// Reexportado para no romper los imports existentes ("@/app/api/proveedores/route")
// en compras/page.tsx, ventas/detalle-venta-dialog.tsx, presupuesto-*-dialog.tsx,
// reportar-problema-pieza-dialog.tsx y registrar-pedido-dialog.tsx — el tipo
// nuevo es un superconjunto del que usaban (proveedorId/nombre/activo siguen
// ahí, con más campos encima), así que es compatible sin tocarlos.
export type { Proveedor } from "@/lib/proveedores";

interface FilaProveedorSql {
  proveedor_id: string;
  nombre: string | null;
  dni_cif: string | null;
  direccion_fiscal: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  codigo_interno: string | null;
  notas: string | null;
  activo: boolean | null;
}

interface RespuestaProveedores {
  ok: boolean;
  rows: FilaProveedorSql[];
}

/** Proxy de GET /v1/proveedores. Por defecto solo activos (selector de
    "Proveedor" en piezas a pedir); ?todos=true los trae todos (pantalla de
    Proveedores, que también necesita ver/editar los desactivados). */
export async function GET(req: Request) {
  try {
    const todos = new URL(req.url).searchParams.get("todos") === "true";
    const data = await kelatosApiGet<RespuestaProveedores>("/v1/proveedores", { limit: 500, order: "nombre" });
    const proveedores = data.rows.filter((r) => todos || r.activo !== false).map(mapearProveedor);
    return NextResponse.json({ ok: true, proveedores });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = (await req.json()) as ProveedorFormData;
  if (!datos.nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; row: FilaProveedorSql }>("/v1/proveedores", {
      proveedor_id: generarProveedorId(datos.nombre),
      nombre: datos.nombre.trim(),
      dni_cif: datos.dniCif?.trim() || null,
      direccion_fiscal: datos.direccionFiscal?.trim() || null,
      pais: datos.pais?.trim() || null,
      telefono: datos.telefono?.trim() || null,
      email: datos.email?.trim() || null,
      codigo_interno: datos.codigoInterno?.trim() || null,
      notas: datos.notas?.trim() || null,
      activo: true,
    });
    return NextResponse.json({ ok: true, proveedor: mapearProveedor(resultado.row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
