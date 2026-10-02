import { Element3, Cpu, Message, Calendar, Chart, Notification, Setting2, Hierarchy, Global, Clock, DocumentText, UserSearch, SearchNormal1, Category, Star1, Link2, Sms, Building } from "@/lib/icons";

export interface ItemNav {
  label: string;
  href: string;
  icon: React.ElementType;
}

export interface GrupoNav {
  titulo: string;
  items: ItemNav[];
}

/** Menú lateral. El grupo "Departamentos" NO está aquí: sale de la base de datos (data-driven). */
export const GRUPOS_ANTES: GrupoNav[] = [
  {
    titulo: "Marketing",
    items: [
      { label: "Panel", href: "/agentes-v2", icon: Element3 },
      { label: "AI CMO", href: "/agentes-v2/cmo", icon: Cpu },
    ],
  },
];

export const GRUPOS_DESPUES: GrupoNav[] = [
  {
    titulo: "Trabajo",
    items: [
      { label: "Calendario", href: "/agentes-v2/calendario", icon: Calendar },
      { label: "En vivo", href: "/agentes-v2/en-vivo", icon: Cpu },
      { label: "Ejecuciones", href: "/agentes-v2/ejecuciones", icon: Clock },
    ],
  },
  {
    titulo: "Datos",
    items: [
      { label: "Analítica", href: "/agentes-v2/analitica", icon: Chart },
      { label: "Informes", href: "/agentes-v2/informes", icon: DocumentText },
    ],
  },
  {
    titulo: "Sistema",
    items: [
      { label: "Organizaciones", href: "/agentes-v2/organizaciones", icon: Building },
      { label: "Integraciones", href: "/agentes-v2/integraciones", icon: Link2 },
      { label: "Modelos IA", href: "/agentes-v2/modelos-ia", icon: Hierarchy },
      { label: "Ajustes", href: "/agentes-v2/ajustes", icon: Setting2 },
    ],
  },
];

/** Icono de un departamento a partir del texto `icon` guardado en la BD (desconocido → genérico). */
export const ICONO_DEPARTAMENTO: Record<string, React.ElementType> = {
  "user-search": UserSearch,
  search: SearchNormal1,
  document: DocumentText,
  message: Message,
  chart: Chart,
  setting: Setting2,
  global: Global,
  star: Star1,
  mail: Sms,
  notification: Notification,
  category: Category,
};

export const TITULO_SECCION: Record<string, string> = {
  cmo: "AI CMO",
  organizaciones: "Organizaciones",
  departamentos: "Departamentos",
  campanas: "Campañas",
  aprobaciones: "Aprobaciones",
  calendario: "Calendario",
  "en-vivo": "En vivo",
  ejecuciones: "Ejecuciones",
  analitica: "Analítica",
  informes: "Informes",
  integraciones: "Integraciones",
  "modelos-ia": "Modelos IA",
  ajustes: "Ajustes",
};
