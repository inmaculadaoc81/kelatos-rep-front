"use client";

import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja } from "@/components/agentes-v2/componentes";
import { cn } from "@/lib/utils";

interface Integracion {
  key: string;
  name: string;
  kind: string;
  status: "not_connected" | "connected" | "error";
}

const ETIQUETA = { not_connected: "Sin conectar", connected: "Conectada", error: "Con error" } as const;
const COLOR = { not_connected: "bg-slate-500/10 text-slate-600", connected: "bg-green-500/10 text-green-700", error: "bg-red-500/10 text-red-700" } as const;

/** Catálogo de integraciones que usarán los departamentos. Las claves nunca se guardan aquí: siguen en el servidor. */
export default function IntegracionesPage() {
  const { datos, error, cargando } = useV2<{ ok: boolean; integrations: Integracion[] }>("integrations");
  return (
    <div>
      <Cabecera titulo="Integraciones" descripcion="Los servicios con los que trabajarán los departamentos. Se irán conectando al implementar cada uno." />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {datos?.integrations.map((i) => (
            <div key={i.key} className="flex items-center justify-between gap-2 rounded-lg border p-4">
              <p className="font-medium">{i.name}</p>
              <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", COLOR[i.status])}>{ETIQUETA[i.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
