import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";

/** Guarda el código JS de la plantilla y los datos de prueba. Solo superadmin. */
export async function PUT(req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const { tipo } = await params;
    const b = (await req.json()) as { codigo?: unknown; datosPrueba?: unknown };
    await kelatosApiPost(
      `/v1/mails/tipos/${encodeURIComponent(tipo)}/plantilla`,
      { codigo: b.codigo, datosPrueba: b.datosPrueba, usuario: a.email },
      "PUT"
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
