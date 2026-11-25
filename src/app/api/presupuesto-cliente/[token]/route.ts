import { NextResponse, type NextRequest } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Ruta PÚBLICA (sin sesión, ver matcher de proxy.ts) de la respuesta al presupuesto con botones. Solo se llega con el enlace secreto
 * de cada presupuesto; el servidor comprueba el token y aplica las reglas. En esta fase solo hay enlaces de prueba.
 */
const OPERACIONES = new Set(["ver", "confirmar", "deshacer", "duda", "reiniciar"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origen = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (origen && host && new URL(origen).host !== host) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const cuerpo = ((await req.json().catch(() => ({}))) || {}) as { op?: string; accion?: string; numeros?: string[]; texto?: string };
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token) || !OPERACIONES.has(cuerpo.op || "")) {
    return NextResponse.json({ ok: false, error: "Enlace no válido" }, { status: 404 });
  }
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  try {
    const datos = await kelatosApiPost<{ ok: boolean }>(`/v1/ppto-botones/${cuerpo.op}`, { token, ip, accion: cuerpo.accion, numeros: cuerpo.numeros, texto: cuerpo.texto });
    return NextResponse.json(datos, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "No se pudo completar" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
