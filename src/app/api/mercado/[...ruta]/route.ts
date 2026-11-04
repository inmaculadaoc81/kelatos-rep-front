import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

/** Proxy hacia /v1/mercado/* (estudio de mercado de Redes sociales): solo lectura y solo administradores. */
export async function GET(req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!(session?.user?.role === "admin" || esSuperadmin(email))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { ruta } = await ctx.params;
  const valida = (ruta.length === 1 && (ruta[0] === "general" || ruta[0] === "competencia")) || (ruta.length === 2 && ruta[0] === "organizacion" && /^\d{1,9}$/.test(ruta[1]));
  if (!valida) return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  const dias = new URL(req.url).searchParams.get("dias");
  try {
    return NextResponse.json(await kelatosApiGet(`/v1/mercado/${ruta.join("/")}${dias && /^\d{1,3}$/.test(dias) ? `?dias=${dias}` : ""}`));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/** Recomendaciones con IA (cuestan dinero, por eso solo al pulsar el botón): POST recomendaciones { organizacion?, dias?, refrescar? }. */
export async function POST(req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!(session?.user?.role === "admin" || esSuperadmin(email))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { ruta } = await ctx.params;
  if (!(ruta.length === 1 && ruta[0] === "recomendaciones")) return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { organizacion?: unknown; dias?: unknown; refrescar?: unknown };
  const cuerpo = {
    organizacion: typeof b.organizacion === "string" && /^\d{1,9}$/.test(b.organizacion) ? b.organizacion : null,
    dias: typeof b.dias === "number" ? b.dias : 90,
    refrescar: b.refrescar === true,
  };
  try {
    return NextResponse.json(await kelatosApiPost("/v1/mercado/recomendaciones", cuerpo));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
