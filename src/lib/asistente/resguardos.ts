/** Comprobación de un número de resguardo contra los reales (para no abrir ni preguntar a ciegas lo que se ha dictado). */

export interface FichaResguardo {
  resguardo: string;
  cliente: string;
  equipo: string;
  estado: string;
}

export interface ResultadoResguardo {
  existe: boolean;
  reparacion: FichaResguardo | null;
  /** Resguardos reales que se parecen (una cifra distinta o dos cambiadas de sitio). */
  parecidos: FichaResguardo[];
}

/** null si no se pudo comprobar (sin conexión, error del servidor): entonces se pregunta en vez de adivinar. */
export async function comprobarResguardo(numero: string): Promise<ResultadoResguardo | null> {
  try {
    const res = await fetch(`/api/asistente/resguardo/${encodeURIComponent(numero)}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const d = await res.json();
    if (!d.ok) return null;
    return { existe: !!d.existe, reparacion: d.reparacion ?? null, parecidos: Array.isArray(d.parecidos) ? d.parecidos : [] };
  } catch {
    return null;
  }
}

export const etiquetaResguardo = (f: FichaResguardo) => [f.resguardo, f.cliente, f.equipo].filter(Boolean).join(" · ");
