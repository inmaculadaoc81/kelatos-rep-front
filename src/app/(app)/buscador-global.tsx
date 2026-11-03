"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchNormal1, Profile } from "@/lib/icons";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { gruposVisibles } from "./navegacion";

/**
 * Buscador global (⌘K / Ctrl+K) — reproduce el enlace directo a cualquier
 * página del menú lateral, como el "Dashboard" del navbar original pero
 * para todas las secciones, no solo esa. Solo lista páginas ya construidas
 * (href !== null); las que aún viven solo en Apps Script no aparecen,
 * igual que en el propio menú lateral.
 */
interface ResultadosClientes {
  clientes: { codigo: string; nombre: string; dni_cif: string | null; telefono: string | null; email: string | null }[];
  reparaciones: { resguardo: string; cliente_nombre: string; cliente_telefono: string | null; equipo_modelo: string | null; estado: string | null }[];
  ventas: { venta_id: string; cliente_nombre: string | null; cliente_telefono: string | null; estado: string | null }[];
  alquileres: { alquiler_id: string; equipo_id: string | null; cliente_nombre: string | null; cliente_telefono: string | null; estado: string | null }[];
}

export function BuscadorGlobal({ esAdmin = false, efectivoSoloLectura = false, equiposEntregados = false }: { esAdmin?: boolean; efectivoSoloLectura?: boolean; equiposEntregados?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [encontrados, setEncontrados] = useState<ResultadosClientes | null>(null);

  // Clientes de todo el dashboard (catálogo, reparaciones, ventas y alquileres): se consulta al escribir, con una pequeña espera.
  useEffect(() => {
    const q = texto.trim();
    if (!abierto || q.length < 2) {
      setEncontrados(null);
      return;
    }
    let vigente = true;
    const t = setTimeout(() => {
      fetch(`/api/buscar-global?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => { if (vigente && d.ok) setEncontrados(d as ResultadosClientes); })
        .catch(() => undefined);
    }, 250);
    return () => { vigente = false; clearTimeout(t); };
  }, [texto, abierto]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAbierto((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function ir(href: string) {
    setAbierto(false);
    setTexto("");
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex h-8 w-full max-w-sm items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 text-sm text-primary-foreground/70 transition-colors hover:bg-primary-foreground/15"
      >
        <SearchNormal1 className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">Buscar en Kelatos...</span>
        <kbd className="hidden shrink-0 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-2 py-0.5 text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={abierto} onOpenChange={setAbierto} title="Buscar en Kelatos" description="Busca y navega a cualquier página del sistema">
        <CommandInput placeholder="Busca una página o un cliente (nombre, teléfono, correo, nº de reparación…)" value={texto} onValueChange={setTexto} />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          {encontrados && encontrados.clientes.length > 0 && (
            <CommandGroup heading="Clientes">
              {encontrados.clientes.map((c) => (
                <CommandItem key={`c-${c.codigo}`} value={`${texto} cliente ${c.codigo}`} onSelect={() => ir(`/clientes?buscar=${encodeURIComponent(c.nombre)}`)}>
                  <Profile className="size-4" />
                  <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{[c.telefono, c.email].filter(Boolean).join(" · ")}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {encontrados && encontrados.reparaciones.length > 0 && (
            <CommandGroup heading="Reparaciones">
              {encontrados.reparaciones.map((r) => (
                <CommandItem key={`r-${r.resguardo}`} value={`${texto} reparacion ${r.resguardo}`} onSelect={() => ir(`/reparaciones?resguardo=${encodeURIComponent(r.resguardo)}`)}>
                  <span className="min-w-0 flex-1 truncate">{r.cliente_nombre} <span className="text-muted-foreground">· {r.equipo_modelo || "equipo"}</span></span>
                  <span className="shrink-0 text-xs text-muted-foreground">#{r.resguardo}{r.estado ? ` · ${r.estado}` : ""}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {encontrados && encontrados.ventas.length > 0 && (
            <CommandGroup heading="Ventas">
              {encontrados.ventas.map((v) => (
                <CommandItem key={`v-${v.venta_id}`} value={`${texto} venta ${v.venta_id}`} onSelect={() => ir(`/ventas?buscar=${encodeURIComponent(v.venta_id)}`)}>
                  <span className="min-w-0 flex-1 truncate">{v.cliente_nombre || "Sin nombre"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{v.venta_id}{v.estado ? ` · ${v.estado}` : ""}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {encontrados && encontrados.alquileres.length > 0 && (
            <CommandGroup heading="Alquileres">
              {encontrados.alquileres.map((a) => (
                <CommandItem key={`a-${a.alquiler_id}`} value={`${texto} alquiler ${a.alquiler_id}`} onSelect={() => ir(`/equipos?equipo=${Number(String(a.equipo_id || "").replace(/\D/g, "")) || ""}`)}>
                  <span className="min-w-0 flex-1 truncate">{a.cliente_nombre || "Sin nombre"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{a.alquiler_id} · {a.equipo_id}{a.estado ? ` · ${a.estado}` : ""}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {gruposVisibles({ esAdmin, superadmin: false, efectivoSoloLectura, equiposEntregados }).map((grupo) => {
            const items = grupo.items.filter((item) => item.href);
            if (items.length === 0) return null;
            return (
              <CommandGroup key={grupo.titulo} heading={grupo.titulo}>
                {items.map((item) => {
                  const Icono = item.icon;
                  return (
                    <CommandItem key={item.href} value={`${grupo.titulo} ${item.label}`} onSelect={() => ir(item.href!)}>
                      <Icono className="size-4" />
                      {item.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
