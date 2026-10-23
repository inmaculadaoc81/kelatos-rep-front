import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { puedeVerProspeccion } from "@/lib/prospeccion";

// Proxy único hacia /v1/prospeccion/* del API (solo administradores). Rutas permitidas, por lista cerrada.
const PERMITIDAS = [/^config$/, /^resumen$/, /^envios$/, /^envios\/\d+$/, /^envios\/\d+\/(aprobar|omitir|enviar)$/, /^generar$/, /^leads$/, /^leads\/(sectores|estado|buscar|importar|descartar)$/];

async function resolver(req: Request, params: Promise<{ ruta: string[] }>, metodo: "GET" | "POST" | "PUT" | "PATCH") {
  const session = await auth();
  if (!puedeVerProspeccion(session?.user)) return NextResponse.json({ ok: false, error: "Sin acceso a Prospección" }, { status: 403 });
  const ruta = (await params).ruta.join("/");
  if (!PERMITIDAS.some((r) => r.test(ruta))) return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  try {
    if (metodo === "GET") {
      const q = new URL(req.url).search;
      return NextResponse.json(await kelatosApiGet<object>(`/v1/prospeccion/${ruta}${q}`));
    }
    const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(await kelatosApiPost<object>(`/v1/prospeccion/${ruta}`, { ...cuerpo, usuario: session?.user?.email }, metodo));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}

type Ctx = { params: Promise<{ ruta: string[] }> };
export const GET = (req: Request, c: Ctx) => resolver(req, c.params, "GET");
export const POST = (req: Request, c: Ctx) => resolver(req, c.params, "POST");
export const PUT = (req: Request, c: Ctx) => resolver(req, c.params, "PUT");
export const PATCH = (req: Request, c: Ctx) => resolver(req, c.params, "PATCH");
