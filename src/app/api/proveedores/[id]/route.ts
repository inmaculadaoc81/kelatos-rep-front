import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearProveedor, type ProveedorFormData } from "@/lib/proveedores";

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const datos = (await req.json()) as Partial<ProveedorFormData> & { activo?: boolean };
  if (datos.nombre !== undefined && !datos.nombre.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  const cambios: Record<string, unknown> = {};
  if (datos.nombre !== undefined) cambios.nombre = datos.nombre.trim();
  if (datos.dniCif !== undefined) cambios.dni_cif = datos.dniCif.trim() || null;
  if (datos.direccionFiscal !== undefined) cambios.direccion_fiscal = datos.direccionFiscal.trim() || null;
  if (datos.pais !== undefined) cambios.pais = datos.pais.trim() || null;
  if (datos.telefono !== undefined) cambios.telefono = datos.telefono.trim() || null;
  if (datos.email !== undefined) cambios.email = datos.email.trim() || null;
  if (datos.codigoInterno !== undefined) cambios.codigo_interno = datos.codigoInterno.trim() || null;
  if (datos.notas !== undefined) cambios.notas = datos.notas.trim() || null;
  if (datos.activo !== undefined) cambios.activo = datos.activo;

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; row: FilaProveedorSql }>(`/v1/proveedores/${encodeURIComponent(id)}`, cambios, "PATCH");
    return NextResponse.json({ ok: true, proveedor: mapearProveedor(resultado.row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
