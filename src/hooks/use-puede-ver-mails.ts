"use client";

import { useEffect, useState } from "react";

/** Si la sesión puede entrar a Gestión MAILS (administradores y superadmins). Solo para mostrar u ocultar enlaces. */
export function usePuedeVerMails(): boolean {
  const [puede, setPuede] = useState(false);

  useEffect(() => {
    fetch("/api/auth/superadmin")
      .then((r) => r.json())
      .then((data) => setPuede(!!data.puedeVerMails))
      .catch(() => setPuede(false));
  }, []);

  return puede;
}
