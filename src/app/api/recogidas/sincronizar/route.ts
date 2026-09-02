import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Pull manual del Google Calendar de kelatosinformatica@gmail.com — botón
 * "Actualizar" de Recogidas a Domicilio. Solo importa eventos "RECOGIDA:"
 * nuevos (nunca sobrescribe filas ya editadas); complementa el tick
 * periódico de 10 min que corre siempre en el backend.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; nuevos: number; recogidasEnCalendar: number }>(
      "/v1/recogidas/sincronizar",
      {}
    );
    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
