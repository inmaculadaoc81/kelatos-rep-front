import type { Session } from "next-auth";
import { esSuperadmin } from "@/lib/superadmin";
import { esProgramadorContenido } from "@/lib/programador-contenido";

/**
 * Quién entra a Redes sociales y qué ve:
 *  · «admin»: administradores y superadmins, todo el menú;
 *  · «programador»: la community manager (empleada 23): solo contenido, calendario, recursos, programar, carruseles y analítica de Instagram
 *    (lo mismo que ya veía en sus pantallas de siempre; el proxy de /api/agentes-v2 sigue limitándole lo demás);
 *  · cualquier otra cuenta no entra (Carlo, Cielo y Gean mantienen sus vistas de siempre).
 */
export type RolRedes = "admin" | "programador";

export function rolRedes(session: Session | null): RolRedes | null {
  const user = session?.user;
  if (!user) return null;
  if (user.role === "admin" || esSuperadmin(user.email)) return "admin";
  if (esProgramadorContenido(user)) return "programador";
  return null;
}
