"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { n } from "@/lib/webs-analitica";
import { AYUDA_MERCADO, type OrganizacionMercado } from "@/lib/mercado";
import { useOrganizacion } from "../../agentes-v2/organizacion-context";
import { GraficoMensual, ListaConsultas, Tarjeta } from "../mercado/piezas-mercado";
import { RecomendacionesIAPanel } from "../mercado/recomendaciones-ia";

const PERIODOS = [28, 90, 180] as const;

/** Estudio de mercado de la organización elegida: su demanda, qué búsquedas no cubre y cuánto de su tráfico es de marca. */
export default function EstudioMercadoPage() {
  const { organizacionId, organizacion } = useOrganizacion();
  const [dias, setDias] = useState<number>(90);
  const [res, setRes] = useState<{ clave: string; d: OrganizacionMercado } | null>(null);
  const clave = `${organizacionId}|${dias}`;
  const d = res && res.clave === clave ? res.d : null;

  useEffect(() => {
    if (!organizacionId) return;
    const k = `${organizacionId}|${dias}`;
    fetch(`/api/mercado/organizacion/${organizacionId}?dias=${dias}`).then((r) => r.json()).then((x) => setRes({ clave: k, d: x as OrganizacionMercado })).catch(() => setRes({ clave: k, d: { ok: false, error: "No se pudo cargar" } as OrganizacionMercado }));
  }, [organizacionId, dias]);

  const marca = d?.marca;
  const totalMarca = marca ? marca.marca + marca.generico : 0;
  const pctMarca = totalMarca ? Math.round((marca!.marca / totalMarca) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Estudio de mercado · {organizacion?.name ?? "organización"}</h1>
          <p className="text-sm text-muted-foreground">Qué busca la gente en Google sobre lo que ofrece esta marca y dónde hay oportunidad. Datos reales de Search Console de su web.</p>
        </div>
        <div className="flex gap-1 rounded-lg border p-0.5 text-sm">
          {PERIODOS.map((p) => (
            <button key={p} onClick={() => setDias(p)} className={cn("rounded-md px-2.5 py-1", dias === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{p} días</button>
          ))}
        </div>
      </div>

      {!d && <Skeleton className="h-64 w-full" />}
      {d && !d.ok && <p className="text-sm text-red-600">{d.error ?? "Error"}</p>}
      {d?.ok && d.estado === "sin_web" && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Esta organización no tiene web configurada, así que aún no hay datos de mercado. Añade su web en los ajustes de la organización.</p>}
      {d?.ok && d.estado === "sin_search_console" && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">La web {d.organizacion.dominio} aún no está conectada a Google Search Console, así que no hay datos de búsquedas. Se conecta dando acceso a la cuenta de lectura en Search Console.</p>}
      {d?.ok && d.estado === "ok" && (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Tarjeta titulo="Búsquedas donde aparece" ayuda={AYUDA_MERCADO.impresiones} valor={n(d.totalImpresiones)} pie={`Últimos ${d.dias} días · ${d.organizacion.dominio}`} />
            <Tarjeta titulo="Por posicionar" ayuda={AYUDA_MERCADO.sinCubrir} valor={String(d.sinCubrir.length)} pie="búsquedas con demanda y mal puesto" />
            <Tarjeta titulo="A un paso del top 3" ayuda={AYUDA_MERCADO.casi} valor={String(d.casi.length)} pie="búsquedas en la página 1" />
            <Tarjeta titulo="De marca / genérico" ayuda={AYUDA_MERCADO.marca} valor={marca && marca.palabras.length ? `${pctMarca} % / ${100 - pctMarca} %` : "Todo genérico"} pie={marca && marca.palabras.length ? `Marca detectada: ${marca.palabras.join(", ")}` : "El nombre de esta marca no aparece en las búsquedas"} />
          </div>
          <RecomendacionesIAPanel key={`${organizacionId}-${dias}`} organizacionId={organizacionId} dias={dias} />
          <GraficoMensual datos={d.mensual} titulo="Demanda mes a mes de esta marca" />
          <div className="grid gap-3 lg:grid-cols-2">
            <ListaConsultas titulo="Lo más buscado" filas={d.top.slice(0, 15)} vacio="Sin datos en este periodo." />
            <ListaConsultas titulo="Demanda sin cubrir" ayuda={AYUDA_MERCADO.sinCubrir} filas={d.sinCubrir} vacio="No hay búsquedas con demanda en puestos bajos." />
            <ListaConsultas titulo="A un paso del top 3" ayuda={AYUDA_MERCADO.casi} filas={d.casi} vacio="Ninguna búsqueda a un paso del top 3." />
            <div className="rounded-lg border bg-card p-3 text-sm">
              <p className="mb-1 font-semibold">Qué hacer con esto</p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                <li>La <b>demanda sin cubrir</b> son temas para nuevos artículos o para reforzar la página que ya existe.</li>
                <li>Lo que está <b>a un paso del top 3</b> se mejora con títulos más claros y más contenido útil.</li>
                <li>Si casi todo es <b>genérico</b>, la marca aún no es conocida: el crecimiento viene de aparecer en esas búsquedas.</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
