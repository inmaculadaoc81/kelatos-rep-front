import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { ipDe, origenPropio } from "@/lib/publico-seguridad";

export const dynamic = "force-dynamic";

/**
 * Enlace GENÉRICO del formulario de valoración: la página /valoracion llama
 * aquí al abrirse y recibe un código propio, de un solo uso, con el que se
 * redirige a /valoracion/<código>. Sin sesión; el backend limita cuántos
 * códigos puede pedir una misma IP.
 */

export async function POST(req: Request) {
  if (!origenPropio(req)) return NextResponse.json({ ok: false, error: "Solicitud no permitida" }, { status: 403 });
  try {
    const data = await kelatosApiPost<{ ok: boolean; token: string }>("/v1/valoracion-nueva", { ip: ipDe(req) });
    return NextResponse.json({ ok: true, token: data.token });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.startsWith("Demasiados intentos")) return NextResponse.json({ ok: false, error: msg }, { status: 429 });
    return NextResponse.json({ ok: false, error: "No se pudo preparar el formulario. Inténtalo de nuevo en unos minutos." }, { status: 502 });
  }
}
