import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** PATCH — marca un evento del webhook como leído (equivalente puntual a apiMarcarEventosLeidos, que en el original marca todos a la vez). */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  try {
    await kelatosApiPost(`/v1/webhook_eventos/${encodeURIComponent(id)}`, { leida: true }, "PATCH");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
