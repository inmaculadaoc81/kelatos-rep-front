import { kelatosApiGet } from "@/lib/kelatos-api";

/**
 * Permisos del Dashboard (usuarios y permisos, 2026-11-20). Solo servidor.
 *
 * Migración módulo a módulo: un permiso solo MANDA si su módulo (prefijo de la clave: «stock» en «stock.ver») está en la lista de módulos aplicados
 * del backend. Si no lo está, si el usuario no figura en la tabla de usuarios, o si no se puede consultar el backend, se usa `fallback` (el resultado
 * del sistema anterior), así que un fallo nunca deja a nadie fuera ni da acceso de más. Vaciar la lista de módulos devuelve todo al sistema anterior.
 */
interface Efectivos {
  existe: boolean;
  aplicar: string[];
  activo?: boolean;
  efectivos?: Record<string, boolean>;
}

const TTL_MS = 20_000;
const cache = new Map<string, { hasta: number; datos: Efectivos | null }>();

async function permisosDe(email: string): Promise<Efectivos | null> {
  const clave = email.toLowerCase();
  const hit = cache.get(clave);
  if (hit && hit.hasta > Date.now()) return hit.datos;
  let datos: Efectivos | null = null;
  try {
    const r = await kelatosApiGet<Efectivos & { ok: boolean }>("/v1/usuarios-permisos/efectivos", { email: clave });
    if (r?.ok) datos = r;
  } catch {
    datos = null;
  }
  cache.set(clave, { hasta: Date.now() + (datos ? TTL_MS : 5_000), datos });
  if (cache.size > 300) cache.clear();
  return datos;
}

/** ¿Tiene el usuario este permiso? `fallback` = lo que decía el sistema anterior (se usa mientras el módulo no esté migrado). */
export async function tienePermiso(email: string | null | undefined, clave: string, fallback: boolean): Promise<boolean> {
  if (!email) return false;
  const p = await permisosDe(email);
  if (!p || !p.existe) return fallback;
  const modulo = clave.split(".")[0];
  if (!p.aplicar.includes(modulo)) return fallback;
  return p.efectivos?.[clave] === true;
}
