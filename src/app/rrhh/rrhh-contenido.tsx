"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sms, Notification, Profile2User } from "@/lib/icons";
import { CorreoPersonal } from "./correo-personal";
import { MisComunicados } from "./comunicados";
import { GestionRrhh } from "./gestion";
import { pedir, type Yo } from "./comunes";

export type Vista = "correo" | "comunicados" | "gestion";

const CABECERAS = {
  correo: { titulo: "Mi correo", detalle: "Tu buzón de empresa. Solo tú lo ves desde el dashboard.", Icono: Sms, color: "bg-sky-600" },
  comunicados: { titulo: "Comunicados", detalle: "Lo que te envía la empresa. Queda en tu historial.", Icono: Notification, color: "bg-amber-500" },
  gestion: { titulo: "Gestión de RRHH", detalle: "Enviar comunicados y consultar el historial de cada empleado.", Icono: Profile2User, color: "bg-indigo-600" },
};

export function RrhhContenido({ vista }: { vista: Vista }) {
  const [yo, setYo] = useState<Yo | null>(null);
  const [error, setError] = useState("");
  const cargarYo = useCallback(() => {
    pedir<Yo>("yo").then((d) => { setYo(d); setError(""); }).catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar"));
  }, []);
  useEffect(() => { cargarYo(); }, [cargarYo, vista]);

  const { titulo, detalle, Icono, color } = CABECERAS[vista];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-white", color)}><Icono className="size-5" /></span>
        <div>
          <h1 className="text-lg leading-tight font-semibold">{titulo}</h1>
          <p className="text-sm text-muted-foreground">{detalle}</p>
        </div>
      </div>
      {error && <p className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {!yo && !error && <p className="p-6 text-sm text-muted-foreground">Cargando…</p>}
      {yo && vista === "correo" && <CorreoPersonal yo={yo} recargarYo={cargarYo} />}
      {yo && vista === "comunicados" && <MisComunicados recargarYo={cargarYo} />}
      {yo && vista === "gestion" && (yo.rrhh ? <GestionRrhh /> : <p className="text-sm text-muted-foreground">Solo Recursos Humanos.</p>)}
    </div>
  );
}
