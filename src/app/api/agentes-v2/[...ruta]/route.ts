import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { origenPropio } from "@/lib/publico-seguridad";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.KELATOS_API_BASE_URL;
const TOKEN = process.env.KELATOS_API_TOKEN;

/** Solo estos recursos de /v1/marketing se exponen al navegador. */
const RECURSOS = new Set(["overview", "departments", "approvals", "runs", "calendar", "campaigns", "metrics", "reports", "integrations", "llm-config", "costs", "system", "cmo", "analytics", "seo", "live", "llm-stats"]);

/**
 * Proxy hacia /v1/marketing/* (AI Marketing System). Solo administradores. La identidad se toma de
 * la sesión en el servidor y se inyecta como `usuario`; nunca viene del navegador.
 */
async function manejar(req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || (session?.user?.role !== "admin" && !esSuperadmin(email))) {
    return NextResponse.json({ ok: false, error: "Solo los administradores pueden acceder a Agentes V2" }, { status: 403 });
  }
  if (!BASE_URL || !TOKEN) return NextResponse.json({ ok: false, error: "API no configurada" }, { status: 500 });

  const { ruta } = await ctx.params;
  if (!ruta.length || ruta.length > 4 || !ruta.every((s) => /^[A-Za-z0-9_-]{1,60}$/.test(s)) || !RECURSOS.has(ruta[0])) {
    return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  }
  const metodo = req.method.toUpperCase();
  if (metodo !== "GET" && !origenPropio(req)) {
    return NextResponse.json({ ok: false, error: "Solicitud no permitida" }, { status: 403 });
  }

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

  try {
    const res = await fetch(`${BASE_URL}/v1/marketing/${ruta.join("/")}?${qs.toString()}`, { method: metodo, headers, body: cuerpo, cache: "no-store" });
    const texto = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(texto);
    } catch {
      data = { ok: false, error: texto.slice(0, 200) || `Error ${res.status}` };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export const GET = manejar;
export const PUT = manejar;
export const PATCH = manejar;
export const POST = manejar;
