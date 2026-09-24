import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { COOKIE_DISPOSITIVO, COOKIE_ENVIADA, dentroDelLimite, dispositivoDe, ipDe, leerCookie, opcionesCookie, origenPropio, pareceAutomatizado } from "@/lib/publico-seguridad";

export const dynamic = "force-dynamic";

/**
 * Enlace GENÉRICO del formulario de valoración: la página /valoracion llama
 * aquí al abrirse y recibe un código propio, de un solo uso, con el que se
 * redirige a /valoracion/<código>. Sin sesión; el backend limita cuántos
 * códigos puede pedir una misma IP.
 */

export async function POST(req: Request) {
  if (!origenPropio(req) || pareceAutomatizado(req)) return NextResponse.json({ ok: false, error: "Solicitud no permitida" }, { status: 403 });
  if (!dentroDelLimite(req, "nuevo", 12, 60 * 60_000)) return NextResponse.json({ ok: false, error: "Demasiados intentos. Inténtalo de nuevo más tarde." }, { status: 429 });
  let prueba: { desafio?: unknown; solucion?: unknown } = {};
  try {
    prueba = (await req.json()) as typeof prueba;
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud no válida" }, { status: 400 });
  }
  // Este navegador ya envió una valoración: ni siquiera se pide un código nuevo.
  if (leerCookie(req, COOKIE_ENVIADA)) return NextResponse.json({ ok: false, yaEnviada: true });
  const dispositivo = dispositivoDe(req);
  try {
    const data = await kelatosApiPost<{ ok: boolean; token: string }>("/v1/valoracion-nueva", {
      ip: ipDe(req),
      desafio: typeof prueba.desafio === "string" ? prueba.desafio.slice(0, 80) : "",
      solucion: typeof prueba.solucion === "string" ? prueba.solucion.slice(0, 16) : "",
    });
    const res = NextResponse.json({ ok: true, token: data.token });
    if (dispositivo.nuevo) res.cookies.set(COOKIE_DISPOSITIVO, dispositivo.id, opcionesCookie());
    return res;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.startsWith("Demasiados intentos") || msg.startsWith("El servicio está muy ocupado")) return NextResponse.json({ ok: false, error: msg }, { status: 429 });
    if (msg.startsWith("Verificación no válida") || msg.startsWith("La verificación ha caducado")) return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    return NextResponse.json({ ok: false, error: "No se pudo preparar el formulario. Inténtalo de nuevo en unos minutos." }, { status: 502 });
  }
}
