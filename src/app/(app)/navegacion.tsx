import {
  Setting2,
  ClipboardTick,
  DocumentText,
  Profile2User,
  Box1,
  Box,
  BoxSearch,
  Element3,
  ShoppingCart,
  Truck,
  Clock,
  Chart,
  Receipt,
  Money,
  Coin1,
  ClipboardText,
  Wallet,
  Hierarchy,
  Monitor,
  ScanBarcode,
  Trash,
  Save2,
  Notification,
  MoneySend,
  Book1,
  Bank,
  ReceiptItem,
  Airplane,
  Star1,
} from "@/lib/icons";

export interface ItemNavegacion {
  label: string;
  /** `null` = todavía no construido en Next.js (sigue solo en Apps Script). */
  href: string | null;
  icon: React.ElementType;
  /** Clases opcionales para destacar un item (p. ej. texto en verde). */
  claseColor?: string;
}

export interface GrupoNavegacion {
  titulo: string;
  /** Icono del encabezado — solo se pinta cuando el grupo tiene más de un item. */
  icon: React.ElementType;
  /** Clases del icono del encabezado (por defecto, azul de marca). */
  claseIcono?: string;
  items: ItemNavegacion[];
}

// Fuente única del menú lateral y de las migas: refleja el checklist de
// migración módulo por módulo. Un grupo con un solo item se pinta como
// enlace directo (sin desplegable); con varios, como grupo colapsable.
// No hay un grupo "General/Resumen" — igual que en el sistema original, el
// dashboard vive dentro de la vista de reparaciones activas, no aparte.
export const GRUPOS: GrupoNavegacion[] = [
  {
    titulo: "Reparaciones",
    icon: Setting2,
    items: [
      { label: "Todas las Reparaciones", href: "/reparaciones", icon: ClipboardTick },
      { label: "Presupuestos", href: "/presupuestos", icon: DocumentText },
      { label: "Recogidas", href: "/recogidas", icon: Truck },
      { label: "Punto Limpio", href: "/punto-limpio", icon: Trash },
    ],
  },
  {
    titulo: "Catálogos",
    icon: Box1,
    items: [
      { label: "Clientes", href: "/clientes", icon: Profile2User },
      { label: "Proveedores", href: "/proveedores", icon: Truck },
      { label: "Formulario Web", href: "/formulario-web", icon: ScanBarcode },
      { label: "Equipos y Alquileres", href: "/equipos", icon: Box1 },
      { label: "Ventas", href: "/ventas", icon: ShoppingCart },
    ],
  },
  {
    titulo: "Stock",
    icon: BoxSearch,
    items: [
      { label: "Productos e Inventario", href: "/productos", icon: Box },
      { label: "Stock de Piezas", href: "/stock-piezas", icon: Element3 },
      { label: "Compras", href: "/compras", icon: MoneySend, claseColor: "text-red-600 hover:text-red-700 data-active:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:data-active:text-red-300 [&>svg]:text-current" },
    ],
  },
  {
    titulo: "Facturación",
    icon: Wallet,
    items: [
      { label: "Facturas de Clientes", href: "/facturas-clientes", icon: Receipt },
      { label: "Seguimiento de Facturas", href: "/seguimiento-facturas", icon: Money },
      { label: "Reporte de Facturas", href: "/reporte-facturas", icon: ClipboardText },
      { label: "Efectivo", href: "/efectivo", icon: Coin1, claseColor: "text-green-600 hover:text-green-700 data-active:text-green-700 dark:text-green-400 dark:hover:text-green-300 dark:data-active:text-green-300 [&>svg]:text-current" },
    ],
  },
  {
    titulo: "Informes",
    icon: ClipboardText,
    items: [
      { label: "Historial", href: "/historial", icon: Clock },
      { label: "Reportes", href: "/reportes", icon: Chart },
      { label: "Registro de Acciones", href: "/registro-acciones", icon: Hierarchy },
      { label: "Reporte Equipos", href: "/reporte-equipos", icon: Monitor },
      { label: "Centro de notificaciones", href: "/notificaciones", icon: Notification },
    ],
  },
];

/** Solo visible para administradores (y superadmins): se inserta tras
    "Facturación" en sidebar.tsx y se suma al buscador (layout.tsx). */
export const GRUPO_CONTABILIDAD: GrupoNavegacion = {
  titulo: "Contabilidad",
  icon: Bank,
  claseIcono: "text-green-600 dark:text-green-400",
  items: [
    { label: "Asientos", href: "/contabilidad/asientos", icon: DocumentText },
    { label: "Libro Diario", href: "/contabilidad/diario", icon: Book1 },
    { label: "Libro Mayor", href: "/contabilidad/mayor", icon: ClipboardText },
    { label: "Sumas y Saldos", href: "/contabilidad/sumas-saldos", icon: Chart },
    { label: "Partidas pendientes", href: "/contabilidad/pendientes", icon: Wallet },
    { label: "Efectivo y caja", href: "/contabilidad/efectivo", icon: Coin1 },
    { label: "Plan contable", href: "/contabilidad/plan", icon: Hierarchy },
    { label: "Reglas contables", href: "/contabilidad/reglas", icon: Setting2 },
    { label: "Periodos y auditoría", href: "/contabilidad/periodos", icon: Clock },
    { label: "Libro de Compras", href: "/facturas-recibidas", icon: Book1 },
    { label: "Importaciones / DUA", href: "/importaciones", icon: Airplane },
    { label: "Gastos / Compras", href: null, icon: ReceiptItem },
  ],
};

/** Solo se añade al menú para cuentas superadmin (ver sidebar.tsx) —
    reemplaza el borrado manual que antes se hacía directamente en las
    pestañas azules del Sheet original, solo accesible entonces a quien
    tuviera acceso de administrador a ese Sheet. */
export const GRUPO_ADMIN: GrupoNavegacion = {
  titulo: "Admin",
  icon: Trash,
  items: [
    { label: "Eliminar Registros", href: "/admin/registros", icon: Trash },
    { label: "Backups", href: "/admin/backups", icon: Save2 },
  ],
};

/** Solo administradores: se añade al final de "Informes". Amarillo, como las
    opciones destacadas (Compras en rojo, Efectivo en verde). */
export const ITEM_RESENAS: ItemNavegacion = {
  label: "Reporte de reseñas",
  href: "/reporte-resenas",
  icon: Star1,
  claseColor: "text-amber-500 hover:text-amber-600 data-active:text-amber-600 dark:text-yellow-400 dark:hover:text-yellow-300 dark:data-active:text-yellow-300 [&>svg]:text-current",
};

/** Menú según el rol: Contabilidad (tras Facturación) y Reporte de reseñas
    (en Informes) solo para admins; el grupo Admin solo para superadmins. */
export function gruposVisibles({ esAdmin, superadmin }: { esAdmin: boolean; superadmin: boolean }): GrupoNavegacion[] {
  const base = GRUPOS.flatMap((g) => {
    if (esAdmin && g.titulo === "Facturación") return [g, GRUPO_CONTABILIDAD];
    if (esAdmin && g.titulo === "Informes") return [{ ...g, items: [...g.items, ITEM_RESENAS] }];
    return [g];
  });
  return superadmin ? [...base, GRUPO_ADMIN] : base;
}

