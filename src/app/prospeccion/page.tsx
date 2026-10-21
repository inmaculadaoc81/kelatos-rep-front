"use client";

import { useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { MODOS, type FilaGrupo, type ResumenProspeccion } from "@/lib/prospeccion";
import { useApi } from "../crm/use-api";

const PERIODOS = [
  { dias: 7, nombre: "7 días" },
  { dias: 30, nombre: "30 días" },
  { dias: 90, nombre: "90 días" },
];

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

export default function ProspeccionResumenPage() {
  const [dias, setDias] = useState(30);
  const { datos: r, error } = useApi<ResumenProspeccion>(`/api/prospeccion/resumen?dias=${dias}`);
  const t = r?.totales;
  const maxDia = Math.max(1, ...(r?.por_dia.map((d) => Math.max(d.enviados, d.redactados)) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Prospección · Resumen</h1>
          <p className="text-sm text-muted-foreground">Qué ha redactado y enviado el agente a las empresas, con qué análisis y con qué resultado.</p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {PERIODOS.map((p) => (
            <button key={p.dias} type="button" onClick={() => setDias(p.dias)} className={`rounded-md px-3 py-1 text-sm transition-colors ${dias === p.dias ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {p.nombre}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      {!r && !error && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>}

      {r && t && (
        <>
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 ${r.agente.activo ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
            <div className="text-sm">
              <p className="font-semibold">{r.agente.activo ? "Agente ACTIVO" : "Agente APAGADO"} · modo {MODOS.find((m) => m.id === r.agente.modo)?.nombre.toLowerCase()}</p>
              <p className="text-muted-foreground">
                Hoy {r.agente.hoy} de {r.agente.limite_diario} envíos · {r.agente.candidatos} empresa{r.agente.candidatos === 1 ? "" : "s"} lista{r.agente.candidatos === 1 ? "" : "s"} para escribir
                {r.agente.generando ? ` · redactando ${r.agente.generando.hechos}/${r.agente.generando.total}…` : ""}
              </p>
            </div>
            <Link href="/prospeccion/agente" className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted">Configurar agente</Link>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Enviados" valor={t.enviados} nota={`${t.enviados_7d} en los últimos 7 días`} />
            <Kpi titulo="Pendientes de aprobar" valor={t.borradores} nota="borradores redactados por la IA" />
            <Kpi titulo="Respondieron" valor={t.respondieron} nota={`${pct(t.respondieron, t.enviados)} de los enviados`} />
            <Kpi titulo="Rebotados" valor={t.invalidos} nota={`${pct(t.invalidos, t.enviados)} de los enviados`} />
            <Kpi titulo="Redactados" valor={t.total} nota="mensajes generados en total" />
            <Kpi titulo="Encaje alto" valor={t.encaje_alto} nota="según el análisis de la IA" />
            <Kpi titulo="Puntuación media" valor={t.puntuacion_media ?? "—"} nota="de 0 a 100" />
            <Kpi titulo="Con error u omitidos" valor={t.errores + t.omitidos} nota={`${t.errores} con error · ${t.omitidos} omitidos`} />
          </div>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Actividad por día</h2>
            <div className="flex h-36 items-end gap-0.5">
              {r.por_dia.map((d) => (
                <div key={d.dia} className="group relative flex h-full flex-1 items-end justify-center gap-px" title={`${d.dia}: ${d.enviados} enviados, ${d.redactados} redactados`}>
                  <div className="w-full max-w-2 rounded-t bg-sky-300" style={{ height: `${(d.redactados / maxDia) * 100}%` }} />
                  <div className="w-full max-w-2 rounded-t bg-emerald-500" style={{ height: `${(d.enviados / maxDia) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-sky-300" /> Redactados</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500" /> Enviados</span>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <Tabla titulo="Por encaje (análisis IA)" filas={r.por_encaje} />
            <Tabla titulo="Por sector" filas={r.por_sector} />
            <Tabla titulo="Por buzón de envío" filas={r.por_buzon} soloEnviados />
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ titulo, valor, nota }: { titulo: string; valor: number | string; nota: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{nota}</p>
    </div>
  );
}

function Tabla({ titulo, filas, soloEnviados = false }: { titulo: string; filas: FilaGrupo[]; soloEnviados?: boolean }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay datos.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-1 font-normal">{soloEnviados ? "Buzón" : "Grupo"}</th>
              {!soloEnviados && <th className="pb-1 text-right font-normal">Total</th>}
              <th className="pb-1 text-right font-normal">Enviados</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={`${f.nombre}-${i}`} className="border-t">
                <td className="py-1.5">{f.nombre ?? "—"}</td>
                {!soloEnviados && <td className="py-1.5 text-right">{f.total}</td>}
                <td className="py-1.5 text-right">{f.enviados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
