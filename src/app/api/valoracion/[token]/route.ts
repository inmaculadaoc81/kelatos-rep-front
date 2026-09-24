import { NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { esJson, ipDe, origenPropio } from "@/lib/publico-seguridad";

export const dynamic = "force-dynamic";

/**
 * Formulario PÚBLICO de valoración (clientes que puntúan mal la encuesta).
 * Sin sesión: la única autoridad es el token del enlace, de un solo uso, que
 * valida el backend. Aquí solo se reenvían campos conocidos y se limita el
 * tamaño; el navegador del cliente nunca habla con el backend directamente.
 */

const TOKEN_VALIDO = /^[A-Za-z0-9_-]{20,64}$/;
const MAX_BYTES = 8 * 1024;

// Solo se muestran al cliente los mensajes que sabemos que son seguros.
const MENSAJES_SEGUROS = [
  "Escribe un correo electrónico válido",
  "Cuéntanos qué motivo o escribe un comentario",
  "Este enlace ya se ha usado",
  "Este enlace ha caducado",
  "Este enlace no es válido",
  "Con este correo ya se ha enviado una valoración",
  "Demasiados intentos. Inténtalo de nuevo más tarde.",
  "Espera unos segundos antes de enviar el formulario",
  "Inicia sesión con Google para enviar tu valoración",
  "No se pudo verificar tu cuenta de Google. Inicia sesión de nuevo.",
  "Tu cuenta de Google no tiene un correo verificado",
  "Tu cuenta de Google no tiene un correo válido",
];


export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_VALIDO.test(token)) return NextResponse.json({ ok: true, estado: "invalido" });
  try {
    const data = await kelatosApiGet<{ ok: boolean; estado: string; anonimo?: boolean; googleClientId?: string | null; nombre?: string | null; servicio?: string | null; motivos?: { id: string; etiqueta: string }[] }>(
      `/v1/valoracion/${token}`,
      { ip: ipDe(req) }
    );
    return NextResponse.json({ ok: true, estado: data.estado, anonimo: data.anonimo === true, googleClientId: data.googleClientId ?? null, nombre: data.nombre ?? null, servicio: data.servicio ?? null, motivos: data.motivos ?? [] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (MENSAJES_SEGUROS.includes(msg)) return NextResponse.json({ ok: false, error: msg }, { status: 429 });
    return NextResponse.json({ ok: false, error: "No se pudo cargar el formulario. Inténtalo de nuevo en unos minutos." }, { status: 502 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!origenPropio(req)) return NextResponse.json({ ok: false, error: "Solicitud no permitida" }, { status: 403 });
  if (!esJson(req)) return NextResponse.json({ ok: false, error: "Solicitud no válida" }, { status: 415 });
  if (!TOKEN_VALIDO.test(token)) return NextResponse.json({ ok: false, error: "Este enlace no es válido" }, { status: 404 });

  const crudo = await req.text();
  if (crudo.length > MAX_BYTES) return NextResponse.json({ ok: false, error: "El mensaje es demasiado largo" }, { status: 413 });
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(crudo) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud no válida" }, { status: 400 });
  }

  try {
    await kelatosApiPost(`/v1/valoracion/${token}`, {
      email: typeof b.email === "string" ? b.email.slice(0, 254) : "",
      credential: typeof b.credential === "string" ? b.credential.slice(0, 4096) : "",
      motivos: Array.isArray(b.motivos) ? b.motivos.filter((m) => typeof m === "string").slice(0, 10) : [],
      comentario: typeof b.comentario === "string" ? b.comentario.slice(0, 1500) : "",
      contactar: b.contactar === true,
      nombre: typeof b.nombre === "string" ? b.nombre.slice(0, 120) : "",
      telefono: typeof b.telefono === "string" ? b.telefono.slice(0, 30) : "",
      resguardo: typeof b.resguardo === "string" ? b.resguardo.slice(0, 40) : "",
      website: typeof b.website === "string" ? b.website.slice(0, 100) : "",
      ip: ipDe(req),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (MENSAJES_SEGUROS.includes(msg)) return NextResponse.json({ ok: false, error: msg }, { status: 409 });
    return NextResponse.json({ ok: false, error: "No se pudo enviar. Inténtalo de nuevo en unos minutos." }, { status: 502 });
  }
}
