import { NextResponse, type NextRequest } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Ruta PÚBLICA (sin sesión, ver matcher de proxy.ts) de la respuesta al presupuesto con botones. Solo se llega con el enlace secreto
 * de cada presupuesto; el servidor comprueba el token y aplica las reglas.
 */
const OPERACIONES = new Set(["ver", "confirmar", "deshacer", "duda", "reiniciar"]);

// Límite propio de esta ruta pública: la API la comparte con el dashboard y un abuso aquí no debe dejarlo sin respuesta.
const POR_IP = 40, EN_TOTAL = 240, VENTANA_MS = 60_000;
let ventana = { desde: 0, total: 0, porIp: new Map<string, number>() };
function dentroDelLimite(ip: string): boolean {
  const ahora = Date.now();
  if (ahora - ventana.desde > VENTANA_MS) ventana = { desde: ahora, total: 0, porIp: new Map() };
  const n = (ventana.porIp.get(ip) || 0) + 1;
  ventana.porIp.set(ip, n);
  return n <= POR_IP && ++ventana.total <= EN_TOTAL;
}

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
  if (!dentroDelLimite(ip || "desconocida")) return NextResponse.json({ ok: false, error: "Demasiados intentos seguidos. Espera un minuto." }, { status: 429 });
  try {
    const datos = await kelatosApiPost<{ ok: boolean }>(`/v1/ppto-botones/${cuerpo.op}`, { token, ip, accion: cuerpo.accion, numeros: cuerpo.numeros, texto: cuerpo.texto });
    return NextResponse.json(datos, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "No se pudo completar" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
