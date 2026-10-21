"use client";

import { useEffect, useState } from "react";

/**
 * Carga una URL de /api/crm/* y la vuelve a cargar cuando cambia `url` o el contador `recarga`.
 * Mientras cambia la URL (otro filtro) `cargando` es true y `datos` es null; al recargar con la misma URL se
 * mantienen los datos anteriores hasta que llegan los nuevos (sin parpadeo).
 */
export function useApi<T extends { ok: boolean }>(url: string, recarga = 0) {
  const [estado, setEstado] = useState<{ url: string; datos: T | null; error: string | null }>({ url: "", datos: null, error: null });

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const d = (await res.json()) as T & { error?: string };
        if (!d.ok) throw new Error(d.error || "Error desconocido");
        if (vigente) setEstado({ url, datos: d, error: null });
      } catch (e) {
        if (vigente) setEstado({ url, datos: null, error: e instanceof Error ? e.message : "Error desconocido" });
      }
    })();
    return () => { vigente = false; };
  }, [url, recarga]);

  const actual = estado.url === url;
  return { datos: actual ? estado.datos : null, error: actual ? estado.error : null, cargando: !actual };
}
