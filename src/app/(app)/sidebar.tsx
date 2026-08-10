"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
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

// Refleja el checklist de migración módulo por módulo. `href: null` =
// todavía no construido en Next.js (sigue solo en el Dashboard Apps
// Script original).
const GRUPOS: { titulo: string; items: { label: string; href: string | null; icon: React.ElementType }[] }[] = [
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

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Category className="size-5 shrink-0 text-sidebar-primary" />
          <span className="font-semibold group-data-[collapsible=icon]:hidden">Kelatos</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {GRUPOS.map((grupo) => (
          <SidebarGroup key={grupo.titulo}>
            <SidebarGroupLabel>{grupo.titulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.items.map((item) => {
                  const Icon = item.icon;
                  if (!item.href) {
                    return (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton disabled tooltip={item.label}>
                          <Icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        <SidebarMenuBadge className="text-[10px] text-sidebar-foreground/50">pronto</SidebarMenuBadge>
                      </SidebarMenuItem>
                    );
                  }
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label} render={<Link href={item.href} />}>
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
