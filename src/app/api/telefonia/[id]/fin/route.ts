import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const { resultado, duracionSeg, esperaSeg } = (await req.json().catch(() => ({}))) as { resultado?: string; duracionSeg?: number; esperaSeg?: number };
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/llamadas/${encodeURIComponent(id)}/fin`, { resultado, duracionSeg, esperaSeg }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
