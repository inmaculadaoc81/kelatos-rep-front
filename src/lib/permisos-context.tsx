"use client";

import { createContext, useContext } from "react";

/** Permisos efectivos de los módulos migrados (solo los que mandan), puestos por el layout. Sin proveedor o sin clave → se usa el sistema anterior. */
const PermisosContext = createContext<Record<string, boolean>>({});

export function PermisosProvider({ valor, children }: { valor: Record<string, boolean>; children: React.ReactNode }) {
  return <PermisosContext.Provider value={valor}>{children}</PermisosContext.Provider>;
}

export function usePermisos() {
  const permisos = useContext(PermisosContext);
  /** `fallback` = lo que decía el sistema anterior; solo se ignora cuando el permiso manda para este usuario. */
  const usa = (clave: string, fallback: boolean): boolean => (clave in permisos ? permisos[clave] : fallback);
  return { permisos, usa };
}
