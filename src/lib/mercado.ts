export interface MesMercado { mes: string; impresiones: number; clics: number }
export interface ConsultaMercado { consulta: string; impresiones: number; clics: number; posicion: number | null; sitio?: string }
export interface OrgMercado { id: string; nombre: string; dominio: string | null; conectada: boolean; impresiones: number; clics: number; posicion: number | null; impresionesAnterior: number; cuota: number }
export interface GeneralMercado {
  ok: boolean; error?: string; dias: number; totalImpresiones: number; organizaciones: OrgMercado[]; mensual: MesMercado[];
  solapes: { consulta: string; webs: number; impresiones: number; sitios: string[] }[]; top: ConsultaMercado[];
}
export interface OrganizacionMercado {
  ok: boolean; error?: string; estado: "ok" | "sin_web" | "sin_search_console"; dias: number;
  organizacion: { id: string; nombre: string; dominio: string | null };
  mensual: MesMercado[]; totalImpresiones: number; marca: { palabras: string[]; marca: number; generico: number };
  top: ConsultaMercado[]; sinCubrir: ConsultaMercado[]; casi: ConsultaMercado[];
}
export interface CompetenciaLocal {
  ok: boolean; error?: string; sector: string; zona: string; total: number; conWeb: number;
  negocios: { nombre: string; web: string | null; direccion: string | null; barrio: string | null; tipo: string }[];
}

export const AYUDA_MERCADO = {
  impresiones: "Las veces que tu web apareció en los resultados de Google. Es la mejor medida de cuánta gente busca lo que ofreces, aunque no haga clic.",
  cuota: "Qué parte de todas las búsquedas de Kelatos llega a esa marca. Una marca con mucha cuota es donde más demanda hay ahora.",
  sinCubrir: "Búsquedas en las que ya apareces, pero tan abajo (pasada la página 1) que casi nadie te ve. Hay demanda, falta posicionarse: son candidatas a un artículo o a mejorar la página.",
  casi: "Búsquedas en las que estás en la página 1 pero fuera del top 3. Un pequeño empujón (mejor título, más contenido) puede traer más clics.",
  marca: "«De marca» son las búsquedas que ya incluyen el nombre de la web: gente que te conoce. «Genérico» son búsquedas de la necesidad (p. ej. «alquiler de portátiles»): gente que aún no te conoce, donde está el crecimiento.",
  solapes: "Búsquedas en las que salen varias webs de Kelatos a la vez. Se hacen la competencia entre ellas: conviene decidir cuál debe ganar esa búsqueda.",
  competencia: "Negocios del mismo sector en el mapa abierto (OpenStreetMap). Puede estar incompleto: sirve para ver el tamaño del mercado local, no como lista oficial.",
} as const;

export const nombreMes = (m: string) => new Date(`${m}-01T12:00:00`).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });

export interface RecomendacionesIA {
  ok: boolean; error?: string; desdeCache?: boolean; generadoEn?: string; resumen: string;
  recomendaciones: { titulo: string; por_que: string; accion: string; prioridad: "alta" | "media" | "baja"; tipo: "contenido" | "seo" | "redes" | "web" | "competencia" }[];
  ideas_redes: { red: string; idea: string }[]; riesgos: string[]; limites: string[];
}
