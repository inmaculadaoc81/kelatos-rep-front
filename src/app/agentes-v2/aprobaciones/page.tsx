"use client";

import { useState } from "react";
import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import { ETIQUETA_ESTADO_APROBACION, fechaHora, type EstadoAprobacion } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

interface Aprobacion {
  id: string;
  kind: string;
  title: string;
  status: EstadoAprobacion;
  scheduled_for: string | null;
  requested_by: string | null;
  created_at: string;
  department_name: string | null;
}

const ORDEN: EstadoAprobacion[] = ["pending_approval", "approved", "scheduled", "executed", "rejected", "failed", "draft"];

/** Centro de aprobaciones: aquí llegarán borradores, publicaciones, campañas de anuncios y cambios del AI CMO. */
export default function AprobacionesPage() {
  const [estado, setEstado] = useState<"" | EstadoAprobacion>("pending_approval");
  const { datos, error, cargando } = useV2<{ ok: boolean; approvals: Aprobacion[]; counts: Record<string, number> }>(`approvals${estado ? `?status=${estado}` : ""}`);
  return (
    <div>
      <Cabecera titulo="Aprobaciones" descripcion="Todo lo que necesita una decisión humana antes de ejecutarse: contenido, publicaciones, campañas y cambios de estrategia." />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["pending_approval", "", ...ORDEN.slice(1)] as ("" | EstadoAprobacion)[]).map((e) => (
          <button
            key={e || "todas"}
            type="button"
            aria-pressed={estado === e}
            onClick={() => setEstado(e)}
            className={cn("rounded-full border px-3 py-1 text-xs transition-colors", estado === e ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}
          >
            {e ? `${ETIQUETA_ESTADO_APROBACION[e]} (${datos?.counts[e] ?? 0})` : "Todas"}
          </button>
        ))}
      </div>
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas />
      ) : !datos || datos.approvals.length === 0 ? (
        <Vacio titulo="No hay nada por aprobar" texto="Cuando un departamento o el AI CMO necesite tu decisión, aparecerá aquí." />
      ) : (
        <ul className="divide-y rounded-lg border">
          {datos.approvals.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{[a.department_name, a.kind, fechaHora(a.created_at)].filter(Boolean).join(" · ")}</p>
              </div>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{ETIQUETA_ESTADO_APROBACION[a.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
