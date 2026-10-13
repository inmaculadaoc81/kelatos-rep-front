"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import { esCuentaEmpleadosRestringida } from "@/lib/superadmin";

/** true solo cuando la sesión ya cargó y es la cuenta compartida de
    empleados (ver esCuentaEmpleadosRestringida). `cargada` permite ocultar
    botones sensibles hasta saberlo, sin parpadeo de "visible → oculto". */
export function useCuentaRestringida(): { restringida: boolean; cargada: boolean } {
  const [estado, setEstado] = useState({ restringida: false, cargada: false });
  useEffect(() => {
    let vivo = true;
    getSession()
      .then((s) => { if (vivo) setEstado({ restringida: esCuentaEmpleadosRestringida(s?.user?.email), cargada: true }); })
      .catch(() => { if (vivo) setEstado({ restringida: false, cargada: true }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}
