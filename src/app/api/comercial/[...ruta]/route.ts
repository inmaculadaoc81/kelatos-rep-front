import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { esAgenteComercial, puedeAdministrarComercial } from "@/lib/comercial";

/**
 * Proxy hacia /v1/comercial/* con lista cerrada de rutas.
 *  - AGENTE (cuenta de comercial_agentes): solo sus propios contactos y llamadas. El correo del agente SIEMPRE sale de la sesión, nunca del cliente,
 *    así que no puede pedir ni tocar lo de otro agente. No ve transcripciones: esas rutas ni existen aquí (son de /api/llamadas, solo superadmin).
 *  - ADMIN / superadmin: todo lo anterior para cualquier agente, más listas, importación, agentes, actividad y guion.
 */
type Metodo = "GET" | "POST" | "PATCH" | "PUT";
interface Regla { metodo: Metodo; patron: RegExp; admin: boolean }

const REGLAS: Regla[] = [
  // agente y admin
  { metodo: "GET", patron: /^cola$/, admin: false },
  { metodo: "GET", patron: /^contactos$/, admin: false },
  { metodo: "GET", patron: /^contactos\/\d+$/, admin: false },
  { metodo: "POST", patron: /^contactos\/\d+\/gestion$/, admin: false },
  { metodo: "GET", patron: /^historial$/, admin: false },
  { metodo: "GET", patron: /^reuniones$/, admin: false },
  { metodo: "PATCH", patron: /^reuniones\/\d+$/, admin: false },
  { metodo: "GET", patron: /^resumen$/, admin: false },
  { metodo: "GET", patron: /^guion$/, admin: false },
  // solo admin
  { metodo: "GET", patron: /^agentes$/, admin: true },
  { metodo: "POST", patron: /^agentes$/, admin: true },
  { metodo: "PATCH", patron: /^agentes\/[^/]+$/, admin: true },
  { metodo: "GET", patron: /^listas$/, admin: true },
  { metodo: "POST", patron: /^listas\/importar$/, admin: true },
  { metodo: "PATCH", patron: /^listas\/\d+$/, admin: true },
  { metodo: "GET", patron: /^actividad$/, admin: true },
  { metodo: "PUT", patron: /^guion$/, admin: true },
];

const PARAMETROS = ["agente", "q", "estado", "listaId", "limit", "offset", "desde", "hasta"];

async function resolver(req: Request, params: Promise<{ ruta: string[] }>, metodo: Metodo) {
  const session = await auth();
  const user = session?.user;
  const email = (user?.email || "").toLowerCase();
  const admin = puedeAdministrarComercial(user);
  if (!email || !(admin || esAgenteComercial(user))) return NextResponse.json({ ok: false, error: "Sin acceso" }, { status: 403 });

  const ruta = (await params).ruta.join("/");
  const regla = REGLAS.find((r) => r.metodo === metodo && r.patron.test(ruta));
  if (!regla) return NextResponse.json({ ok: false, error: "Ruta no válida" }, { status: 404 });
  if (regla.admin && !admin) return NextResponse.json({ ok: false, error: "Solo un administrador puede hacer esto" }, { status: 403 });

  try {
    if (metodo === "GET") {
      const sp = new URL(req.url).searchParams;
      const q: Record<string, string> = {};
      for (const k of PARAMETROS) {
        const v = sp.get(k);
        if (v) q[k] = v;
      }
      if (!admin) q.agente = email; // un agente solo ve lo suyo
      else if (!regla.admin) q.admin = "1";
      return NextResponse.json(await kelatosApiGet<object>(`/v1/comercial/${ruta}`, q));
    }
    const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const data: Record<string, unknown> = { ...cuerpo, usuario: email };
    delete data.admin;
    if (!admin) data.agente = email;
    else if (!regla.admin) { data.admin = true; if (!data.agente) data.agente = email; }
    return NextResponse.json(await kelatosApiPost<object>(`/v1/comercial/${ruta}`, data, metodo));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}

type Ctx = { params: Promise<{ ruta: string[] }> };
export const GET = (req: Request, c: Ctx) => resolver(req, c.params, "GET");
export const POST = (req: Request, c: Ctx) => resolver(req, c.params, "POST");
export const PATCH = (req: Request, c: Ctx) => resolver(req, c.params, "PATCH");
export const PUT = (req: Request, c: Ctx) => resolver(req, c.params, "PUT");
