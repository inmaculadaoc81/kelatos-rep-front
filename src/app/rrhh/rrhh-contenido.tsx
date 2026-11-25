"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CorreoPersonal } from "./correo-personal";
import { MisComunicados } from "./comunicados";
import { GestionRrhh } from "./gestion";
import { pedir, type Yo } from "./comunes";

export type Vista = "correo" | "comunicados" | "gestion";

export function RrhhContenido({ vista }: { vista: Vista }) {
  const [yo, setYo] = useState<Yo | null>(null);
  const [error, setError] = useState("");
  const cargarYo = useCallback(() => {
    pedir<Yo>("yo").then((d) => { setYo(d); setError(""); }).catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar"));
  }, []);
  useEffect(() => { cargarYo(); }, [cargarYo, vista]);

  const pendientes = yo ? Math.max(yo.pendientes.sin_leer, yo.pendientes.sin_conformidad) : 0;
  const pestañas: { v: Vista; t: string }[] = [
    { v: "correo", t: "Mi correo" },
    { v: "comunicados", t: "Comunicados" },
    ...(yo?.rrhh ? [{ v: "gestion" as Vista, t: "Gestión de RRHH" }] : []),
  ];

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1 border-b">
        {pestañas.map((p) => (
          <Link key={p.v} href={`/rrhh/${p.v}`} className={cn("-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium", vista === p.v ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {p.t}
            {p.v === "comunicados" && pendientes > 0 && <span className="rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">{pendientes}</span>}
          </Link>
        ))}
      </nav>
      {error && <p className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {!yo && !error && <p className="p-6 text-sm text-muted-foreground">Cargando…</p>}
      {yo && vista === "correo" && <CorreoPersonal yo={yo} recargarYo={cargarYo} />}
      {yo && vista === "comunicados" && <MisComunicados recargarYo={cargarYo} />}
      {yo && vista === "gestion" && (yo.rrhh ? <GestionRrhh yo={yo} /> : <p className="text-sm text-muted-foreground">Solo Recursos Humanos.</p>)}
    </div>
  );
}
