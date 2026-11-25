export const TIPOS: Record<string, { nombre: string; clases: string }> = {
  aviso: { nombre: "Aviso", clases: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300" },
  nomina: { nombre: "Nómina", clases: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  contrato: { nombre: "Contrato", clases: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300" },
  vacaciones: { nombre: "Vacaciones", clases: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  sancion: { nombre: "Sanción", clases: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300" },
  documento: { nombre: "Documento", clases: "bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200" },
};

export interface Persona { email: string; nombre: string }

export interface Yo {
  email: string;
  rrhh: boolean;
  superadmin: boolean;
  correo: { disponible: boolean; conectado: boolean };
  pendientes: { sin_leer: number; sin_conformidad: number };
}

export interface ComunicadoFila {
  id: number; tipo: string; asunto: string; requiere_conformidad: boolean; creado_por: string; creado_en: string;
  leido_en?: string | null; conforme_en?: string | null; aviso_enviado_en?: string | null; adjuntos?: number;
  destinatarios?: number; leidos?: number; conformes?: number;
  anulado_en?: string | null;
}

export interface Adjunto { nombre: string; tipo: string; base64: string }

export function fecha(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function tamano(b: number): string {
  return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

/** Llama a /api/rrhh/* y lanza el mensaje de error del servidor. */
export async function pedir<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  const res = await fetch(`/api/rrhh/${ruta}`, cuerpo === undefined
    ? { cache: "no-store" }
    : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const d = await res.json().catch(() => null);
  if (!d?.ok) throw new Error(d?.error || "No se pudo completar la operación");
  return d as T;
}

export async function leerArchivos(lista: FileList | null, previos: Adjunto[]): Promise<Adjunto[]> {
  const nuevos = await Promise.all(Array.from(lista || []).map((f) => new Promise<Adjunto>((ok, mal) => {
    const l = new FileReader();
    l.onload = () => ok({ nombre: f.name, tipo: f.type || "application/octet-stream", base64: String(l.result).split(",")[1] || "" });
    l.onerror = () => mal(new Error(`No se pudo leer ${f.name}`));
    l.readAsDataURL(f);
  })));
  const todos = [...previos, ...nuevos];
  if (todos.length > 5) throw new Error("Máximo 5 adjuntos");
  if (todos.reduce((n, a) => n + a.base64.length * 0.75, 0) > 8 * 1024 * 1024) throw new Error("Los adjuntos no pueden superar 8 MB en total");
  return todos;
}
