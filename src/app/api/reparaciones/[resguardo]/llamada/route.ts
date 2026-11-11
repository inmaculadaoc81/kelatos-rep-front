import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

// Deja constancia en el historial de que el usuario pulsó «Llamar» al cliente (la llamada en sí la hace el teléfono / la app de llamadas).
export async function POST(req: Request, { params }: { params: Promise<{ resguardo: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { resguardo } = await params;
  const { telefono } = (await req.json().catch(() => ({}))) as { telefono?: string };
  try {
    await kelatosApiPost(`/v1/reparaciones/${encodeURIComponent(resguardo)}/llamada`, { usuario, telefono: String(telefono || "") });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
