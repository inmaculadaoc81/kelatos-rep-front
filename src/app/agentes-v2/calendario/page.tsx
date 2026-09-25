"use client";

import { useMemo, useState } from "react";
import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import type { DepartamentoResumen } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

interface Item {
  type: "run" | "approval";
  at: string;
  title: string;
  department_key: string | null;
  department_name: string | null;
  status: string;
}

/** Calendario de contenido y ejecuciones: agenda de los próximos 30 días con filtro por departamento. */
export default function CalendarioPage() {
  const [depto, setDepto] = useState("");
  const deps = useV2<{ ok: boolean; departments: DepartamentoResumen[] }>("departments");
  const { datos, error, cargando } = useV2<{ ok: boolean; items: Item[] }>(`calendar${depto ? `?department=${depto}` : ""}`);

  const dias = useMemo(() => {
    const mapa = new Map<string, Item[]>();
    for (const it of datos?.items ?? []) {
      const k = new Date(it.at).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
      mapa.set(k, [...(mapa.get(k) ?? []), it]);
    }
    return [...mapa.entries()];
  }, [datos]);

  return (
    <div>
      <Cabecera titulo="Calendario" descripcion="Lo que está programado para los próximos 30 días: ejecuciones de departamentos y, más adelante, artículos, publicaciones y campañas." />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {[{ key: "", name: "Todos" }, ...(deps.datos?.departments ?? [])].map((d) => (
          <button
            key={d.key || "todos"}
            type="button"
            aria-pressed={depto === d.key}
            onClick={() => setDepto(d.key)}
            className={cn("rounded-full border px-3 py-1 text-xs transition-colors", depto === d.key ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}
          >
            {d.name}
          </button>
        ))}
      </div>
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas />
      ) : dias.length === 0 ? (
        <Vacio titulo="Nada programado" texto="Añade un horario a un departamento (pestaña Horario) y sus ejecuciones aparecerán aquí." />
      ) : (
        <div className="space-y-4">
          {dias.map(([dia, items]) => (
            <section key={dia}>
              <h2 className="mb-1.5 text-sm font-medium capitalize">{dia}</h2>
              <ul className="divide-y rounded-lg border">
                {items.map((it, i) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-12 font-medium tabular-nums">{new Date(it.at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="truncate">{it.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{it.department_name}{it.type === "approval" ? " · aprobación" : ""}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
