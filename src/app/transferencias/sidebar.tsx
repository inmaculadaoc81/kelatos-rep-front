"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Clock, TickCircle, Wallet } from "@/lib/icons";
import { NavUser } from "../(app)/nav-user";

// Puerto del sidebar de "Transferencias-2" (index.html): 3 vistas —
// Pendientes / Conciliadas / Devoluciones — cada una con un contador,
// ahora con los componentes Sidebar de shadcn ya usados en el resto de
// kelatos-rep en vez del sidebar Bootstrap original.
export function TransferenciasSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [pendientes, setPendientes] = useState(0);
  const [conciliadas, setConciliadas] = useState(0);
  const [devolucionesPendientes, setDevolucionesPendientes] = useState(0);

  useEffect(() => {
    fetch("/api/transferencias/contador")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setPendientes(d.pendientes);
          setConciliadas(d.conciliadas);
        }
      })
      .catch(() => {});
    fetch("/api/devoluciones/contador")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setDevolucionesPendientes(d.pendientes);
      })
      .catch(() => {});
  }, [pathname]);

  const items = [
    { href: "/transferencias", label: "Pendientes", icon: Clock, badge: pendientes, badgeClase: "bg-destructive text-destructive-foreground" },
    { href: "/transferencias/conciliadas", label: "Conciliadas", icon: TickCircle, badge: conciliadas, badgeClase: "bg-emerald-600 text-white" },
    { href: "/transferencias/devoluciones", label: "Devoluciones", icon: Wallet, badge: devolucionesPendientes, badgeClase: "bg-amber-500 text-white" },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <Link
            href="/"
            className="flex h-10 items-center rounded-md bg-white px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5"
            aria-label="Volver a Reparaciones"
          >
            <Image
              src="/logos/kelatos.png"
              alt="Kelatos"
              width={290}
              height={82}
              priority
              unoptimized
              className="h-8 w-auto shrink-0 group-data-[collapsible=icon]:hidden"
            />
            <Image
              src="/logos/kelatos-icono.png"
              alt="Kelatos"
              width={81}
              height={82}
              priority
              unoptimized
              className="hidden h-7 w-auto shrink-0 group-data-[collapsible=icon]:block"
            />
          </Link>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </div>
        <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          Dashboard Transferencias
        </p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label} render={<Link href={item.href} />}>
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.badge > 0 && <SidebarMenuBadge className={item.badgeClase}>{item.badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
