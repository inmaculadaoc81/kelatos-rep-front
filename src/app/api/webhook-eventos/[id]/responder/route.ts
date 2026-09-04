import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** POST — responde por correo a la consulta del cliente de un evento del webhook de presupuestos. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { mensaje } = (await req.json()) as { mensaje: string };
  if (!mensaje?.trim()) return NextResponse.json({ ok: false, error: "El mensaje es obligatorio" }, { status: 400 });

  try {
    await kelatosApiPost(`/v1/webhook-eventos/${encodeURIComponent(id)}/responder`, { usuario, mensaje: mensaje.trim() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
