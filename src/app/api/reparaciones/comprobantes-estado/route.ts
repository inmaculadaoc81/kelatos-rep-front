import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Estado del comprobante de transferencia de varios resguardos a la vez
    — usado por la tabla "Todas las Reparaciones" para pintar la columna
    de pago sin una petición por fila. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const body = (await req.json()) as { resguardos?: string[] };
  const resguardos = Array.isArray(body.resguardos) ? body.resguardos.filter((r) => typeof r === "string" && r) : [];
  if (!resguardos.length) return NextResponse.json({ ok: true, estados: {} });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; estados: Record<string, "Pendiente" | "Conciliada"> }>(
      "/v1/reparaciones/comprobantes-estado",
      { resguardos }
    );
    return NextResponse.json({ ok: true, estados: resultado.estados });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
