"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Organizacion } from "@/lib/agentes-v2";

const CLAVE_LOCALSTORAGE = "kelatos-agentes-v2-organizacion";

interface OrganizacionContextValue {
  organizaciones: Organizacion[];
  organizacionId: string | null;
  organizacion: Organizacion | null;
  cargando: boolean;
  error: string | null;
  seleccionar: (id: string) => void;
  recargar: () => Promise<void>;
}

const OrganizacionContext = createContext<OrganizacionContextValue | null>(null);

/**
 * Organización activa ("workspace") en Agentes V2: cada mini-empresa/marca tiene su propia web, su propio
 * Instagram y su propia cola de contenido — esto es lo que decide cuál ve el usuario en cada pantalla.
 *
 * La selección se guarda en localStorage (por navegador, no por usuario) y se lee también fuera de React, desde
 * use-v2.ts (leerOrganizacionActual), para que useV2/enviarV2 puedan añadirla a cada petición sin que las ~15
 * pantallas que ya los usan tengan que cambiar una por una.
 */
export function OrganizacionProvider({ children }: { children: ReactNode }) {
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [organizacionId, setOrganizacionId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/agentes-v2/organizations", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      const lista = data.organizations as Organizacion[];
      setOrganizaciones(lista);
      setOrganizacionId((actual) => {
        const guardada = actual ?? (typeof window !== "undefined" ? window.localStorage.getItem(CLAVE_LOCALSTORAGE) : null);
        const sigueExistiendo = guardada && lista.some((o) => o.id === guardada);
        return sigueExistiendo ? guardada : (lista[0]?.id ?? null);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const seleccionar = useCallback((id: string) => {
    setOrganizacionId(id);
    try {
      window.localStorage.setItem(CLAVE_LOCALSTORAGE, id);
    } catch {
      /* almacenamiento no disponible (modo privado, etc.): la selección solo dura esta pestaña */
    }
  }, []);

  const organizacion = useMemo(() => organizaciones.find((o) => o.id === organizacionId) ?? null, [organizaciones, organizacionId]);

  return (
    <OrganizacionContext.Provider value={{ organizaciones, organizacionId, organizacion, cargando, error, seleccionar, recargar }}>
      {children}
    </OrganizacionContext.Provider>
  );
}

export function useOrganizacion(): OrganizacionContextValue {
  const ctx = useContext(OrganizacionContext);
  if (!ctx) throw new Error("useOrganizacion debe usarse dentro de <OrganizacionProvider>");
  return ctx;
}

/** Lee la organización activa fuera de React (use-v2.ts): mismo localStorage que el Provider. */
export function leerOrganizacionActual(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_LOCALSTORAGE);
  } catch {
    return null;
  }
}
