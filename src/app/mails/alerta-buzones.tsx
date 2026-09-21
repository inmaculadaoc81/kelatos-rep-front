"use client";

import { useState } from "react";
import Link from "next/link";
import { Warning2 } from "@/lib/icons";
import { useSondeoVisible } from "@/hooks/use-sondeo-visible";
import type { Buzon } from "@/lib/mails";

/**
 * Aviso en TODAS las pantallas de Gestión MAILS cuando un buzón activo falla al
 * sincronizar (contraseña cambiada, servidor caído…). Antes solo se veía entrando
 * en Buzones. Se comprueba cada 2 minutos, solo con la pestaña a la vista.
 */
export function AlertaBuzones() {
  const [fallan, setFallan] = useState<Buzon[]>([]);

  useSondeoVisible(async () => {
    try {
      const res = await fetch("/api/mails/buzones");
      const data = await res.json();
      if (data.ok) setFallan((data.buzones as Buzon[]).filter((b) => b.activo && b.ultimo_error));
    } catch {
      /* si no se puede comprobar, no se molesta con un aviso falso */
    }
  }, 120_000);

  if (!fallan.length) return null;
  return (
    <div role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
      <Warning2 className="mt-0.5 size-4 shrink-0" />
      <p>
        {fallan.length === 1 ? "El buzón" : "Los buzones"} <strong>{fallan.map((b) => b.email).join(", ")}</strong> {fallan.length === 1 ? "falla" : "fallan"} al sincronizar
        {fallan.length === 1 && fallan[0].ultimo_error ? ` (${fallan[0].ultimo_error.slice(0, 120)})` : ""}. No llegan correos nuevos hasta que se arregle.{" "}
        <Link href="/mails/buzones" className="font-medium underline underline-offset-2">
          Revisar en Buzones
        </Link>
      </p>
    </div>
  );
}
