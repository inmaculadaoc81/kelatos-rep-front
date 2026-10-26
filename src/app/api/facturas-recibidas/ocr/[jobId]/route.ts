import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import type { FacturaOcrExtraido, ArticuloFacturaEmparejado } from "../route";

export const dynamic = "force-dynamic";

/** Consulta el estado de una lectura de factura en segundo plano (ver POST /api/facturas-recibidas/ocr): "procesando" mientras la
    IA trabaja, "listo" con los datos leídos, "error" con el motivo. */
export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { jobId } = await params;
  if (!/^[A-Za-z0-9-]{8,64}$/.test(jobId)) return NextResponse.json({ ok: false, error: "Identificador no válido" }, { status: 400 });

  try {
    const data = await kelatosApiGet<{
      ok: boolean;
      estado: "procesando" | "listo" | "error";
      error?: string;
      extraido?: FacturaOcrExtraido | null;
      proveedorIdSugerido?: string | null;
      proveedorCreado?: boolean;
      textoOcr?: string;
      articulosEmparejados?: ArticuloFacturaEmparejado[];
    }>(`/v1/facturas-recibidas/ocr/${encodeURIComponent(jobId)}`);

    if (data.estado === "listo") {
      return NextResponse.json({
        ok: true,
        estado: "listo",
        extraido: data.extraido ?? null,
        proveedorIdSugerido: data.proveedorIdSugerido ?? null,
        proveedorCreado: !!data.proveedorCreado,
        textoOcr: data.textoOcr ?? "",
        articulosEmparejados: data.articulosEmparejados || [],
      });
    }
    if (data.estado === "error") return NextResponse.json({ ok: true, estado: "error", error: data.error || "No se pudo leer la factura" });
    return NextResponse.json({ ok: true, estado: "procesando" });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo consultar la lectura" }, { status: 502 });
  }
}
