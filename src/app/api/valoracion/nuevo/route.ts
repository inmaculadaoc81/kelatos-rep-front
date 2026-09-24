import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { COOKIE_DISPOSITIVO, COOKIE_ENVIADA, dispositivoDe, ipDe, leerCookie, opcionesCookie, origenPropio } from "@/lib/publico-seguridad";

export const dynamic = "force-dynamic";

/**
 * Enlace GENÉRICO del formulario de valoración: la página /valoracion llama
 * aquí al abrirse y recibe un código propio, de un solo uso, con el que se
 * redirige a /valoracion/<código>. Sin sesión; el backend limita cuántos
 * códigos puede pedir una misma IP.
 */

export async function POST(req: Request) {
  if (!origenPropio(req)) return NextResponse.json({ ok: false, error: "Solicitud no permitida" }, { status: 403 });
  // Este navegador ya envió una valoración: ni siquiera se pide un código nuevo.
  if (leerCookie(req, COOKIE_ENVIADA)) return NextResponse.json({ ok: false, yaEnviada: true });
  const dispositivo = dispositivoDe(req);
  try {
    const data = await kelatosApiPost<{ ok: boolean; token: string }>("/v1/valoracion-nueva", { ip: ipDe(req) });
    const res = NextResponse.json({ ok: true, token: data.token });
    if (dispositivo.nuevo) res.cookies.set(COOKIE_DISPOSITIVO, dispositivo.id, opcionesCookie());
    return res;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.startsWith("Demasiados intentos")) return NextResponse.json({ ok: false, error: msg }, { status: 429 });
    return NextResponse.json({ ok: false, error: "No se pudo preparar el formulario. Inténtalo de nuevo en unos minutos." }, { status: 502 });
  }
}
