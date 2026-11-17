/** N8N Labs: respuestas del formulario «¿Encaja mi negocio?» de automatizacionesn8n.com, puntuadas por la API. */
export type Clasificacion = "caliente" | "tibio" | "no_encaja";
export type EstadoDiagnostico = "nuevo" | "contactado" | "agendado" | "cliente" | "descartado";

export interface Diagnostico {
  id: number;
  referencia: string;
  creado_en: string;
  nombre: string;
  whatsapp: string;
  whatsapp_norm: string;
  email: string | null;
  pais: string | null;
  rubro_otro: string | null;
  automatizar_otro: string | null;
  ia_estado: "pendiente" | "listo" | "error" | null;
  ia_resumen: string | null;
  ia_mensaje: string | null;
  ia_preguntas: string[] | null;
  ia_modelo: string | null;
  ia_error: string | null;
  ia_en: string | null;
  rubro: string;
  facturacion: string;
  mensajes: string;
  automatizar: string;
  urgencia: string;
  inversion: string;
  rol: string;
  intentado: string | null;
  puntos: number;
  clasificacion: Clasificacion;
  motivos: string[];
  desglose: { campo: string; pregunta: string; respuesta: string; puntos: number; maximo: number }[];
  estado: EstadoDiagnostico;
  notas: string | null;
  atendido_por: string | null;
  atendido_en: string | null;
  origen: string | null;
}

export interface ResumenDiagnosticos {
  total: number; caliente: number; tibio: number; no_encaja: number; sin_atender: number; calientes_sin_atender: number; ultimos_7_dias: number; agendados_o_clientes: number;
}

export type CatalogoDiagnostico = Record<string, { etiqueta: string; opciones: Record<string, string> }>;

/** Las clases son completas porque Tailwind no genera nombres armados. */
export const CLASIFICACION: Record<Clasificacion, { nombre: string; ruta: string; chip: string; punto: string; descripcion: string }> = {
  caliente: { nombre: "Caliente", ruta: "Pasa a la llamada del setter", chip: "bg-emerald-100 text-emerald-800 border-emerald-200", punto: "bg-emerald-500", descripcion: "Factura, tiene presupuesto, decide y lo quiere pronto. Llamar cuanto antes." },
  tibio: { nombre: "Tibio", ruta: "Casos por WhatsApp en 2–3 semanas", chip: "bg-amber-100 text-amber-800 border-amber-200", punto: "bg-amber-500", descripcion: "Tiene potencial pero le falta algo (urgencia, presupuesto o decidir). Nutrir con casos por WhatsApp." },
  no_encaja: { nombre: "No encaja", ruta: "Contenido gratis", chip: "bg-slate-100 text-slate-700 border-slate-200", punto: "bg-slate-400", descripcion: "Todavía no es el momento. No gastar llamadas: contenido gratuito." },
};

export const ESTADOS_DIAGNOSTICO: { id: EstadoDiagnostico; nombre: string }[] = [
  { id: "nuevo", nombre: "Sin atender" },
  { id: "contactado", nombre: "Contactado" },
  { id: "agendado", nombre: "Llamada agendada" },
  { id: "cliente", nombre: "Cliente" },
  { id: "descartado", nombre: "Descartado" },
];

export const nombreEstadoDiagnostico = (e: EstadoDiagnostico) => ESTADOS_DIAGNOSTICO.find((x) => x.id === e)?.nombre ?? e;

/** Enlace de WhatsApp: usa el mensaje que redactó la IA local si existe; si no, uno genérico según la clasificación. */
export function enlaceWhatsapp(d: Diagnostico): string {
  const nombre = d.nombre.split(/\s+/)[0];
  const texto = d.ia_estado === "listo" && d.ia_mensaje ? d.ia_mensaje : d.clasificacion === "caliente"
    ? `Hola ${nombre}, soy del equipo de N8N Labs. Vi tu formulario y creo que podemos ayudarte a automatizar tu negocio. ¿Te va bien que hablemos 15 minutos hoy o mañana?`
    : `Hola ${nombre}, soy del equipo de N8N Labs. Gracias por rellenar el formulario. Te voy a ir pasando casos reales de automatización de negocios como el tuyo.`;
  return `https://wa.me/${d.whatsapp_norm}?text=${encodeURIComponent(texto)}`;
}
