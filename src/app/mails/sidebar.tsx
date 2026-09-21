"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Sms, Setting2, Building } from "@/lib/icons";
import { NavUser } from "../(app)/nav-user";

const ITEMS: { label: string; href: string | null; icon: typeof Sms }[] = [
  { label: "Centro de mails", href: "/mails/bandeja", icon: Sms },
  { label: "Leads", href: "/mails/leads", icon: Building },
  { label: "Buzones", href: "/mails/buzones", icon: Setting2 },
];

/** Sidebar de Gestión MAILS — mismo esquema que el de Agentes (logo +
    trigger arriba, menú, NavUser abajo). */
export function MailsSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-sidebar-foreground">
            <Sms className="size-4 text-sidebar-primary" />
            <span>Gestión MAILS</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuSub className="mx-0 gap-1.5 border-none px-0">
                {ITEMS.map((item) => {
                  const Icono = item.icon;
                  if (!item.href) {
                    return (
                      <SidebarMenuSubItem key={item.label}>
                        <SidebarMenuSubButton className="pointer-events-none opacity-60" aria-disabled>
                          <Icono />
                          <span className="truncate">{item.label}</span>
                          <span className="ml-auto text-[10px] text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">pronto</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  }
                  return (
                    <SidebarMenuSubItem key={item.label}>
                      <SidebarMenuSubButton isActive={pathname?.startsWith(item.href) ?? false} render={<Link href={item.href} />}>
                        <Icono />
                        <span className="truncate">{item.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
