import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { JustificanteEfectivo } from "@/lib/efectivo";

/** Adjunta un justificante (factura o ticket de compra, PDF o foto) a una retirada — solo superadmin.
    El frontend manda el archivo ya en base64; el backend lo guarda en Drive. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  try {
    const { id } = await params;
    const body = (await req.json()) as { base64?: unknown; mimeType?: unknown; nombre?: unknown };
    if (!body.base64 || !body.mimeType) return NextResponse.json({ ok: false, error: "Faltan datos del archivo" }, { status: 400 });
    const data = await kelatosApiPost<{ ok: boolean; justificante: JustificanteEfectivo }>(`/v1/efectivo/retiradas/${encodeURIComponent(id)}/justificantes`, {
      usuario: email,
      base64: body.base64,
      mimeType: body.mimeType,
      nombre: body.nombre,
    });
    return NextResponse.json({ ok: true, justificante: data.justificante });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
