import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export const dynamic = "force-dynamic";

/** Proxy de POST /v1/facturas-recibidas/sugerir-categoria — categoría propuesta para el formulario antes de guardar (no guarda nada). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const r = await kelatosApiPost<{ ok: boolean; categoria: string | null; motivo: string | null; coinciden: boolean | null; alternativa: string | null }>("/v1/facturas-recibidas/sugerir-categoria", {
      proveedorId: typeof body.proveedorId === "string" ? body.proveedorId : undefined,
      texto: typeof body.texto === "string" ? body.texto : "",
      hayStock: body.hayStock === true,
      facturaId: typeof body.facturaId === "number" ? body.facturaId : undefined,
      categoriaIA: typeof body.categoriaIA === "string" ? body.categoriaIA : undefined,
    });
    return NextResponse.json({ ok: true, categoria: r.categoria, motivo: r.motivo, coinciden: r.coinciden, alternativa: r.alternativa });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo sugerir la categoría" }, { status: 502 });
  }
}
