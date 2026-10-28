import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { COOKIE_EQUIPO_LOCAL, ipDelClienteDe } from "@/lib/acceso-local";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.KELATOS_API_BASE_URL;
const TOKEN = process.env.KELATOS_API_TOKEN;

async function api(path: string, cuerpo?: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: cuerpo === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, ...(cuerpo === undefined ? {} : { "Content-Type": "application/json" }) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

/**
 * Solicitud de equipo. Cuando la cuenta restringida (hoy soporte@kelatos.com) se usa desde un navegador, esta ruta le da una marca
 * «pendiente» si no tiene ninguna, o anota su uso si ya la tiene. Un administrador aprueba o rechaza la marca desde «Equipos del local».
 * Hasta que se apruebe, ese navegador solo entra si el modo no es «bloquear» (ver src/lib/acceso-local.ts). Cualquier otra cuenta recibe
 * `aplica: false` y no se toca nada.
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!BASE_URL || !TOKEN) return NextResponse.json({ ok: false, error: "No disponible" }, { status: 503 });
  try {
    const cfg = await api("/v1/seguridad/acceso-local/config");
    if (!cfg.data.ok || String(cfg.data.cuenta || "").toLowerCase() !== email) return NextResponse.json({ ok: true, aplica: false });

    const cookieActual = (req.headers.get("cookie") || "").split(";").map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE_EQUIPO_LOCAL}=`))?.slice(COOKIE_EQUIPO_LOCAL.length + 1);
    const r = await api("/v1/seguridad/acceso-local/equipos/solicitud", {
      email, ip: ipDelClienteDe(req), ua: req.headers.get("user-agent") || "", token: cookieActual,
    });
    if (!r.data.ok) return NextResponse.json({ ok: false, error: String(r.data.error || "No se pudo registrar") }, { status: r.status === 429 ? 429 : 502 });
    const resp = NextResponse.json({ ok: true, aplica: true, estado: r.data.estado });
    if (typeof r.data.token === "string") {
      resp.cookies.set(COOKIE_EQUIPO_LOCAL, r.data.token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 400 });
    }
    return resp;
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo registrar" }, { status: 502 });
  }
}
