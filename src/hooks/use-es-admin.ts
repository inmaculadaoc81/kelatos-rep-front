"use client";

import { useEffect, useState } from "react";

/** Si la sesión actual es admin o superadmin (role==="admin" o la lista de
    superadmin) — mismo criterio que ya usa Contabilidad/Gestión MAILS. */
export function useEsAdmin(): boolean {
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/superadmin")
      .then((r) => r.json())
      .then((data) => setEsAdmin(!!data.esAdmin))
      .catch(() => setEsAdmin(false));
  }, []);

  return esAdmin;
}
