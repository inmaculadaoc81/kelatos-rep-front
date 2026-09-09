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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AddCircle, Global } from "@/lib/icons";
import { toast } from "sonner";
import { SitioWeb } from "@/lib/webs-kelatos";
import { NavUser } from "../(app)/nav-user";

const COLORES_AVATAR = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
];

function colorPara(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  return COLORES_AVATAR[hash % COLORES_AVATAR.length];
}

/** Sidebar dinámico: una página por cada web de Kelatos (kelatos_app.sitios_web) —
    petición del usuario, 2026-09-09, mismo componente de shadcn Sidebar
    que ya usan Transferencias/Asistencias, con un "+" para dar de alta
    webs nuevas sin tocar código. */
export function WebsKelatosSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sitios, setSitios] = useState<SitioWeb[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [url, setUrl] = useState("");
  const [creando, setCreando] = useState(false);

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

  useEffect(() => {
    cargar();
  }, []);

  async function crearSitio() {
    if (!nombre.trim()) return toast.error("El nombre es obligatorio");
    setCreando(true);
    try {
      const res = await fetch("/api/sitios-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), url: url.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Web creada");
      setNuevaAbierta(false);
      setNombre("");
      setUrl("");
      await cargar();
      router.push(`/webs-kelatos/${data.sitio.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCreando(false);
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
        <p className="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          <Global className="size-3.5" /> Webs Kelatos
        </p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            Webs
            <button
              type="button"
              onClick={() => setNuevaAbierta(true)}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
              title="Añadir web"
            >
              <AddCircle className="size-4" />
            </button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {!cargando && sitios.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                  Sin webs todavía
                </p>
              )}
              {sitios.map((sitio) => {
                const href = `/webs-kelatos/${sitio.id}`;
                const activo = pathname === href;
                return (
                  <SidebarMenuItem key={sitio.id}>
                    <SidebarMenuButton isActive={activo} tooltip={sitio.nombre} render={<Link href={href} />}>
                      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${colorPara(sitio.nombre)}`}>
                        {sitio.nombre.slice(0, 1).toUpperCase()}
                      </span>
                      <span>{sitio.nombre}</span>
                    </SidebarMenuButton>
                    {sitio.totalProductos > 0 && <SidebarMenuBadge>{sitio.totalProductos}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <NavUser session={session} />

      <Dialog open={nuevaAbierta} onOpenChange={(o) => { if (!creando) setNuevaAbierta(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="flex items-center gap-2">
            <Global className="size-4.5" /> Nueva web
          </DialogTitle>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nuevaWebNombre">Nombre *</Label>
              <Input id="nuevaWebNombre" placeholder="Ej: Lenovotech" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nuevaWebUrl">URL (opcional)</Label>
              <Input id="nuevaWebUrl" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNuevaAbierta(false)} disabled={creando}>Cancelar</Button>
            <Button onClick={crearSitio} disabled={creando}>{creando ? "Creando..." : "Crear web"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
