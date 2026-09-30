"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { leerOrganizacionActual, useOrganizacion } from "@/app/agentes-v2/organizacion-context";

/** Añade `organization_id` a una ruta de /api/agentes-v2/* (query, funciona igual en GET/POST/PUT/PATCH/DELETE
    y en las URLs de <img>/<video> que no pueden llevar cabeceras). Sin organización elegida, no se añade nada:
    el proxy y el backend caen entonces a la organización por defecto (mismo comportamiento que hasta ahora). */
function conOrganizacion(ruta: string, organizacionId: string | null): string {
  if (!organizacionId) return ruta;
  return `${ruta}${ruta.includes("?") ? "&" : "?"}organization_id=${organizacionId}`;
}

/** Carga un recurso de /api/agentes-v2/* y permite recargarlo. Se vuelve a cargar solo al cambiar de organización
    (ver <OrganizacionProvider>): las ~15 pantallas que ya usan este hook no necesitan tocarse para quedar aisladas
    por organización. */
export function useV2<T extends { ok: boolean }>(ruta: string | null) {
  const { organizacionId } = useOrganizacion();
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const consulta = useRef(0);

  const cargar = useCallback(async () => {
    if (!ruta) return;
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/agentes-v2/${conOrganizacion(ruta, organizacionId)}`, { cache: "no-store" });
      const data = (await res.json()) as T & { error?: string };
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDatos(data);
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [ruta, organizacionId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { datos, error, cargando, recargar: cargar };
}

/** Fuera de un componente (o para no forzar `useOrganizacion` en cada sitio que ya llama a enviarV2): misma
    organización activa, leída directamente de localStorage — ver leerOrganizacionActual en organizacion-context.tsx. */
export async function enviarV2<T>(metodo: "PUT" | "PATCH" | "POST" | "DELETE", ruta: string, cuerpo?: unknown): Promise<T> {
  const res = await fetch(`/api/agentes-v2/${conOrganizacion(ruta, leerOrganizacionActual())}`, { method: metodo, headers: { "Content-Type": "application/json" }, body: metodo === "DELETE" ? undefined : JSON.stringify(cuerpo ?? {}) });
  const data = (await res.json()) as T & { ok: boolean; error?: string };
  if (!data.ok) throw new Error(data.error || "Error desconocido");
  return data;
}
