import {
  Profile2User,
  Monitor,
  TimerStart,
  ShoppingCart,
  DocumentText,
  Receipt,
  Box1,
  Setting2,
  type Icon,
} from "@/lib/icons";

export interface EstiloEntidad {
  icon: Icon;
  badge: string;
  dot: string;
}

/** Un color por entidad (derivada de derivarEntidad en registro-acciones.ts) — la misma paleta que ya usan el resto de badges de estado en la app. */
export const ESTILO_ENTIDAD: Record<string, EstiloEntidad> = {
  Cliente: { icon: Profile2User, badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  Equipo: { icon: Monitor, badge: "bg-purple-500/10 text-purple-700 dark:text-purple-400", dot: "bg-purple-500" },
  Alquiler: { icon: TimerStart, badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  Venta: { icon: ShoppingCart, badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  Presupuesto: { icon: DocumentText, badge: "bg-violet-500/10 text-violet-700 dark:text-violet-400", dot: "bg-violet-500" },
  Factura: { icon: Receipt, badge: "bg-teal-500/10 text-teal-700 dark:text-teal-400", dot: "bg-teal-500" },
  Pedido: { icon: Box1, badge: "bg-orange-500/10 text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
  Reparación: { icon: Setting2, badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400", dot: "bg-sky-500" },
};

export function estiloEntidad(entidad: string): EstiloEntidad {
  return ESTILO_ENTIDAD[entidad] || ESTILO_ENTIDAD["Reparación"];
}

/** Convierte "presupuesto_enviado" en "Presupuesto enviado" — la propia
    descripción del evento ya es la frase completa; el tipo solo hace de
    subtítulo, así que basta con hacerlo legible, no traducirlo palabra a
    palabra. */
export function humanizarTipo(tipo: string): string {
  const limpio = (tipo || "").replace(/_/g, " ").trim();
  if (!limpio) return "—";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

const COLORES_AVATAR = [
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-sky-500/15 text-sky-700 dark:text-sky-400",
];

/** Color estable por usuario (mismo nombre → mismo color siempre, sin necesitar backend). */
export function colorAvatar(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  return COLORES_AVATAR[hash % COLORES_AVATAR.length];
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
