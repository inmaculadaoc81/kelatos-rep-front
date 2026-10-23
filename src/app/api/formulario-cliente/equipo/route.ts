import { NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

/**
 * GET público — la llama el paso «Equipo» del formulario de la tablet cuando se escanea el código de barras de un equipo, para rellenar
 * marca y modelo. Sin sesión, así que se exige un código de acceso VÁLIDO (el mismo que ya deja pasar al cliente) y se limitan las consultas
 * por código y por IP para que nadie pueda gastar las consultas de pago. Devuelve solo los datos del equipo, nada interno.
 */
const MAX_POR_CODIGO = 12;
const MAX_POR_IP = 30;
const VENTANA_MS = 3_600_000;
const usos = new Map<string, number[]>();

function permitido(clave: string, max: number): boolean {
  const ahora = Date.now();
  const marcas = (usos.get(clave) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (marcas.length >= max) { usos.set(clave, marcas); return false; }
  marcas.push(ahora);
  usos.set(clave, marcas);
  return true;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const ean = (sp.get("ean") ?? "").replace(/\D/g, "");
  const codigo = (sp.get("codigo") ?? "").trim();
  if (!/^\d{8,14}$/.test(ean)) return NextResponse.json({ ok: false, error: "Código de barras no válido" }, { status: 400 });
  if (!codigo) return NextResponse.json({ ok: false, error: "Falta el código de acceso" }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconocida";
  if (!permitido(`c:${codigo}`, MAX_POR_CODIGO) || !permitido(`i:${ip}`, MAX_POR_IP)) {
    return NextResponse.json({ ok: false, error: "Demasiadas consultas seguidas: escribe los datos a mano" }, { status: 429 });
  }
  try {
    const v = await kelatosApiPost<{ ok: boolean; valido: boolean }>("/v1/formulario/codigo-acceso/validar", { codigo });
    if (!v.valido) return NextResponse.json({ ok: false, error: "Código de acceso no válido" }, { status: 403 });
    const d = await kelatosApiGet<{ ok: boolean; ean: string; origen: string; fuente?: string | null; datos: { nombre: string; marca: string | null; modelo: string | null; categoria: string | null } | null }>(
      `/v1/recepcion-equipos/buscar?ean=${ean}`
    );
    return NextResponse.json({ ok: true, origen: d.origen, fuente: d.fuente ?? null, datos: d.datos });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
