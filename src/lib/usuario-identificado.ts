import type { Empleado } from "@/app/api/empleados/route";

/**
 * Reproduce _nombreUsuarioIdentificado() (Index.html) — precarga el
 * responsable con el usuario logueado cuando este es, a su vez, empleado.
 * `soloDeLista`, si se indica, exige además que el nombre esté en esa lista
 * fija (p.ej. TECNICOS en iniciar-reparacion-dialog.tsx) — igual que el
 * original, que solo autorrellena "Técnico" cuando el usuario activo ES uno
 * de los técnicos, nunca cualquier empleado.
 */
export async function usuarioIdentificado(soloDeLista?: string[]): Promise<string> {
  try {
    const [sesionRes, empleadosRes] = await Promise.all([
      fetch("/api/auth/session"),
      fetch("/api/empleados"),
    ]);
    const sesion = await sesionRes.json();
    const email = typeof sesion?.user?.email === "string" ? sesion.user.email.toLowerCase() : "";
    if (!email) return "";

    const empleadosData = await empleadosRes.json();
    if (!empleadosData?.ok) return "";
    const empleados: Empleado[] = empleadosData.empleados || [];
    const propio = empleados.find((e) => e.email?.toLowerCase() === email);
    if (!propio) return "";
    if (soloDeLista && !soloDeLista.includes(propio.nombre)) return "";
    return propio.nombre;
  } catch {
    return "";
  }
}

/** Atajo para el caso de iniciar-reparacion-dialog.tsx / finalizar-dialog.tsx: solo precarga si el usuario ES uno de los técnicos de la lista fija. */
export async function usuarioIdentificadoComoTecnico(tecnicos: string[]): Promise<string> {
  return usuarioIdentificado(tecnicos);
}
