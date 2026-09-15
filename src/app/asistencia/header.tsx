"use client";

import { AsistenciaMigas } from "./migas";

/** Botón de mostrar/ocultar sidebar quitado de aquí — el propio
    AsistenciaSidebar ya trae el suyo en su cabecera (SidebarTrigger),
    tener los dos era un botón duplicado. Petición del usuario,
    2026-09-15. */
export function AsistenciaHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4 shadow-sm">
      <AsistenciaMigas />
    </header>
  );
}
