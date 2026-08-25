"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TITULOS: Record<string, string> = {
  "/transferencias": "Pendientes",
  "/transferencias/conciliadas": "Conciliadas",
  "/transferencias/devoluciones": "Devoluciones",
};

/** Puerto de la top-bar del original (index.html): hamburguesa + título de la vista actual. */
export function TransferenciasHeader() {
  const pathname = usePathname();
  const titulo = TITULOS[pathname] || "Transferencias";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4 shadow-sm">
      <SidebarTrigger />
      <h1 className="text-sm font-semibold">{titulo}</h1>
    </header>
  );
}
