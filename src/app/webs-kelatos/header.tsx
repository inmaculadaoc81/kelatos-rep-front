"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Global } from "@/lib/icons";

/** Top-bar simple (hamburguesa + título) — el nombre de la web activa ya
    se ve en el propio sidebar resaltado y en el encabezado de cada página. */
export function WebsKelatosHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4 shadow-sm">
      <SidebarTrigger />
      <h1 className="flex items-center gap-1.5 text-sm font-semibold">
        <Global className="size-4" /> Webs Kelatos
      </h1>
    </header>
  );
}
