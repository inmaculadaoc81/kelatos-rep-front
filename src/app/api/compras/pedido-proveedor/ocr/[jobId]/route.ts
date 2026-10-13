import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { esCuentaEmpleadosRestringida } from "@/lib/superadmin";
import type { LineaPedidoProveedorLeida } from "../route";

export const dynamic = "force-dynamic";

/** Consulta el estado de un análisis de pedido que corre en segundo plano
    (ver POST /api/compras/pedido-proveedor/ocr). "procesando" mientras la IA
    trabaja; "listo" con las líneas leídas; "error" con el motivo. */
export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (esCuentaEmpleadosRestringida(session.user.email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { jobId } = await params;
  if (!/^[A-Za-z0-9-]{8,64}$/.test(jobId)) return NextResponse.json({ ok: false, error: "Identificador no válido" }, { status: 400 });

  try {
    const data = await kelatosApiGet<{
      ok: boolean;
      estado: "procesando" | "listo" | "error";
      segundos?: number;
      error?: string;
      numeroPedidoGlobal?: string | null;
      lineas?: LineaPedidoProveedorLeida[];
      proveedorIdSugerido?: string | null;
      proveedorCreado?: boolean;
    }>(`/v1/compras/pedido-proveedor/ocr/${encodeURIComponent(jobId)}`);

    if (data.estado === "listo") {
      return NextResponse.json({
        ok: true,
        estado: "listo",
        numeroPedidoGlobal: data.numeroPedidoGlobal ?? null,
        lineas: data.lineas || [],
        proveedorIdSugerido: data.proveedorIdSugerido ?? null,
        proveedorCreado: !!data.proveedorCreado,
      });
    }
    if (data.estado === "error") return NextResponse.json({ ok: true, estado: "error", error: data.error || "No se pudo leer el pedido" });
    return NextResponse.json({ ok: true, estado: "procesando", segundos: data.segundos ?? 0 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo consultar el análisis" }, { status: 502 });
  }
}
