import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.KELATOS_API_BASE_URL;
const TOKEN = process.env.KELATOS_API_TOKEN;

/**
 * Latido del local. Un script en los PCs del local llama aquí cada pocos minutos con un token secreto (cabecera X-Latido-Token); el
 * servidor anota la IP desde la que llega la llamada y, durante unos minutos, la cuenta restringida (ver src/lib/acceso-local.ts)
 * se admite desde esa IP. Así no importa que el proveedor de internet del local cambie la IP.
 *
 * La IP se lee igual que en src/lib/acceso-local.ts (primer valor de X-Forwarded-For), para que las dos comparen lo mismo.
 * Ruta pública (sin sesión, excluida del proxy): la protege el token.
 */
export async function POST(req: Request) {
  const token = req.headers.get("x-latido-token") || "";
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0].trim() : req.headers.get("x-real-ip")?.trim() || "";
  if (!token || !ip) return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
  if (!BASE_URL || !TOKEN) return NextResponse.json({ ok: false, error: "No disponible" }, { status: 503 });
  try {
    const res = await fetch(`${BASE_URL}/v1/seguridad/acceso-local/latido`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ip, token }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return NextResponse.json({ ok: !!data.ok, ip: data.ok ? ip : undefined }, { status: res.status === 401 ? 401 : data.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo registrar" }, { status: 502 });
  }
}
