/** Analítica web de «Webs Kelatos» (Google Search Console por dominio). */
export interface TotalesGsc {
  clics: number;
  impresiones: number;
  ctr: number | null;
  posicion: number | null;
}

export interface WebAnalitica {
  id: number;
  nombre: string;
  tipo: string;
  dominio: string | null;
  conectado: boolean;
  actual: TotalesGsc | null;
  anterior: TotalesGsc | null;
  ultimaSync: string | null;
  error: string | null;
}

export interface ConsultaGsc {
  consulta: string;
  clics: number;
  impresiones: number;
  ctr?: number | null;
  posicion: number | null;
}

export interface PaginaGsc {
  pagina: string;
  clics: number;
  impresiones: number;
  ctr: number | null;
  posicion: number | null;
}

export interface OportunidadWeb extends ConsultaGsc {
  sitio_id: number;
  nombre: string;
  dominio: string;
}

export interface DetalleWeb {
  ok: boolean;
  dias: number;
  web: { id: number; nombre: string; tipo: string; dominio: string | null; url: string };
  gsc: { configurado: boolean; cuentaServicio: string | null };
  conectado: boolean;
  ultimaSync?: string | null;
  ultimoError?: string | null;
  totales?: TotalesGsc;
  anterior?: TotalesGsc;
  tendencia?: { fecha: string; clics: number; impresiones: number }[];
  principales?: ConsultaGsc[];
  oportunidades?: ConsultaGsc[];
  nuevas?: ConsultaGsc[];
  paginas?: PaginaGsc[];
}

export const n = (v: number | null | undefined, dec = 0) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("es-ES", { maximumFractionDigits: dec }));

/** Variación porcentual respecto al periodo anterior (null si no hay base de comparación). */
export function variacion(actual: number | null | undefined, anterior: number | null | undefined): number | null {
  if (actual === null || actual === undefined || anterior === null || anterior === undefined || anterior === 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

/** Explicaciones en lenguaje sencillo de cada término de la analítica web (se muestran al pasar el cursor). */
export const GLOSARIO = {
  clics: "Visitas desde Google: las veces que alguien buscó algo en Google, vio tu web en los resultados y entró en ella.",
  impresiones: "Apariciones en Google: las veces que tu web salió en los resultados de una búsqueda, aunque nadie entrara.",
  ctr: "De cada 100 veces que sales en Google, cuántas personas entran. Si sales 100 veces y entran 3, el CTR es 3 %. Cuanto más alto, más convencen tu título y tu descripción.",
  posicion: "Lugar medio en que sales en Google. 1 es el primer resultado. Del 1 al 10 estás en la primera página (la que casi todo el mundo mira); del 11 al 20, en la segunda. Cuanto más bajo el número, mejor.",
  estado: "«Con datos»: Google ya nos da las cifras de esta web. «Asignar dominio»: falta indicar su dirección. «Sin Search Console»: falta dar acceso a la cuenta de lectura en esa propiedad.",
  variacion: "Compara con el periodo anterior de la misma duración. Por ejemplo, con 28 días elegidos, se compara con los 28 días de antes. ▲ verde = ha subido, ▼ rojo = ha bajado.",
  dominio: "La dirección de la web (por ejemplo, ejemplo.es). Es la que se usa para pedir sus datos a Google.",
  consultas: "Lo que la gente escribe en Google para llegar a tu web.",
  oportunidades: "Búsquedas en las que ya sales en la segunda página (posiciones 8 a 20) y que la gente hace de verdad. Con un pequeño empujón, como mejorar el texto de esa página, pueden subir a la primera y traer más visitas.",
  nuevas: "Búsquedas con las que has aparecido por primera vez en la última semana.",
  paginas: "Las páginas de tu web a las que más gente llega desde Google.",
  websConDatos: "Webs de las que Google ya nos da cifras. Las demás aún no tienen dominio asignado o no hemos recibido acceso a su Search Console.",
  sesiones: "Visitas a la web, vengan de donde vengan (Google, redes, directo…). Una persona puede hacer varias.",
  usuarios: "Personas distintas que han visitado la web.",
  vistas: "Páginas vistas: cada vez que alguien abre una página de la web.",
  tasaInteraccion: "Porcentaje de visitas en las que la persona se quedó más de 10 segundos, miró más de una página o hizo alguna acción. Mide si la visita fue «de verdad».",
  duracionMedia: "Tiempo medio que pasa cada persona en la web (minutos:segundos).",
} as const;

/** «1ª página», «2ª página»… según la posición media en Google. */
export function lugarEnGoogle(posicion: number | string | null | undefined): { texto: string; clase: string } | null {
  if (posicion === null || posicion === undefined) return null;
  const p = Number(posicion);
  if (!Number.isFinite(p) || p <= 0) return null;
  if (p <= 10) return { texto: "1ª página", clase: "bg-emerald-500/10 text-emerald-700" };
  if (p <= 20) return { texto: "2ª página", clase: "bg-amber-500/10 text-amber-700" };
  return { texto: "Más atrás", clase: "bg-red-500/10 text-red-700" };
}
