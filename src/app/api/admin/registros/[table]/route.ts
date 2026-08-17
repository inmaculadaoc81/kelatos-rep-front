import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { ENTIDADES_ADMIN } from "@/lib/admin-registros";

/**
 * Lectura genérica para el panel de Admin — reutiliza GET /v1/:table del
 * backend (mismo CRUD genérico ya usado internamente para reconciliación),
 * pero restringido aquí a las 10 tablas del listado de Admin y a las
 * cuentas superadmin. Solo lectura: el borrado vive en
 * /api/admin/registros/[table]/[id] (DELETE) o en la ruta dedicada de cada
 * entidad (reparaciones/clientes/alquileres).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { table } = await params;
  const entidad = ENTIDADES_ADMIN.find((e) => e.tabla === table);
  if (!entidad) return NextResponse.json({ ok: false, error: `Tabla no soportada: ${table}` }, { status: 404 });

  try {
    const data = await kelatosApiGet<{ ok: boolean; rows: Record<string, unknown>[]; count: number }>(
      `/v1/${entidad.tabla}`,
      { limit: 200, order: entidad.pk, direction: "desc" }
    );
    return NextResponse.json({ ok: true, rows: data.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
