import {
  Setting2,
  ClipboardTick,
  BoxTick,
  Folder2,
  DocumentText,
  Profile2User,
  Sms,
  Box1,
  Box,
  BoxSearch,
  Element3,
  Refresh2,
  ShoppingCart,
  Truck,
  Clock,
  Chart,
  Receipt,
  Money,
  Coin1,
  CardPos,
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
  Call,
  Diagram,
  Calendar,
} from "@/lib/icons";

export interface ItemNavegacion {
  label: string;
  /** `null` = todavía no construido en Next.js (sigue solo en Apps Script). */
  href: string | null;
  icon: React.ElementType;
  /** Clases opcionales para destacar un item (p. ej. texto en verde). */
  claseColor?: string;
  /** Permiso que decide si se ve (solo cuando su módulo ya está migrado a permisos). */
  permiso?: string;
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
      { label: "Todas las Reparaciones", href: "/reparaciones", icon: ClipboardTick, permiso: "reparaciones.ver" },
      { label: "Historial", href: "/historial", icon: Clock, permiso: "reparaciones.ver" },
      { label: "Transferencias", href: "/reparaciones/cobros", icon: Wallet, permiso: "reparaciones.ver" },
      { label: "Presupuestos", href: "/presupuestos", icon: DocumentText, permiso: "reparaciones.ver" },
      { label: "Recogidas", href: "/recogidas", icon: Truck, permiso: "reparaciones.ver" },
      { label: "Punto Limpio", href: "/punto-limpio", icon: Trash, permiso: "reparaciones.ver" },
      { label: "Casilleros", href: "/casilleros", icon: Box1, permiso: "reparaciones.ver" },
    ],
  },
  {
    titulo: "Catálogos",
    icon: Box1,
    items: [
      { label: "Clientes", href: "/clientes", icon: Profile2User, permiso: "clientes.ver" },
      { label: "Proveedores", href: "/proveedores", icon: Truck, permiso: "clientes.ver" },
      { label: "Formulario Web", href: "/formulario-web", icon: ScanBarcode, permiso: "clientes.ver" },
      { label: "Equipos y Alquileres", href: "/equipos", icon: Box1, permiso: "equipos.ver" },
      { label: "Ventas", href: "/ventas", icon: ShoppingCart, permiso: "ventas.ver" },
    ],
  },
  {
    titulo: "Stock",
    icon: BoxSearch,
    items: [
      { label: "Stock de Piezas", href: "/stock-piezas", icon: Element3, permiso: "stock.ver" },
      { label: "Movimientos de stock", href: "/stock-movimientos", icon: Refresh2, permiso: "stock.ver" },
      { label: "Compras", href: "/compras", icon: MoneySend, permiso: "compras.ver", claseColor: "text-red-600 hover:text-red-700 data-active:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:data-active:text-red-300 [&>svg]:text-current" },
    ],
  },
  {
    titulo: "Facturación",
    icon: Wallet,
    items: [
      { label: "Facturas de Clientes", href: "/facturas-clientes", icon: Receipt, permiso: "facturacion.ver" },
      { label: "Seguimiento de Facturas", href: "/seguimiento-facturas", icon: Money, permiso: "facturacion.ver" },
      { label: "Reporte de Facturas", href: "/reporte-facturas", icon: ClipboardText, permiso: "facturacion.ver" },
      { label: "Efectivo", href: "/efectivo", icon: Coin1, permiso: "efectivo.ver", claseColor: "text-green-600 hover:text-green-700 data-active:text-green-700 dark:text-green-400 dark:hover:text-green-300 dark:data-active:text-green-300 [&>svg]:text-current" },
      { label: "Facturación del día", href: "/tpv", icon: CardPos, permiso: "efectivo.ver", claseColor: "text-purple-600 hover:text-purple-700 data-active:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 dark:data-active:text-purple-300 [&>svg]:text-current" },
    ],
  },
  {
    titulo: "Recursos Humanos",
    icon: Profile2User,
    items: [
      { label: "Mi correo", href: "/rrhh/correo", icon: Sms },
      { label: "Comunicados", href: "/rrhh/comunicados", icon: Notification },
    ],
  },
  {
    titulo: "Informes",
    icon: ClipboardText,
    items: [
      { label: "Reportes", href: "/reportes", icon: Chart, permiso: "informes.ver" },
      { label: "Registro de Acciones", href: "/registro-acciones", icon: Hierarchy, permiso: "informes.ver" },
      { label: "Reporte Equipos", href: "/reporte-equipos", icon: Monitor, permiso: "informes.ver" },
      { label: "Reporte de ítems", href: "/reporte-items", icon: ReceiptItem, permiso: "informes.ver" },
      { label: "Centro de notificaciones", href: "/notificaciones", icon: Notification, permiso: "informes.ver" },
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
    { label: "Compras y pagos", href: "/contabilidad/compras", icon: MoneySend },
    { label: "Pagos a proveedores", href: "/contabilidad/pagos-proveedores", icon: Wallet },
    { label: "Clientes y proveedores", href: "/contabilidad/terceros", icon: Profile2User },
    { label: "Balance y resultados", href: "/contabilidad/balance", icon: Element3 },
    { label: "Libro de IVA", href: "/contabilidad/iva", icon: ReceiptItem },
    { label: "Inmovilizado", href: "/contabilidad/inmovilizado", icon: Box },
    { label: "Partidas pendientes", href: "/contabilidad/pendientes", icon: Wallet },
    { label: "Conciliación TPV", href: "/contabilidad/tpv", icon: CardPos },
    { label: "Devoluciones", href: "/contabilidad/devoluciones", icon: MoneySend },
    { label: "Facturas atrasadas", href: "/contabilidad/facturas-atrasadas", icon: Calendar },
    { label: "Cierre de ejercicio", href: "/contabilidad/cierre", icon: Save2 },
    { label: "Efectivo y caja", href: "/contabilidad/efectivo", icon: Coin1 },
    { label: "Plan contable", href: "/contabilidad/plan", icon: Hierarchy },
    { label: "Reglas contables", href: "/contabilidad/reglas", icon: Setting2 },
    { label: "Periodos y auditoría", href: "/contabilidad/periodos", icon: Clock },
    { label: "Libro de Compras", href: "/facturas-recibidas", icon: Book1 },
    { label: "Importaciones / DUA", href: "/importaciones", icon: Airplane },
    { label: "Arquitectura del módulo", href: "/contabilidad/arquitectura", icon: Diagram },
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
    { label: "Estado de bots", href: "/admin/bots", icon: Monitor },
  ],
};

/** Solo administradores: se añade al final de "Informes". Amarillo, como las
    opciones destacadas (Compras en rojo, Efectivo en verde). */
/** Solo superadmins: llamadas de personas e IA con su transcripción. */
export const ITEM_LLAMADAS: ItemNavegacion = { label: "Llamadas", href: "/llamadas", icon: Call, permiso: "llamadas.ver" };

export const ITEM_RESENAS: ItemNavegacion = {
  label: "Reporte de reseñas",
  href: "/reporte-resenas",
  icon: Star1,
  permiso: "informes.resenas",
  claseColor: "text-amber-500 hover:text-amber-600 data-active:text-amber-600 dark:text-yellow-400 dark:hover:text-yellow-300 dark:data-active:text-yellow-300 [&>svg]:text-current",
};

/** Grupo mínimo para cuentas con puedeVerEfectivoSoloLectura (ver
    superadmin.ts): un único enlace, nada más del módulo — no reutiliza
    GRUPO_CONTABILIDAD a propósito, que listaría 19 secciones a las que
    esta cuenta no tiene acceso (la ruta ya las bloquea, pero no tiene
    sentido ni mostrarlas). */
const GRUPO_EFECTIVO_SOLO_LECTURA: GrupoNavegacion = {
  titulo: "Contabilidad",
  icon: Bank,
  claseIcono: "text-green-600 dark:text-green-400",
  items: [{ label: "Efectivo y caja", href: "/contabilidad/efectivo", icon: Coin1 }],
};

/** Menú según el rol: Contabilidad (tras Informes) y Reporte de reseñas
    (en Informes) solo para admins; el grupo Admin solo para superadmins;
    Efectivo y caja en solitario para puedeVerEfectivoSoloLectura. */
/** Entrada "Equipos entregados" de Reparaciones: solo administradores y la cuenta de empleados (ver puedeVerEquiposEntregados). */
/** Extractor de discos de clientes: solo Romer, Iván, Ricardo, soporte y superadmins (ver puedeVerExtractorDiscos). */
const ITEM_EXTRACTOR: ItemNavegacion = { label: "Extractor de discos", href: "/extractor-discos", icon: Folder2 };
const ITEM_EQUIPOS_ENTREGADOS: ItemNavegacion = { label: "Equipos entregados", href: "/equipos-entregados", icon: BoxTick };

export function gruposVisibles({
  esAdmin, superadmin, efectivoSoloLectura = false, equiposEntregados = false, extractorDiscos = false, permisos,
}: { esAdmin: boolean; superadmin: boolean; efectivoSoloLectura?: boolean; equiposEntregados?: boolean; extractorDiscos?: boolean; permisos?: Record<string, boolean> }): GrupoNavegacion[] {
  // `permisos` solo trae los permisos de módulos ya migrados; sin la clave se usa la regla de siempre.
  const usa = (clave: string, fallback: boolean) => (permisos && clave in permisos ? permisos[clave] : fallback);
  const base = GRUPOS.flatMap((g) => {
    if ((equiposEntregados || extractorDiscos) && g.titulo === "Reparaciones") {
      // Va justo después de "Recogidas" (antes de "Punto Limpio").
      const i = g.items.findIndex((it) => it.href === "/recogidas");
      const items = [...g.items];
      items.splice(i >= 0 ? i + 1 : items.length, 0, ...(equiposEntregados ? [ITEM_EQUIPOS_ENTREGADOS] : []), ...(extractorDiscos ? [ITEM_EXTRACTOR] : []));
      return [{ ...g, items }];
    }
    // Contabilidad (o Efectivo y caja) va justo DESPUÉS de Informes.
    if (g.titulo === "Informes") {
      const extra = [...(usa("informes.resenas", esAdmin) ? [ITEM_RESENAS] : []), ...(usa("llamadas.ver", esAdmin && superadmin) ? [ITEM_LLAMADAS] : [])];
      const informes = { ...g, items: [...g.items, ...extra] };
      if (esAdmin) return [informes, GRUPO_CONTABILIDAD];
      if (efectivoSoloLectura) return [informes, GRUPO_EFECTIVO_SOLO_LECTURA];
      return [informes];
    }
    // «Gestión de RRHH» en el menú solo para super admin; quien se añada al equipo la ve como pestaña dentro de la sección.
    if (g.titulo === "Recursos Humanos" && superadmin) return [{ ...g, items: [...g.items, { label: "Gestión de RRHH", href: "/rrhh/gestion", icon: Profile2User } as ItemNavegacion] }];
    return [g];
  });
  const visibles = (superadmin ? [...base, GRUPO_ADMIN] : base)
    .map((g) => ({ ...g, items: g.items.filter((it) => !(it.permiso && permisos && it.permiso in permisos && !permisos[it.permiso])) }))
    .filter((g) => g.items.length > 0);
  return visibles;
}
