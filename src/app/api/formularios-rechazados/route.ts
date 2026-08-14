import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

export interface FormularioRechazado {
  id: number;
  fecha: string | null;
  resguardo: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  equipo_modelo: string | null;
  sintoma: string | null;
  motivo: string | null;
  rechazado_por: string | null;
}

/**
 * Lista de solicitudes de "Formulario Pendiente" rechazadas — capacidad
 * nueva sin equivalente en el original (ni Index.html ni la versión
 * anterior de este puerto exponían kelatos_app.formularios_rechazados en
 * ningún sitio; el rechazo se guardaba ahí pero nadie podía volver a
 * consultarlo). Reutiliza la ruta genérica GET /v1/:table ya existente.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const resultado = await kelatosApiGet<{ ok: boolean; rows: FormularioRechazado[] }>(
      "/v1/formularios_rechazados",
      { order: "fecha", direction: "desc", limit: 200 }
    );
    return NextResponse.json({ ok: true, formularios: resultado.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
