"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import { puedeVerCrm } from "@/lib/crm";

/** true solo cuando la sesión ya cargó y es administrador (o superadmin). `cargada` evita el parpadeo de «visible → oculto». */
export function useEsAdmin(): { esAdmin: boolean; cargada: boolean } {
  const [estado, setEstado] = useState({ esAdmin: false, cargada: false });
  useEffect(() => {
    let vivo = true;
    getSession()
      .then((s) => { if (vivo) setEstado({ esAdmin: puedeVerCrm(s?.user), cargada: true }); })
      .catch(() => { if (vivo) setEstado({ esAdmin: false, cargada: true }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}
