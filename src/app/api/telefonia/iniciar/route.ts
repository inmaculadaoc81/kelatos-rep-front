import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Crea la llamada y devuelve el pase para entrar a la sala. El usuario sale SIEMPRE de la sesión. */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { telefono, resguardo } = (await req.json().catch(() => ({}))) as { telefono?: string; resguardo?: string };
  try {
    const d = await kelatosApiPost<Record<string, unknown>>("/v1/llamadas/iniciar", { usuario, telefono: String(telefono || ""), resguardo: String(resguardo || "") });
    return NextResponse.json(d);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
