"use client";

import { useEffect, useState } from "react";

type Estado = "pendiente" | "activo" | "rechazado" | "revocado" | null;

/**
 * Pide (o anota) la marca de equipo de este navegador para la cuenta restringida del local. No muestra nada si el equipo está autorizado;
 * si está pendiente, rechazado o revocado, `mostrarAviso` enseña el estado (se usa en la pantalla de «Acceso restringido»).
 * Se hace como mucho una vez por pestaña para no cargar el servidor.
 */
export function SolicitudEquipoLocal({ mostrarAviso = false }: { mostrarAviso?: boolean }) {
  const [estado, setEstado] = useState<Estado>(null);

  useEffect(() => {
    const clave = "kelatos-solicitud-equipo-local";
    try {
      if (!mostrarAviso && window.sessionStorage.getItem(clave)) return;
    } catch { /* sin almacenamiento: se pide igualmente */ }
    fetch("/api/acceso-local/solicitud", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.aplica) setEstado(d.estado as Estado);
        try { window.sessionStorage.setItem(clave, "1"); } catch { /* nada */ }
      })
      .catch(() => {});
  }, [mostrarAviso]);

  if (!mostrarAviso || !estado || estado === "activo") return null;
  const texto =
    estado === "pendiente" ? "Este equipo ha quedado pendiente de autorización. Avisa a un administrador para que lo apruebe y vuelve a abrir el dashboard."
    : estado === "rechazado" ? "Este equipo ha sido rechazado. Habla con un administrador."
    : "La autorización de este equipo se ha retirado. Habla con un administrador.";
  return <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{texto}</p>;
}
