"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MetricasCorreos } from "@/lib/crm-correos";
import { useApi } from "../use-api";

const PERIODOS = [
  { dias: 7, nombre: "7 días" },
  { dias: 30, nombre: "30 días" },
  { dias: 90, nombre: "90 días" },
];
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

export function TabMetricas() {
  const [dias, setDias] = useState(30);
  const { datos: m, error } = useApi<MetricasCorreos>(`/api/crm/correos/metricas?dias=${dias}`);
  const t = m?.totales;
  const max = Math.max(1, ...(m?.porDia.map((d) => d.enviados) ?? [1]));

  return (
    <div className="space-y-5 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">Cómo funcionan los envíos: cuántos salen, cuántos se abren, cuántos hacen clic y cuántos piden la baja. Se llenará solo cuando empiecen los envíos.</p>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {PERIODOS.map((p) => <button key={p.dias} type="button" onClick={() => setDias(p.dias)} className={`rounded-md px-3 py-1 text-sm transition-colors ${dias === p.dias ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{p.nombre}</button>)}
        </div>
      </div>
      {error && <p className="text-sm text-destructive">No se pudo cargar: {error}</p>}
      {!m && !error && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>}
      {m && t && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi titulo="Enviados" valor={String(t.enviados)} nota={m.envio_activo ? "envío activo" : "envío desactivado"} />
            <Kpi titulo="Entregados" valor={pct(t.entregados, t.enviados)} nota={`${t.entregados} de ${t.enviados}`} />
            <Kpi titulo="Aperturas" valor={pct(t.abiertos, t.enviados)} nota={`${t.abiertos} correos abiertos`} />
            <Kpi titulo="Clics" valor={pct(t.clics, t.enviados)} nota={`${t.clics} personas hicieron clic`} />
            <Kpi titulo="Bajas" valor={String(t.bajas)} nota={`${pct(t.bajas, t.enviados)} de los enviados`} />
            <Kpi titulo="Rebotes" valor={String(t.rebotes)} nota={`${pct(t.rebotes, t.enviados)} de los enviados`} />
            <Kpi titulo="Errores" valor={String(t.errores)} nota="no se pudieron enviar" />
            <Kpi titulo="Respuestas" valor="—" nota="se medirá con el buzón de Soporte" />
          </div>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Envíos por día</h2>
            {m.porDia.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Todavía no se ha enviado ningún correo.</p>
            ) : (
              <div className="flex h-36 items-end gap-1">
                {m.porDia.map((d) => <div key={d.dia} className="flex flex-1 flex-col items-center justify-end" title={`${d.dia}: ${d.enviados} enviados, ${d.abiertos} abiertos, ${d.clics} clics`}><div className="w-full max-w-6 rounded-t bg-violet-500" style={{ height: `${(d.enviados / max) * 100}%` }} /><span className="mt-1 text-[10px] text-muted-foreground">{d.dia.slice(8)}</span></div>)}
              </div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Tabla titulo="Por tipo de correo" filas={m.porTipo.map((f) => ({ nombre: f.nombre, enviados: f.enviados, abiertos: f.abiertos, clics: f.clics }))} />
            <Tabla titulo="Por campaña" filas={m.porCampana.map((f) => ({ nombre: f.nombre, enviados: f.enviados, abiertos: f.abiertos, clics: f.clics }))} />
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className="mt-1 text-2xl font-semibold">{valor}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{nota}</p>
      </CardContent>
    </Card>
  );
}

function Tabla({ titulo, filas }: { titulo: string; filas: { nombre: string; enviados: number; abiertos: number; clics: number }[] }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay datos.</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-1 font-normal">Nombre</th><th className="pb-1 text-right font-normal">Enviados</th><th className="pb-1 text-right font-normal">Abiertos</th><th className="pb-1 text-right font-normal">Clics</th></tr></thead>
          <tbody>{filas.map((f) => <tr key={f.nombre} className="border-t"><td className="py-1.5">{f.nombre}</td><td className="py-1.5 text-right">{f.enviados}</td><td className="py-1.5 text-right">{pct(f.abiertos, f.enviados)}</td><td className="py-1.5 text-right">{pct(f.clics, f.enviados)}</td></tr>)}</tbody>
        </table>
      )}
    </section>
  );
}
