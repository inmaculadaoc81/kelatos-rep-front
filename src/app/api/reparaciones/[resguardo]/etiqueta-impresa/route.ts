import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Proxy de POST /v1/reparaciones/:resguardo/etiqueta-impresa — registra
    que la etiqueta física (datos de Kelatos + código de barras) se
    imprimió de verdad. Lo llama el navegador tras confirmar con el puente
    local que mandó los bytes a la impresora. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; etiquetaImpresaEn: string }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/etiqueta-impresa`,
      {}
    );
    return NextResponse.json({ ok: true, etiquetaImpresaEn: resultado.etiquetaImpresaEn });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
