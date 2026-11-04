import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Comprueba en vivo, desde el formulario, si el número de transferencia escrito sirve para emitir el documento. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const r = await kelatosApiGet<{ ok: boolean; valida: boolean; motivo: string | null; transferencia: unknown }>(`/v1/comprobantes-transferencia/validar/${encodeURIComponent(id)}`);
    return NextResponse.json({ ok: true, valida: r.valida, motivo: r.motivo, transferencia: r.transferencia });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
