import { NextResponse } from "next/server";
import { COOKIE_EQUIPO_LOCAL } from "@/lib/acceso-local";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.KELATOS_API_BASE_URL;
const TOKEN = process.env.KELATOS_API_TOKEN;

function pagina(titulo: string, texto: string, status = 200) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>` +
    `<body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f4f4f5;margin:0">` +
    `<div style="max-width:28rem;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px;text-align:center"><h1 style="font-size:1.1rem;margin:0 0 8px">${titulo}</h1>` +
    `<p style="margin:0;color:#52525b;font-size:.9rem">${texto}</p></div></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

/**
 * Alta de un equipo del local. Un administrador genera un enlace de un solo uso (pantalla «Equipos del local»); al abrirlo en el navegador
 * del PC del local, este queda reconocido con una cookie y la cuenta restringida (src/lib/acceso-local.ts) funciona desde él aunque cambie
 * la IP. Ruta pública (sin sesión, excluida del proxy): la protege el código de un solo uso.
 */
export async function GET(req: Request) {
  const codigo = new URL(req.url).searchParams.get("codigo") || "";
  if (!codigo || !/^[0-9a-f]{20,80}$/.test(codigo)) return pagina("Enlace no válido", "El enlace no es correcto. Pide uno nuevo a un administrador.", 400);
  if (!BASE_URL || !TOKEN) return pagina("No disponible", "Inténtalo de nuevo en unos minutos.", 503);
  try {
    const res = await fetch(`${BASE_URL}/v1/seguridad/acceso-local/equipos/alta`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, ua: req.headers.get("user-agent") || "" }),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; token?: string; nombre?: string; error?: string };
    if (!data.ok || !data.token) return pagina("Enlace no válido", data.error || "El enlace ya se usó o caducó. Pide uno nuevo a un administrador.", res.status === 410 ? 410 : 400);
    const resp = pagina("Equipo autorizado", `Este navegador ya está reconocido como equipo del local (${data.nombre ?? "equipo"}). Ya puedes cerrar esta pestaña y usar el dashboard.`);
    resp.cookies.set(COOKIE_EQUIPO_LOCAL, data.token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 400 });
    return resp;
  } catch {
    return pagina("No disponible", "No se pudo completar el alta ahora mismo. Inténtalo de nuevo.", 502);
  }
}
