import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapAlquilerFacturaDetalle } from "@/lib/alquiler-detalle";
import { esSuperadmin } from "@/lib/superadmin";

/**
 * Proxy de lectura de GET /v1/alquileres/:id (kelatos-rep-back), ya usado
 * internamente por /api/alquileres/[id]/facturas — aquí expuesto tal cual
 * para alimentar el modal con tabs (PDF/Enviar + Devolución) de Facturas
 * de Clientes.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; alquiler: Parameters<typeof mapAlquilerFacturaDetalle>[0] }>(
      `/v1/alquileres/${encodeURIComponent(id)}`
    );
    const detalle = mapAlquilerFacturaDetalle(data.alquiler);
    // Mismo motivo que obtenerEquipoNombre() en facturas/route.ts: el
    // nombre del equipo no vive en kelatos_app.alquileres, requiere este
    // segundo GET — sin él, "Duración corregida" (factura-acciones-tabs.tsx)
    // no tenía forma de escribir "Alquiler {equipo} (N meses)" en la línea
    // de la corregida y la generaba sin el nombre del equipo (bug real
    // reportado con PDF real: la corregida salió con solo "Alquiler (1 mes)").
    if (detalle.equipoId) {
      try {
        const { row } = await kelatosApiGet<{ ok: boolean; row: { marca?: string; modelo?: string } }>(
          `/v1/equipos/${encodeURIComponent(detalle.equipoId)}`
        );
        detalle.equipoNombre = `${row.marca || ""} ${row.modelo || ""}`.trim() || "Equipo";
      } catch {
        detalle.equipoNombre = "Equipo";
      }
    }
    return NextResponse.json({ ok: true, detalle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/** Borrado real desde el dashboard — restringido al superadmin. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { motivo?: string };
  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  if (!motivo) return NextResponse.json({ ok: false, error: "El motivo es obligatorio" }, { status: 400 });

  try {
    const data = await kelatosApiPost<{ ok: boolean; eliminado: boolean; tieneFacturaReal: boolean }>(
      `/v1/alquileres/${encodeURIComponent(id)}`,
      { usuario: email, motivo },
      "DELETE"
    );
    return NextResponse.json({ ok: true, eliminado: data.eliminado, tieneFacturaReal: data.tieneFacturaReal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
