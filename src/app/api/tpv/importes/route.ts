import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { TpvImporteApi } from "@/lib/tpv";

/** Declara (o corrige) el importe de un día+método — cualquier empleado con
    sesión, no solo superadmin (a diferencia de "Efectivo"). `usuario` se
    resuelve aquí desde la sesión, nunca se confía en lo que mande el
    cliente. */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email || "";
  if (!email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const body = (await req.json()) as { fecha?: unknown; metodo?: unknown; importe?: unknown; notas?: unknown };
    const data = await kelatosApiPost<{ ok: boolean; importe: TpvImporteApi }>("/v1/tpv/importes", {
      usuario: email,
      fecha: body.fecha,
      metodo: body.metodo,
      importe: body.importe,
      notas: body.notas,
    });
    return NextResponse.json({ ok: true, importe: data.importe });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
