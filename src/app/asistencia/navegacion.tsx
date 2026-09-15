import {
  Clock,
  Calendar,
  ClipboardText,
  Airplane,
  Edit2,
  CalendarRemove,
  Health,
  SecuritySafe,
  DocumentDownload,
  Setting2,
  Profile2User,
  Monitor,
  Chart,
  Cpu,
  Category2,
  DocumentText,
} from "@/lib/icons";
export interface ItemNavegacionAsistencia {
  label: string;
  href: string | null;
  icon: React.ElementType;
  soloSuperadmin?: boolean;
}

export interface GrupoNavegacionAsistencia {
  titulo: string;
  icon: React.ElementType;
  items: ItemNavegacionAsistencia[];
}

// Fuente única del sidebar y de las migas de Asistencia — mismo patrón que
// src/app/(app)/navegacion.tsx. Tres grupos posibles según el momento
// (Kiosco/Administración cuando no se está en Remote Work; Remote Work
// cuando sí), nunca los tres a la vez — ver sidebar.tsx.
export const GRUPO_KIOSCO: GrupoNavegacionAsistencia = {
  titulo: "Kiosco",
  icon: Clock,
  items: [
    { href: "/asistencia/kiosk", label: "Fichar", icon: Clock },
    { href: "/asistencia/kiosk/mes", label: "Mi mes", icon: Calendar },
    { href: "/asistencia/kiosk/solicitudes", label: "Solicitudes", icon: ClipboardText },
  ],
};

export const GRUPO_ADMINISTRACION: GrupoNavegacionAsistencia = {
  titulo: "Administración",
  icon: Setting2,
  items: [
    { href: "/asistencia/admin/fichajes", label: "Fichajes", icon: Clock },
    { href: "/asistencia/admin/empleados", label: "Empleados", icon: Profile2User, soloSuperadmin: true },
    { href: "/asistencia/admin/horarios", label: "Horarios", icon: Setting2 },
    { href: "/asistencia/admin/vacaciones", label: "Vacaciones", icon: Airplane },
    { href: "/asistencia/admin/correcciones", label: "Correcciones", icon: Edit2 },
    { href: "/asistencia/admin/marcaciones-olvidadas", label: "Marcaciones olvidadas", icon: CalendarRemove },
    { href: "/asistencia/admin/ausencias-parciales", label: "Ausencias parciales", icon: Health },
    { href: "/asistencia/admin/auditoria", label: "Auditoría", icon: SecuritySafe },
    { href: "/asistencia/admin/informe", label: "Informe mensual", icon: DocumentDownload },
  ],
};

export const GRUPO_REMOTE_WORK: GrupoNavegacionAsistencia = {
  titulo: "Remote Work",
  icon: Monitor,
  items: [
    { href: "/asistencia/admin/remote-workers", label: "Dashboard", icon: Chart },
    { href: "/asistencia/admin/remote-workers/dispositivos", label: "Dispositivos", icon: Monitor },
    { href: "/asistencia/admin/remote-workers/agentes", label: "Agentes", icon: Cpu },
    { href: "/asistencia/admin/remote-workers/categorias", label: "Categorías", icon: Category2 },
    { href: "/asistencia/admin/remote-workers/reportes", label: "Reportes", icon: DocumentText },
    { href: "/asistencia/admin/remote-workers/empleados", label: "Empleados", icon: Profile2User, soloSuperadmin: true },
    { href: "/asistencia/admin/horarios", label: "Horarios", icon: Setting2 },
    { href: "/asistencia/admin/remote-workers/fichajes", label: "Fichajes", icon: Clock },
    { href: "/asistencia/admin/remote-workers/vacaciones", label: "Vacaciones", icon: Airplane },
    { href: "/asistencia/admin/remote-workers/correcciones", label: "Correcciones", icon: Edit2 },
    { href: "/asistencia/admin/remote-workers/marcaciones-olvidadas", label: "Marcaciones olvidadas", icon: CalendarRemove },
    { href: "/asistencia/admin/remote-workers/ausencias-parciales", label: "Ausencias parciales", icon: Health },
  ],
};

/** Busca el item cuyo href coincide exactamente con la ruta actual, en
    cualquiera de los 3 grupos — usado por las migas del header (ver
    migas.tsx) para no depender de en qué vista está el sidebar en ese
    momento. */
export function localizarItemAsistencia(pathname: string): ItemNavegacionAsistencia | null {
  for (const grupo of [GRUPO_KIOSCO, GRUPO_ADMINISTRACION, GRUPO_REMOTE_WORK]) {
    const item = grupo.items.find((i) => i.href === pathname);
    if (item) return item;
  }
  return null;
}
