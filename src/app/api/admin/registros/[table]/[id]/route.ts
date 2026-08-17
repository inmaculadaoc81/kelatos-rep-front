import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { ENTIDADES_ADMIN } from "@/lib/admin-registros";

/**
 * Vista de fila completa (todas las columnas, sin mapear) para la "vista
 * de tabla" del panel de Admin — reutiliza GET /v1/:table/:id, igual que
 * la lista. Ver route.ts (carpeta padre) para el resto del contexto.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { table, id } = await params;
  const entidad = ENTIDADES_ADMIN.find((e) => e.tabla === table);
  if (!entidad) return NextResponse.json({ ok: false, error: `Tabla no soportada: ${table}` }, { status: 404 });

  try {
    const data = await kelatosApiGet<{ ok: boolean; row: Record<string, unknown> }>(
      `/v1/${entidad.tabla}/${encodeURIComponent(id)}`
    );
    return NextResponse.json({ ok: true, row: data.row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/**
 * Borrado real, auditado — solo para las 7 tablas que NO tienen ya su
 * propio endpoint dedicado (reparaciones/clientes/alquileres usan
 * apiRutaDelete() hacia sus rutas existentes, ver admin-registros.ts, y
 * nunca llegan a llamar aquí). Llama al nuevo DELETE
 * /v1/admin/registros/:table/:id del backend (server.js), que valida
 * superadmin+motivo otra vez y audita en registros_eliminados.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { table, id } = await params;
  const entidad = ENTIDADES_ADMIN.find((e) => e.tabla === table);
  if (!entidad) return NextResponse.json({ ok: false, error: `Tabla no soportada: ${table}` }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { motivo?: string };
  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  if (!motivo) return NextResponse.json({ ok: false, error: "El motivo es obligatorio" }, { status: 400 });

  try {
    await kelatosApiPost<{ ok: boolean; eliminado: boolean }>(
      `/v1/admin/registros/${entidad.tabla}/${encodeURIComponent(id)}`,
      { usuario: email, motivo },
      "DELETE"
    );
    return NextResponse.json({ ok: true, eliminado: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
