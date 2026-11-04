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
