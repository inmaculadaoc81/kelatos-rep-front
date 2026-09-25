"use client";

import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Kpi, Vacio } from "@/components/agentes-v2/componentes";
import { fechaHora } from "@/lib/agentes-v2";

interface Metrica {
  metric: string;
  value: number;
  unit: string;
  source: string;
  recorded_at: string;
  department_key: string | null;
}

/** Analítica común: métricas de todos los departamentos con la misma estructura (métrica, valor, fecha, origen). */
export default function AnaliticaPage() {
  const { datos, error, cargando } = useV2<{ ok: boolean; metrics: Metrica[] }>("metrics");
  const ultimas = new Map<string, Metrica>();
  for (const m of datos?.metrics ?? []) if (!ultimas.has(`${m.department_key}:${m.metric}`)) ultimas.set(`${m.department_key}:${m.metric}`, m);
  return (
    <div>
      <Cabecera titulo="Analítica" descripcion="Métricas comunes de todos los departamentos: tráfico, contenido, alcance, resultados de anuncios…" />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas n={2} />
      ) : ultimas.size === 0 ? (
        <Vacio titulo="Sin métricas todavía" texto="Cada departamento registrará aquí sus métricas cuando esté implementado. La estructura ya está lista." />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...ultimas.values()].map((m) => (
            <Kpi key={`${m.department_key}:${m.metric}`} titulo={m.metric} valor={`${m.value.toLocaleString("es-ES")}${m.unit ? ` ${m.unit}` : ""}`} sub={`${m.department_key ?? "general"} · ${fechaHora(m.recorded_at)}`} />
          ))}
        </div>
      )}
    </div>
  );
}
