"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchNormal1 } from "@/lib/icons";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { GRUPOS } from "./navegacion";

/**
 * Buscador global (⌘K / Ctrl+K) — reproduce el enlace directo a cualquier
 * página del menú lateral, como el "Dashboard" del navbar original pero
 * para todas las secciones, no solo esa. Solo lista páginas ya construidas
 * (href !== null); las que aún viven solo en Apps Script no aparecen,
 * igual que en el propio menú lateral.
 */
export function BuscadorGlobal() {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();

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
        <CommandInput placeholder="Busca una página..." />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          {GRUPOS.map((grupo) => {
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
