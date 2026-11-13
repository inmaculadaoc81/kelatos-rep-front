"use client";

import { createContext, useContext } from "react";

/** Quién está usando el panel: un administrador (ve y gestiona todo) o un agente (solo lo suyo). Lo decide el servidor en el layout. */
export interface ContextoComercial {
  admin: boolean;
  email: string;
  nombre: string;
}

const Ctx = createContext<ContextoComercial>({ admin: false, email: "", nombre: "" });

export function ComercialProvider({ valor, children }: { valor: ContextoComercial; children: React.ReactNode }) {
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useComercial = () => useContext(Ctx);
