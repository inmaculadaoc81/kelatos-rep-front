import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { origenPropio } from "@/lib/publico-seguridad";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.KELATOS_API_BASE_URL;
const TOKEN = process.env.KELATOS_API_TOKEN;

/**
 * Proxy único hacia /v1/contabilidad/* del backend. La identidad NUNCA viene
 * del navegador: se toma de la sesión en el servidor y se inyecta como
 * `usuario`. Si CONTABILIDAD_FIRMA_SECRET está definida (aquí y en el VPS),
 * además se firma con HMAC para que el token compartido por sí solo no permita
 * actuar como administrador.
 */
async function manejar(req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || (session?.user?.role !== "admin" && !esSuperadmin(email))) {
    return NextResponse.json({ ok: false, error: "Solo los administradores pueden acceder a Contabilidad" }, { status: 403 });
  }
  if (!BASE_URL || !TOKEN) return NextResponse.json({ ok: false, error: "API no configurada" }, { status: 500 });

  const { ruta } = await ctx.params;
  if (!ruta.length || ruta.length > 4 || !ruta.every((s) => /^[A-Za-z0-9_-]{1,40}$/.test(s))) {
    return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  }
  const metodo = req.method.toUpperCase();
  if (metodo !== "GET" && !origenPropio(req)) {
    return NextResponse.json({ ok: false, error: "Solicitud no permitida" }, { status: 403 });
  }

  const path = `/v1/contabilidad/${ruta.join("/")}`;
  const qs = new URL(req.url).searchParams;
  qs.delete("usuario");
  const headers: Record<string, string> = { Authorization: `Bearer ${TOKEN}` };
  let cuerpo: string | undefined;
  if (metodo === "GET") {
    qs.set("usuario", email);
  } else {
    let entrada: Record<string, unknown> = {};
    try {
      const j = await req.json();
      if (j && typeof j === "object" && !Array.isArray(j)) entrada = j as Record<string, unknown>;
    } catch {
      /* cuerpo vacío */
    }
    cuerpo = JSON.stringify({ ...entrada, usuario: email });
    headers["Content-Type"] = "application/json";
  }
  const secreto = process.env.CONTABILIDAD_FIRMA_SECRET;
  if (secreto) {
    const ts = String(Date.now());
    headers["x-kelatos-ts"] = ts;
    headers["x-kelatos-firma"] = createHmac("sha256", secreto).update(`${email}|${ts}|${metodo}|${path}`).digest("hex");
  }

  try {
    const res = await fetch(`${BASE_URL}${path}${qs.toString() ? `?${qs.toString()}` : ""}`, { method: metodo, headers, body: cuerpo, cache: "no-store" });
    const texto = await res.text();
    let datos: unknown;
    try {
      datos = texto ? JSON.parse(texto) : {};
    } catch {
      return NextResponse.json({ ok: false, error: res.status === 429 ? "Demasiadas solicitudes; espera un momento." : `Respuesta inválida del servidor (HTTP ${res.status})` }, { status: 502 });
    }
    return NextResponse.json(datos, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo conectar con el servidor contable" }, { status: 502 });
  }
}

export const GET = manejar;
export const POST = manejar;
export const PUT = manejar;
