import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { puedeVerCrm } from "@/lib/crm";

// Proxy hacia /v1/crm/correos/* (solo administradores). Rutas permitidas por lista cerrada.
const PERMITIDAS = [/^resumen$/, /^contactos$/, /^tipos$/, /^tipos\/\d+$/, /^campanas$/, /^campanas\/\d+$/, /^audiencia$/, /^metricas$/, /^config$/, /^seguimiento$/, /^plan$/, /^respuestas\/revisar$/];

async function resolver(req: Request, params: Promise<{ ruta: string[] }>, metodo: "GET" | "POST" | "PATCH" | "PUT") {
  const session = await auth();
  if (!puedeVerCrm(session?.user)) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  const ruta = (await params).ruta.join("/");
  if (!PERMITIDAS.some((r) => r.test(ruta))) return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  try {
    if (metodo === "GET") return NextResponse.json(await kelatosApiGet<object>(`/v1/crm/correos/${ruta}${new URL(req.url).search}`));
    const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(await kelatosApiPost<object>(`/v1/crm/correos/${ruta}`, { ...cuerpo, usuario: session?.user?.email }, metodo));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}

type Ctx = { params: Promise<{ ruta: string[] }> };
export const GET = (req: Request, c: Ctx) => resolver(req, c.params, "GET");
export const POST = (req: Request, c: Ctx) => resolver(req, c.params, "POST");
export const PATCH = (req: Request, c: Ctx) => resolver(req, c.params, "PATCH");
export const PUT = (req: Request, c: Ctx) => resolver(req, c.params, "PUT");
