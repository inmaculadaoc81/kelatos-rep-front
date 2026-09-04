import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    await kelatosApiPost<{ ok: boolean; eliminado: boolean }>(`/v1/stock-piezas/enlaces/${encodeURIComponent(id)}`, {}, "DELETE");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
