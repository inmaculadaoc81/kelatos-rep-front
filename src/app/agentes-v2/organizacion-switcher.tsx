"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { Add, ArrowDown2, Building, TickCircle } from "@/lib/icons";
import { useOrganizacion } from "./organizacion-context";

/**
 * Selector de organización ("workspace"), estilo selector de equipo (Vercel/Notion): un
 * botón con la organización activa que despliega una lista buscable con la marca de
 * verificación en la actual, y un acceso para crear una nueva al final, fuera de la
 * búsqueda (como "Create Team"). Vive en el sidebar, no en el header, para que se vea
 * igual de prominente en cualquier pantalla de Agentes V2.
 */
export function OrganizacionSwitcher() {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();
  const { organizaciones, organizacion, organizacionId, cargando, seleccionar } = useOrganizacion();

  if (cargando && !organizaciones.length) return <Skeleton className="h-10 w-full rounded-lg" />;
  if (!organizaciones.length) return null;

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-transparent px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-border/40 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-foreground/10 text-sidebar-foreground/70">
              <Building className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-left font-medium text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {organizacion?.name || "Sin organización"}
            </span>
            <ArrowDown2 className="size-3.5 shrink-0 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
          </button>
        }
      />
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Buscar organización..." />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {organizaciones.map((o) => (
                <CommandItem key={o.id} value={o.name} onSelect={() => { seleccionar(o.id); setAbierto(false); }}>
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Building className="size-3" />
                  </span>
                  {/* Varias organizaciones comparten el mismo prefijo largo ("Servicio Técnico de Ordenadores…") y
                      lo único que las distingue es el final del nombre (Lenovo/HP/Asus/Dell…) — con truncate de una
                      sola línea, el recorte se comía justo esa parte y todas se veían iguales en la lista (bug
                      real reportado 2026-10-01). Deja que el nombre pase a una segunda línea en vez de recortarlo. */}
                  <span className="flex-1 text-pretty wrap-break-word leading-snug">{o.name}</span>
                  {o.id === organizacionId && <TickCircle className="size-4 shrink-0 text-primary" variant="Bold" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="border-t p-1">
          <button
            type="button"
            onClick={() => { setAbierto(false); router.push("/agentes-v2/organizaciones"); }}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Add className="size-4" /> Crear organización
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
