import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { esCuentaEmpleadosRestringida } from "@/lib/superadmin";
import { puedeVerCrm } from "@/lib/crm";

// Proxy hacia /v1/recepcion-equipos/* (misma restricción que crear productos: no vale para la cuenta compartida de empleados).
const PERMITIDAS = [/^buscar$/, /^registrar$/, /^recibidos$/];

async function resolver(req: Request, params: Promise<{ ruta: string[] }>, metodo: "GET" | "POST") {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (esCuentaEmpleadosRestringida(usuario)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const ruta = (await params).ruta.join("/");
  if (!PERMITIDAS.some((r) => r.test(ruta))) return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  // El listado de unidades recibidas (Beta) solo lo ven los administradores.
  if (ruta === "recibidos" && !puedeVerCrm(session?.user)) return NextResponse.json({ ok: false, error: "Solo administradores" }, { status: 403 });
  try {
    if (metodo === "GET") return NextResponse.json(await kelatosApiGet<object>(`/v1/recepcion-equipos/${ruta}${new URL(req.url).search}`));
    const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(await kelatosApiPost<object>(`/v1/recepcion-equipos/${ruta}`, { ...cuerpo, usuario }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}

type Ctx = { params: Promise<{ ruta: string[] }> };
export const GET = (req: Request, c: Ctx) => resolver(req, c.params, "GET");
export const POST = (req: Request, c: Ctx) => resolver(req, c.params, "POST");
