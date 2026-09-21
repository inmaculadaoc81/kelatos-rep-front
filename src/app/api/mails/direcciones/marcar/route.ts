import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";

/** Marca una dirección como inválida (no volver a escribirle) o la rehabilita. Solo superadmin. */
export async function POST(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const b = (await req.json()) as { email?: unknown; invalida?: unknown; motivo?: unknown };
    await kelatosApiPost("/v1/mails/direcciones/marcar", { email: b.email, invalida: b.invalida !== false, motivo: b.motivo, usuario: a.email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
