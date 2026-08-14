"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CodigoAcceso } from "@/lib/formulario-acceso";

interface CodigoAccesoContextValue {
  codigo: CodigoAcceso | null;
  cargando: boolean;
  generando: boolean;
  generarNuevo: () => Promise<void>;
}

const CodigoAccesoContext = createContext<CodigoAccesoContextValue | null>(null);

/**
 * Estado compartido del código de acceso del formulario en tablet —
 * navbar-codigo-acceso.tsx y formulario-web/page.tsx antes cada uno
 * pedía y guardaba su propia copia por separado, así que generar un
 * código nuevo desde uno de los dos (o automáticamente, tras un envío
 * público — ver formulario-cliente/route.ts) dejaba al otro mostrando el
 * código viejo hasta recargar la página (bug real reportado: navbar y
 * Formulario Web mostrando dos códigos distintos a la vez).
 *
 * Un único fetch aquí, compartido por ambos consumidores. El refresco
 * periódico cubre además la rotación automática que puede ocurrir desde
 * OTRO dispositivo (un cliente completando el formulario en la tablet)
 * sin que este navegador reciba ningún aviso — no hay forma de enterarse
 * salvo volver a preguntar.
 */
export function CodigoAccesoProvider({ children }: { children: ReactNode }) {
  const [codigo, setCodigo] = useState<CodigoAcceso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const primeraCarga = useRef(true);

  const recargar = useCallback(async () => {
    if (primeraCarga.current) setCargando(true);
    try {
      const res = await fetch("/api/formulario-cliente/codigo-acceso");
      const data = await res.json();
      if (data.ok) setCodigo(data.activo as CodigoAcceso | null);
    } catch {
      /* silencioso: reintenta en el siguiente ciclo de refresco */
    } finally {
      setCargando(false);
      primeraCarga.current = false;
    }
  }, []);

  useEffect(() => {
    recargar();
    const id = setInterval(recargar, 30_000);
    return () => clearInterval(id);
  }, [recargar]);

  const generarNuevo = useCallback(async () => {
    setGenerando(true);
    try {
      const res = await fetch("/api/formulario-cliente/codigo-acceso", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setCodigo(data.codigo as CodigoAcceso);
    } finally {
      setGenerando(false);
    }
  }, []);

  return (
    <CodigoAccesoContext.Provider value={{ codigo, cargando, generando, generarNuevo }}>
      {children}
    </CodigoAccesoContext.Provider>
  );
}

export function useCodigoAcceso(): CodigoAccesoContextValue {
  const ctx = useContext(CodigoAccesoContext);
  if (!ctx) throw new Error("useCodigoAcceso debe usarse dentro de <CodigoAccesoProvider>");
  return ctx;
}
