"use client";

import { useEffect, useState } from "react";

/** Si la sesión actual puede borrar registros del dashboard (kelatoscielo@gmail.com). */
export function useEsSuperadmin(): boolean {
  const [esSuperadmin, setEsSuperadmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/superadmin")
      .then((r) => r.json())
      .then((data) => setEsSuperadmin(!!data.esSuperadmin))
      .catch(() => setEsSuperadmin(false));
  }, []);

  return esSuperadmin;
}

/** Si la sesión puede dar de alta piezas nuevas en Stock de piezas (superadmins y ricardo@kelatos.com). */
export function usePuedeCrearPiezas(): boolean {
  const [puede, setPuede] = useState(false);
  useEffect(() => {
    fetch("/api/auth/superadmin")
      .then((r) => r.json())
      .then((data) => setPuede(!!data.puedeCrearPiezas))
      .catch(() => setPuede(false));
  }, []);
  return puede;
}
