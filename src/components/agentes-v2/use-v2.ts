"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Carga un recurso de /api/agentes-v2/* y permite recargarlo. */
export function useV2<T extends { ok: boolean }>(ruta: string | null) {
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
      const res = await fetch(`/api/agentes-v2/${ruta}`, { cache: "no-store" });
      const data = (await res.json()) as T & { error?: string };
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDatos(data);
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [ruta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { datos, error, cargando, recargar: cargar };
}

export async function enviarV2<T>(metodo: "PUT" | "PATCH" | "POST", ruta: string, cuerpo: unknown): Promise<T> {
  const res = await fetch(`/api/agentes-v2/${ruta}`, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const data = (await res.json()) as T & { ok: boolean; error?: string };
  if (!data.ok) throw new Error(data.error || "Error desconocido");
  return data;
}
