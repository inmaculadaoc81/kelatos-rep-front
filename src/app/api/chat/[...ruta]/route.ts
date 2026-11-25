import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { puedeUsarAsistente } from "@/lib/asistente/permisos";

/**
 * Puerta del chat interno hacia la API (/v1/chat/*).
 * PRIVACIDAD: `usuario` sale SIEMPRE de la sesión. Lo que mande el navegador con ese nombre se descarta, así nadie
 * puede leer ni enviar mensajes en nombre de otra persona.
 */
const LECTURAS = [/^resumen$/, /^personas$/, /^mensajes$/];
const ESCRITURAS = [/^enviar$/, /^leido$/];
const SIN_CACHE = { headers: { "Cache-Control": "no-store" } };

type Ctx = { params: Promise<{ ruta: string[] }> };

const sinSesion = () => NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
const noExiste = () => NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
const fallo = (e: unknown) => NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error desconocido" }, { status: 400, ...SIN_CACHE });

export async function GET(req: NextRequest, { params }: Ctx) {
  const sesion = await auth();
  const email = sesion?.user?.email?.toLowerCase() || "";
  if (!email) return sinSesion();
  const ruta = (await params).ruta.join("/");
  if (!LECTURAS.some((r) => r.test(ruta))) return noExiste();
  const consulta: Record<string, string> = {};
  const con = req.nextUrl.searchParams.get("con");
  if (con) consulta.con = con;
  consulta.usuario = email;
  try {
    const datos = await kelatosApiGet<Record<string, unknown>>(`/v1/chat/${ruta}`, consulta);
    // La burbuja del asistente ocupa la esquina en algunas cuentas: el chat se coloca a su izquierda.
    return NextResponse.json(ruta === "resumen" ? { ...datos, junto: puedeUsarAsistente(sesion?.user) } : datos, SIN_CACHE);
  } catch (e) {
    return fallo(e);
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const sesion = await auth();
  const email = sesion?.user?.email?.toLowerCase() || "";
  if (!email) return sinSesion();
  const ruta = (await params).ruta.join("/");
  if (!ESCRITURAS.some((r) => r.test(ruta))) return noExiste();
  // Solo peticiones desde el propio dashboard.
  const origen = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (origen && host && new URL(origen).host !== host) return sinSesion();
  const cuerpo = ((await req.json().catch(() => ({}))) || {}) as Record<string, unknown>;
  try {
    return NextResponse.json(await kelatosApiPost<{ ok: boolean }>(`/v1/chat/${ruta}`, { ...cuerpo, usuario: email }), SIN_CACHE);
  } catch (e) {
    return fallo(e);
  }
}
