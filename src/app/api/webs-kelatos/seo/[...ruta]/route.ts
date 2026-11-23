import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { tienePermiso } from "@/lib/permisos";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

export const maxDuration = 60;

/** Proxy hacia /v1/seo/panel/* (Panel SEO de «Webs Kelatos»): solo quien tiene acceso a Webs Kelatos. */
async function acceso() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  return (await tienePermiso(email, "webs_kelatos.ver", session?.user?.role === "admin" || esSuperadmin(email))) ? email : null;
}
const rutaValida = (ruta: string[]) => ruta.length >= 1 && ruta.length <= 3 && ruta.every((s) => /^[A-Za-z0-9_-]{1,40}$/.test(s));
const fallo = (e: unknown) => NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error desconocido" }, { status: 502 });

export async function GET(_req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  if (!(await acceso())) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { ruta } = await ctx.params;
  if (!rutaValida(ruta)) return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  try { return NextResponse.json(await kelatosApiGet(`/v1/seo/panel/${ruta.join("/")}`)); } catch (e) { return fallo(e); }
}

export async function POST(_req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  if (!(await acceso())) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { ruta } = await ctx.params;
  if (!rutaValida(ruta)) return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  try { return NextResponse.json(await kelatosApiPost(`/v1/seo/panel/${ruta.join("/")}`, {})); } catch (e) { return fallo(e); }
}

export async function PUT(req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  const email = await acceso();
  if (!email) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { ruta } = await ctx.params;
  if (!rutaValida(ruta)) return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { clave?: string; estado?: string | null; nota?: string };
  try { return NextResponse.json(await kelatosApiPost(`/v1/seo/panel/${ruta.join("/")}`, { clave: body.clave, estado: body.estado ?? null, nota: body.nota, usuario: email }, "PUT")); } catch (e) { return fallo(e); }
}
