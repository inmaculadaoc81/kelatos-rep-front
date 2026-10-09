import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { TarjetasImporteApi } from "@/lib/tarjetas";

/** Declara (o corrige) el importe que confirma el banco para un día —
    cualquier empleado con sesión. `usuario` se resuelve aquí desde la
    sesión, nunca se confía en lo que mande el cliente. */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email || "";
  if (!email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const body = (await req.json()) as { fecha?: unknown; importe?: unknown; notas?: unknown };
    const data = await kelatosApiPost<{ ok: boolean; importe: TarjetasImporteApi }>("/v1/tarjetas/importes", {
      usuario: email,
      fecha: body.fecha,
      importe: body.importe,
      notas: body.notas,
    });
    return NextResponse.json({ ok: true, importe: data.importe });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
