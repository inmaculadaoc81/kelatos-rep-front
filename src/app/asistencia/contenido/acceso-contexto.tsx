"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const SoloAsignadasContext = createContext(false);

/** Quien solo ve lo asignado (Gean) únicamente puede estar en el calendario; cualquier otra ruta del panel vuelve a él. */
export function AccesoContenidoProvider({ soloAsignadas, children }: { soloAsignadas: boolean; children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const fuera = soloAsignadas && !pathname.startsWith("/asistencia/contenido/calendario");

  useEffect(() => {
    if (fuera) router.replace("/asistencia/contenido/calendario");
  }, [fuera, router]);

  return <SoloAsignadasContext.Provider value={soloAsignadas}>{fuera ? null : children}</SoloAsignadasContext.Provider>;
}

/** true si la persona solo puede ver lo que se le asignó (sin crear ni editar). */
export function useSoloAsignadas() {
  return useContext(SoloAsignadasContext);
}
