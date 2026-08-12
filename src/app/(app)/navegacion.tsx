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
  ClipboardText,
  Wallet,
  Hierarchy,
  Monitor,
  ScanBarcode,
} from "@/lib/icons";

export interface ItemNavegacion {
  label: string;
  /** `null` = todavía no construido en Next.js (sigue solo en Apps Script). */
  href: string | null;
  icon: React.ElementType;
}

export interface GrupoNavegacion {
  titulo: string;
  /** Icono del encabezado — solo se pinta cuando el grupo tiene más de un item. */
  icon: React.ElementType;
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
    ],
  },
  {
    titulo: "Catálogos",
    icon: Box1,
    items: [
      { label: "Clientes", href: "/clientes", icon: Profile2User },
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
    ],
  },
  {
    titulo: "Facturación",
    icon: Wallet,
    items: [
      { label: "Facturas de Clientes", href: "/facturas-clientes", icon: Receipt },
      { label: "Seguimiento de Facturas", href: "/seguimiento-facturas", icon: Money },
      { label: "Reporte de Facturas", href: "/reporte-facturas", icon: ClipboardText },
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
    ],
  },
];
