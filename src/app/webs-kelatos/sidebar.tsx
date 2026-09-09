"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "next-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Add, ArrowDown2, Global, Link2, Receipt, Tag } from "@/lib/icons";
import { toast } from "sonner";
import { SitioWeb } from "@/lib/webs-kelatos";
import { CatalogoServicios } from "@/lib/catalogos-servicios";
import { NavUser } from "../(app)/nav-user";

const SIN_TIPO = "Otras webs";

function agruparPorTipo(sitios: SitioWeb[]): { tipo: string; sitios: SitioWeb[] }[] {
  const grupos = new Map<string, SitioWeb[]>();
  for (const sitio of sitios) {
    const clave = sitio.tipo || SIN_TIPO;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave)!.push(sitio);
  }
  return Array.from(grupos.entries()).map(([tipo, sitios]) => ({ tipo, sitios }));
}

/** Grupo colapsable por marca/tipo — mismo patrón que GrupoColapsable del
    sidebar de Reparaciones ((app)/sidebar.tsx): icono + nombre del grupo
    arriba, las webs de ese tipo debajo al desplegar. Petición del usuario,
    2026-09-09: "el sidebar que sea como en reparaciones... por tipo", y
    después "hazlos así, iconos, no círculos" — mismos iconos planos que
    Reparaciones/Catálogos, sin avatares de color. */
function GrupoTipo({ tipo, sitios, pathname }: { tipo: string; sitios: SitioWeb[]; pathname: string }) {
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={tipo}
          className="hover:bg-transparent hover:text-sidebar-foreground"
          render={<CollapsibleTrigger className="group/trigger" />}
        >
          <Tag className="text-sidebar-primary" />
          <span>{tipo}</span>
          <ArrowDown2 className="ml-auto size-3.5 text-sidebar-foreground/50 transition-transform group-data-panel-open/trigger:rotate-180" />
        </SidebarMenuButton>
        <CollapsibleContent>
          <SidebarMenuSub className="mx-2 gap-1.5 border-sidebar-primary/55 px-2">
            {sitios.map((sitio) => {
              const href = `/webs-kelatos/${sitio.id}`;
              return (
                <SidebarMenuSubItem key={sitio.id}>
                  <SidebarMenuSubButton isActive={pathname === href} render={<Link href={href} />}>
                    <Link2 />
                    <span className="truncate">{sitio.nombre}</span>
                    <span
                      className={`ml-auto size-2 shrink-0 rounded-full ${sitio.totalProductos > 0 ? "bg-emerald-500" : "bg-red-500"}`}
                      title={sitio.totalProductos > 0 ? `${sitio.totalProductos} producto${sitio.totalProductos !== 1 ? "s" : ""}` : "Sin productos todavía"}
                    />
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/** Sidebar dinámico: una página por cada web de Kelatos (kelatos_app.sitios_web) —
    petición del usuario, 2026-09-09, mismo componente de shadcn Sidebar
    que ya usan Transferencias/Asistencias. */
export function WebsKelatosSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sitios, setSitios] = useState<SitioWeb[]>([]);
  const [cargando, setCargando] = useState(true);

  // "Servicios" — catálogos de precios compartidos por marca, aparte de
  // las webs (sitios_web) de arriba. Petición del usuario, 2026-09-09.
  const [catalogos, setCatalogos] = useState<CatalogoServicios[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [nuevoCatalogoAbierto, setNuevoCatalogoAbierto] = useState(false);
  const [nuevoCatalogoNombre, setNuevoCatalogoNombre] = useState("");
  const [creandoCatalogo, setCreandoCatalogo] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/sitios-web");
      const data = await res.json();
      if (data.ok) setSitios(data.sitios as SitioWeb[]);
    } catch {
      // silencioso — la vista principal ya muestra su propio error si hace falta
    } finally {
      setCargando(false);
    }
  }

  async function cargarCatalogos() {
    setCargandoCatalogos(true);
    try {
      const res = await fetch("/api/catalogos-servicios");
      const data = await res.json();
      if (data.ok) setCatalogos(data.catalogos as CatalogoServicios[]);
    } catch {
      // silencioso
    } finally {
      setCargandoCatalogos(false);
    }
  }

  useEffect(() => {
    cargar();
    cargarCatalogos();
  }, []);

  async function crearCatalogo() {
    if (!nuevoCatalogoNombre.trim()) return toast.error("El nombre es obligatorio");
    setCreandoCatalogo(true);
    try {
      const res = await fetch("/api/catalogos-servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoCatalogoNombre.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Catálogo creado");
      setNuevoCatalogoAbierto(false);
      setNuevoCatalogoNombre("");
      await cargarCatalogos();
      router.push(`/webs-kelatos/servicios/${data.catalogo.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCreandoCatalogo(false);
    }
  }

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
          {/* Grupo colapsable: "Servicios" arriba, sus catálogos como
              children debajo — mismo patrón que los grupos por marca de
              "Webs". El "+" queda fuera del disparador de colapsar, como
              botón hermano, para no anidar un botón dentro de otro.
              Petición del usuario, 2026-09-09: "los servicios tienen que
              estar arriba... es Servicios y luego sus children son los
              servicios que estan ahi", e icono distinto para el "+". */}
          <Collapsible defaultOpen className="group/servicios">
            <SidebarGroupLabel className="flex items-center justify-between gap-2 p-0 text-sidebar-foreground">
              <CollapsibleTrigger className="group/trigger flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:text-sidebar-primary">
                <Receipt className="size-4 text-sidebar-primary" />
                <span>Servicios</span>
                <ArrowDown2 className="ml-auto size-3.5 text-sidebar-foreground/50 transition-transform group-data-panel-open/trigger:rotate-180" />
              </CollapsibleTrigger>
              <button
                type="button"
                onClick={() => setNuevoCatalogoAbierto(true)}
                className="mr-1 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-primary"
                title="Añadir catálogo"
              >
                <Add className="size-4" />
              </button>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                {!cargandoCatalogos && catalogos.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                    Sin catálogos todavía
                  </p>
                )}
                <SidebarMenuSub className="mx-2 gap-1.5 border-sidebar-primary/55 px-2">
                  {catalogos.map((catalogo) => {
                    const href = `/webs-kelatos/servicios/${catalogo.id}`;
                    return (
                      <SidebarMenuSubItem key={catalogo.id}>
                        <SidebarMenuSubButton isActive={pathname === href} render={<Link href={href} />}>
                          <Link2 />
                          <span className="truncate">{catalogo.nombre}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          {/* Mismo estilo que los encabezados de grupo de Reparaciones
              (icono en color de marca + título) — petición del usuario,
              2026-09-09. Sin botón "+": las webs se dan de alta por
              importación/código, no desde aquí. */}
          <SidebarGroupLabel className="flex items-center gap-2 text-sidebar-foreground">
            <Global className="size-4 text-sidebar-primary" /> Webs
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {!cargando && sitios.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                  Sin webs todavía
                </p>
              )}
              {agruparPorTipo(sitios).map((grupo) => (
                <GrupoTipo key={grupo.tipo} tipo={grupo.tipo} sitios={grupo.sitios} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <NavUser session={session} />

      <Dialog open={nuevoCatalogoAbierto} onOpenChange={(o) => { if (!creandoCatalogo) setNuevoCatalogoAbierto(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-4.5" /> Nuevo catálogo de servicios
          </DialogTitle>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nuevoCatalogoNombre">Nombre *</Label>
              <Input
                id="nuevoCatalogoNombre"
                placeholder="Ej: Servicios Surface"
                value={nuevoCatalogoNombre}
                onChange={(e) => setNuevoCatalogoNombre(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNuevoCatalogoAbierto(false)} disabled={creandoCatalogo}>Cancelar</Button>
            <Button onClick={crearCatalogo} disabled={creandoCatalogo}>{creandoCatalogo ? "Creando..." : "Crear catálogo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
