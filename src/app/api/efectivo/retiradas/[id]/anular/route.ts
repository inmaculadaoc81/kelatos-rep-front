import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Anula (no borra) una retirada registrada por error — solo superadmin. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  try {
    const { id } = await params;
    const body = (await req.json()) as { motivo?: unknown };
    await kelatosApiPost<{ ok: boolean }>(`/v1/efectivo/retiradas/${encodeURIComponent(id)}/anular`, { usuario: email, motivo: body.motivo });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
