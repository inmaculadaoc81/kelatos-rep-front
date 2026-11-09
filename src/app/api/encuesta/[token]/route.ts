import { NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { dentroDelLimite, esJson, ipDe, origenPropio, pareceAutomatizado } from "@/lib/publico-seguridad";

export const dynamic = "force-dynamic";

/**
 * Encuesta PÚBLICA de satisfacción (correo de reseña, una sola pregunta). Sin sesión: la autoridad es el token firmado del enlace.
 * Abrir el enlace (GET) NO registra nada; solo la respuesta explícita (POST) se guarda, así los escáneres de correo no falsean datos.
 */
const TOKEN_VALIDO = /^[RA]\d{1,9}-\d{9,11}-[0-9a-f]{24}$/;
const RESPUESTAS = new Set(["muy_bueno", "bueno", "malo", "muy_malo"]);
const MENSAJES_SEGUROS = ["Este enlace ya se ha usado", "Este enlace ha caducado", "Este enlace no es válido", "Elige una de las respuestas", "Demasiados intentos. Inténtalo de nuevo más tarde."];

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_VALIDO.test(token)) return NextResponse.json({ ok: true, estado: "invalido" });
  if (pareceAutomatizado(req)) return NextResponse.json({ ok: false, error: "Solicitud no permitida" }, { status: 403 });
  if (!dentroDelLimite(req, "encuesta-consulta", 60, 10 * 60_000)) return NextResponse.json({ ok: false, error: "Demasiados intentos. Inténtalo de nuevo más tarde." }, { status: 429 });
  try {
    const data = await kelatosApiGet<{ ok: boolean; estado: string; nombre?: string | null; servicio?: string | null; pregunta?: string; opciones?: { id: string; etiqueta: string }[] }>(
      `/v1/encuesta-correo/${token}`,
      { ip: ipDe(req) }
    );
    return NextResponse.json({ ok: true, estado: data.estado, nombre: data.nombre ?? null, servicio: data.servicio ?? null, pregunta: data.pregunta ?? "", opciones: data.opciones ?? [] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (MENSAJES_SEGUROS.includes(msg)) return NextResponse.json({ ok: false, error: msg }, { status: 429 });
    return NextResponse.json({ ok: false, error: "No se pudo cargar la encuesta. Inténtalo de nuevo en unos minutos." }, { status: 502 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!origenPropio(req) || pareceAutomatizado(req)) return NextResponse.json({ ok: false, error: "Solicitud no permitida" }, { status: 403 });
  if (!dentroDelLimite(req, "encuesta-envio", 15, 10 * 60_000)) return NextResponse.json({ ok: false, error: "Demasiados intentos. Inténtalo de nuevo más tarde." }, { status: 429 });
  if (!esJson(req)) return NextResponse.json({ ok: false, error: "Solicitud no válida" }, { status: 415 });
  if (!TOKEN_VALIDO.test(token)) return NextResponse.json({ ok: false, error: "Este enlace no es válido" }, { status: 404 });
  let b: { respuesta?: unknown };
  try {
    b = JSON.parse((await req.text()).slice(0, 2048)) as { respuesta?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud no válida" }, { status: 400 });
  }
  const respuesta = typeof b.respuesta === "string" ? b.respuesta : "";
  if (!RESPUESTAS.has(respuesta)) return NextResponse.json({ ok: false, error: "Elige una de las respuestas" }, { status: 400 });
  try {
    const data = await kelatosApiPost<{ ok: boolean; destino: string; url: string | null; positiva: boolean }>(`/v1/encuesta-correo/${token}`, { respuesta, ip: ipDe(req) });
    return NextResponse.json({ ok: true, destino: data.destino, url: data.url ?? null, positiva: data.positiva === true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (MENSAJES_SEGUROS.includes(msg)) return NextResponse.json({ ok: false, error: msg }, { status: 409 });
    return NextResponse.json({ ok: false, error: "No se pudo enviar. Inténtalo de nuevo en unos minutos." }, { status: 502 });
  }
}
