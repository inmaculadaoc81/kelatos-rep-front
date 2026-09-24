import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { dentroDelLimite, ipDe, pareceAutomatizado } from "@/lib/publico-seguridad";

export const dynamic = "force-dynamic";

/**
 * Desafío de prueba de esfuerzo: el navegador lo resuelve antes de pedir un
 * código de formulario (ver src/lib/pow.ts). Sin sesión.
 */
export async function GET(req: Request) {
  if (pareceAutomatizado(req)) return NextResponse.json({ ok: false, error: "Solicitud no permitida" }, { status: 403 });
  if (!dentroDelLimite(req, "desafio", 30, 10 * 60_000)) return NextResponse.json({ ok: false, error: "Demasiados intentos. Inténtalo de nuevo más tarde." }, { status: 429 });
  try {
    const data = await kelatosApiGet<{ ok: boolean; desafio: string; bits: number }>("/v1/valoracion-desafio", { ip: ipDe(req) });
    return NextResponse.json({ ok: true, desafio: data.desafio, bits: data.bits });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.startsWith("Demasiados intentos")) return NextResponse.json({ ok: false, error: msg }, { status: 429 });
    return NextResponse.json({ ok: false, error: "No se pudo preparar el formulario. Inténtalo de nuevo en unos minutos." }, { status: 502 });
  }
}
