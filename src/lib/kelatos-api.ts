/**
 * Cliente del API real de Kelatos (Node/Express en el VPS, kelatos_app en
 * PostgreSQL). SOLO se usa desde código server-side de Next.js (Route
 * Handlers, Server Components) — el token nunca debe llegar al navegador.
 */

const BASE_URL = process.env.KELATOS_API_BASE_URL;
const TOKEN = process.env.KELATOS_API_TOKEN;

if (!BASE_URL || !TOKEN) {
  throw new Error(
    "Faltan KELATOS_API_BASE_URL / KELATOS_API_TOKEN — configúralos en .env.local (nunca con prefijo NEXT_PUBLIC_)."
  );
}

export async function kelatosApiGet<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") continue;
      qs.set(key, String(value));
    }
  }
  const url = `${BASE_URL}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });

  const body = await res.json();
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error || `API HTTP ${res.status}`);
  }
  return body as T;
}

export async function kelatosApiPost<T>(
  path: string,
  data: unknown,
  method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST"
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    cache: "no-store",
  });

  const body = await res.json();
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error || `API HTTP ${res.status}`);
  }
  return body as T;
}
