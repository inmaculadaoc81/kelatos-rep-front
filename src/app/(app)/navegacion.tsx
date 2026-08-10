import {
  Category,
  Setting2,
  DocumentText,
  Profile2User,
  Box1,
  ShoppingCart,
  Truck,
  Clock,
  Chart,
  Receipt,
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
  items: ItemNavegacion[];
}

// Fuente única del menú lateral y de las migas: refleja el checklist de
// migración módulo por módulo.
export const GRUPOS: GrupoNavegacion[] = [
  {
    titulo: "General",
    items: [{ label: "Resumen", href: "/", icon: Category }],
  },
  {
    titulo: "Reparaciones",
    items: [
      { label: "Todas las Reparaciones", href: "/reparaciones", icon: Setting2 },
      { label: "Presupuestos", href: null, icon: DocumentText },
      { label: "Recogidas", href: "/recogidas", icon: Truck },
    ],
  },
  {
    titulo: "Catálogos",
    items: [
      { label: "Clientes", href: "/clientes", icon: Profile2User },
      { label: "Equipos y Alquileres", href: "/equipos", icon: Box1 },
      { label: "Productos e Inventario", href: "/productos", icon: Box1 },
      { label: "Ventas", href: "/ventas", icon: ShoppingCart },
    ],
  },
  {
    titulo: "Registros",
    items: [
      { label: "Historial", href: "/historial", icon: Clock },
      { label: "Reportes", href: "/reportes", icon: Chart },
      { label: "Seguimiento de Facturas", href: "/seguimiento-facturas", icon: Receipt },
    ],
  },
  {
    titulo: "Facturación",
    items: [{ label: "Facturación", href: null, icon: Wallet }],
  },
];
