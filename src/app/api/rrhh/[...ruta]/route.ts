import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Puerta única de Recursos Humanos hacia la API (/v1/rrhh/*).
 * PRIVACIDAD: `usuario` sale SIEMPRE de la sesión. Lo que mande el navegador con ese nombre se descarta, así nadie
 * puede pedir el correo o los comunicados de otra persona.
 */
const LECTURAS = [/^yo$/, /^correo\/(mensajes|mensaje|adjunto|sin-leer)$/, /^personas$/, /^comunicados(\/\d+)?$/, /^adjuntos\/\d+$/, /^enviados$/, /^historial$/, /^miembros$/];
const ESCRITURAS = [/^correo\/(conectar|desconectar|enviar)$/, /^comunicados(\/\d+\/conforme)?$/, /^miembros$/];

type Ctx = { params: Promise<{ ruta: string[] }> };

async function sesion(): Promise<string> {
  const s = await auth();
  return s?.user?.email?.toLowerCase() || "";
}
const sinSesion = () => NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
const noExiste = () => NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
const fallo = (e: unknown) => NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error desconocido" }, { status: 400, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest, { params }: Ctx) {
  const email = await sesion();
  if (!email) return sinSesion();
  const ruta = (await params).ruta.join("/");
  if (!LECTURAS.some((r) => r.test(ruta))) return noExiste();
  const consulta: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => { if (k !== "usuario" && k !== "descargar") consulta[k] = v; });
  consulta.usuario = email;
  try {
    const datos = await kelatosApiGet<{ ok: boolean; nombre?: string; base64?: string }>(`/v1/rrhh/${ruta}`, consulta);
    if (req.nextUrl.searchParams.get("descargar") && datos.base64 !== undefined) {
      // Siempre como descarga y sin interpretar el contenido en el dominio del dashboard.
      return new NextResponse(new Uint8Array(Buffer.from(datos.base64, "base64")), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(datos.nombre || "adjunto")}`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json(datos, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return fallo(e);
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const email = await sesion();
  if (!email) return sinSesion();
  const ruta = (await params).ruta.join("/");
  if (!ESCRITURAS.some((r) => r.test(ruta))) return noExiste();
  // Solo peticiones desde el propio dashboard.
  const origen = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (origen && host && new URL(origen).host !== host) return sinSesion();
  const cuerpo = ((await req.json().catch(() => ({}))) || {}) as Record<string, unknown>;
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  try {
    return NextResponse.json(await kelatosApiPost<{ ok: boolean }>(`/v1/rrhh/${ruta}`, { ...cuerpo, usuario: email, ip }));
  } catch (e) {
    return fallo(e);
  }
}
