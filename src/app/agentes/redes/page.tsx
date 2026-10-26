"use client";

import { useState } from "react";
import { OrganizacionProvider, useOrganizacion } from "../../agentes-v2/organizacion-context";
import { cn } from "@/lib/utils";
import { AnaliticaRedes } from "./analitica-redes";

const PERIODOS = [7, 30, 90] as const;

function Contenido() {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const { organizaciones, organizacionId, seleccionar } = useOrganizacion();
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Redes sociales</h1>
          <p className="text-sm text-muted-foreground">Cómo van las publicaciones de Instagram de cada organización y qué funciona mejor. Solo lectura.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {organizaciones.length > 1 && (
            <select aria-label="Organización" className="h-8 rounded-md border bg-background px-2 text-xs" value={organizacionId ?? ""} onChange={(e) => seleccionar(e.target.value)}>
              {organizaciones.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <div className="flex gap-1.5">
            {PERIODOS.map((p) => (
              <button key={p} type="button" aria-pressed={dias === p} onClick={() => setDias(p)} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", dias === p ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
                {p} días
              </button>
            ))}
          </div>
        </div>
      </div>
      <AnaliticaRedes dias={dias} />
    </div>
  );
}

/** Analítica de Instagram en el dashboard Agentes (misma organización activa que Agentes V2: se guarda en el navegador). */
export default function RedesPage() {
  return (
    <OrganizacionProvider>
      <Contenido />
    </OrganizacionProvider>
  );
}
