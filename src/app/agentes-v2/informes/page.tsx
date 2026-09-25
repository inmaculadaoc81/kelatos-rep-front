"use client";

import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import { fechaHora } from "@/lib/agentes-v2";

interface Informe {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  department_name: string | null;
  last_run: { status: string; created_at: string } | null;
}

/** Informes: definiciones, ejecuciones y programación. El contenido de cada informe llegará con su departamento. */
export default function InformesPage() {
  const { datos, error, cargando } = useV2<{ ok: boolean; reports: Informe[] }>("reports");
  return (
    <div>
      <Cabecera titulo="Informes" descripcion="Informes periódicos de marketing (semanal, SEO, anuncios, redes, captación). Cada uno tendrá su definición, su programación y su historial." />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas n={2} />
      ) : !datos || datos.reports.length === 0 ? (
        <Vacio titulo="Sin informes definidos" texto="La infraestructura de informes (definición, ejecución, resultado y programación) está preparada; los informes concretos se definirán con cada departamento." />
      ) : (
        <ul className="divide-y rounded-lg border">
          {datos.reports.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.department_name ?? "General"}</p>
              </div>
              <span className="text-xs text-muted-foreground">{r.last_run ? `Última: ${fechaHora(r.last_run.created_at)}` : "Sin ejecutar"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
