import {
  Category,
  Setting2,
  ClipboardTick,
  DocumentText,
  Profile2User,
  Box1,
  Box,
  ShoppingCart,
  Truck,
  Clock,
  Chart,
  Receipt,
  ClipboardText,
  Wallet,
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
export const GRUPOS: GrupoNavegacion[] = [
  {
    titulo: "General",
    icon: Category,
    items: [{ label: "Resumen", href: "/", icon: Category }],
  },
  {
    titulo: "Reparaciones",
    icon: Setting2,
    items: [
      { label: "Todas las Reparaciones", href: "/reparaciones", icon: ClipboardTick },
      { label: "Presupuestos", href: null, icon: DocumentText },
      { label: "Recogidas", href: "/recogidas", icon: Truck },
    ],
  },
  {
    titulo: "Catálogos",
    icon: Box1,
    items: [
      { label: "Clientes", href: "/clientes", icon: Profile2User },
      { label: "Equipos y Alquileres", href: "/equipos", icon: Box1 },
      { label: "Productos e Inventario", href: "/productos", icon: Box },
      { label: "Ventas", href: "/ventas", icon: ShoppingCart },
    ],
  },
  {
    titulo: "Registros",
    icon: ClipboardText,
    items: [
      { label: "Historial", href: "/historial", icon: Clock },
      { label: "Reportes", href: "/reportes", icon: Chart },
      { label: "Seguimiento de Facturas", href: "/seguimiento-facturas", icon: Receipt },
    ],
  },
  {
    titulo: "Facturación",
    icon: Wallet,
    items: [{ label: "Facturación", href: null, icon: Wallet }],
  },
];
