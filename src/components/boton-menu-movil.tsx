"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/**
 * Botón para abrir el menú en el teléfono. En pantallas pequeñas el menú lateral queda escondido, así que cada cabecera
 * necesita el suyo (en el ordenador no se ve: el menú ya tiene su propio botón para plegarse).
 */
export function BotonMenuMovil({ className }: { className?: string }) {
  return (
    <SidebarTrigger
      aria-label="Abrir el menú"
      className={cn("-ml-1 size-9 shrink-0 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground md:hidden", className)}
    />
  );
}
