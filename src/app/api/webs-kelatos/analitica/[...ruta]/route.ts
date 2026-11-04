import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

/** Proxy hacia /v1/webs-kelatos/analitica/* (analítica web de «Webs Kelatos»): solo administradores. */
async function acceso() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  return session?.user?.role === "admin" || esSuperadmin(email) ? email : null;
}

function rutaValida(ruta: string[]) {
  return ruta.length >= 1 && ruta.length <= 3 && ruta.every((s) => /^[A-Za-z0-9_-]{1,40}$/.test(s));
}

export async function GET(req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  if (!(await acceso())) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { ruta } = await ctx.params;
  if (!rutaValida(ruta)) return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  const dias = new URL(req.url).searchParams.get("dias");
  try {
    const data = await kelatosApiGet(`/v1/webs-kelatos/analitica/${ruta.join("/")}${dias ? `?dias=${encodeURIComponent(dias)}` : ""}`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/** Solo se permite asignar el dominio de una web: PUT sitio/:id/dominio. */
export async function PUT(req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  if (!(await acceso())) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { ruta } = await ctx.params;
  if (!(rutaValida(ruta) && ruta.length === 3 && ruta[0] === "sitio" && /^\d+$/.test(ruta[1]) && ruta[2] === "dominio")) {
    return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as { dominio?: unknown };
  try {
    const data = await kelatosApiPost(`/v1/webs-kelatos/analitica/sitio/${ruta[1]}/dominio`, { dominio: typeof body.dominio === "string" ? body.dominio : "" }, "PUT");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
