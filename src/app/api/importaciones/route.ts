import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearImportacion, type FilaImportacionSql } from "@/lib/importaciones";

const PARAMETROS = ["q", "estadoPago", "estadoRevision", "desde", "hasta", "limit", "offset"];

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const params: Record<string, string> = {};
    for (const k of PARAMETROS) {
      const v = p.get(k);
      if (v) params[k] = v;
    }
    const data = await kelatosApiGet<{
      ok: boolean;
      total: number;
      pendientesRevision: number;
      pendientesPago: number;
      sumaIva: number;
      sumaDerechos: number;
      importaciones: FilaImportacionSql[];
    }>("/v1/importaciones", params);
    return NextResponse.json({
      ok: true,
      total: data.total,
      pendientesRevision: data.pendientesRevision,
      pendientesPago: data.pendientesPago,
      sumaIva: data.sumaIva,
      sumaDerechos: data.sumaDerechos,
      importaciones: data.importaciones.map(mapearImportacion),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const datos = await req.json();
  try {
    const data = await kelatosApiPost<{ ok: boolean; importacion: FilaImportacionSql }>("/v1/importaciones", { ...datos, usuario });
    return NextResponse.json({ ok: true, importacion: mapearImportacion(data.importacion) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
