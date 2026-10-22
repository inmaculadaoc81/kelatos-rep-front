"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { euros, nombreCategoria, nombreOrigen, type FilaMetrica, type MetricasCrm } from "@/lib/crm";
import { useApi } from "../use-api";

const CANALES_FILTRO = [
  { id: "", nombre: "Todos los canales" },
  { id: "whatsapp", nombre: "WhatsApp" },
  { id: "llamada", nombre: "Llamadas" },
  { id: "web", nombre: "Web y citas" },
];

const PERIODOS = [
  { dias: 7, nombre: "7 días" },
  { dias: 30, nombre: "30 días" },
  { dias: 90, nombre: "90 días" },
  { dias: 365, nombre: "Año" },
];

const pct = (x: number) => `${Math.round(x * 100)}%`;
const horas = (h: number | null) => (h === null ? "—" : h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`);

export default function CrmMetricasPage() {
  const [dias, setDias] = useState(30);
  const [canal, setCanal] = useState("");
  const { datos: m, error } = useApi<{ ok: boolean } & MetricasCrm>(`/api/crm/metricas?dias=${dias}${canal ? `&origen=${canal}` : ""}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">CRM · Métricas</h1>
          <p className="text-sm text-muted-foreground">Cómo se comportan los leads creados en el periodo elegido: cuántos entran, por dónde, y cuántos se convierten.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {CANALES_FILTRO.map((c) => (
            <button key={c.id} type="button" onClick={() => setCanal(c.id)} className={`rounded-md px-3 py-1 text-sm transition-colors ${canal === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {c.nombre}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {PERIODOS.map((p) => (
            <button key={p.dias} type="button" onClick={() => setDias(p.dias)} className={`rounded-md px-3 py-1 text-sm transition-colors ${dias === p.dias ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {p.nombre}
            </button>
          ))}
        </div>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      {!m && !error && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>}

      {m && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi titulo="Leads nuevos" valor={String(m.creados)} detalle={`En los últimos ${m.dias} días`} color="text-sky-700" />
            <Kpi titulo="Conversión" valor={pct(m.conversion)} detalle={`${m.ganados} de ${m.creados} llegaron a Ganado`} color="text-emerald-700" />
            <Kpi titulo="Atendidos (bot o persona)" valor={m.creados ? pct(m.llegaron_contactado / m.creados) : "—"} detalle={`${m.llegaron_contactado} de ${m.creados} recibieron respuesta`} color="text-violet-700" />
            <Kpi titulo="Atendidos por una persona" valor={m.creados ? pct(m.atendidos_persona / m.creados) : "—"} detalle={`${m.atendidos_persona} de ${m.creados} los atendió alguien del equipo`} color="text-fuchsia-700" />
            <Kpi titulo="Primera respuesta" valor={horas(m.mediana_primera_respuesta_horas)} detalle={m.leads_con_respuesta > 0 ? `Mediana, incluye al bot (${m.leads_con_respuesta} leads)` : "Aún no hay leads atendidos"} color="text-violet-700" />
            <Kpi titulo="Tiempo hasta ganar" valor={m.mediana_dias_hasta_ganar === null ? "—" : `${m.mediana_dias_hasta_ganar.toFixed(1)} d`} detalle={m.leads_ganados_con_fecha > 0 ? `Mediana, sobre ${m.leads_ganados_con_fecha} ganados` : "Aún no hay ganados"} color="text-amber-700" />
            <Kpi titulo="Abiertos" valor={String(m.abiertos)} detalle={`${euros(m.valor_abierto)} en juego`} color="text-sky-700" />
            <Kpi titulo="Valor ganado" valor={euros(m.valor_ganado)} detalle="Suma del valor estimado de los ganados" color="text-emerald-700" />
            <Kpi titulo="Perdidos" valor={String(m.perdidos)} detalle={`${euros(m.valor_perdido)} perdidos`} color="text-rose-700" />
            <Kpi titulo="Para atender ya" valor={String(m.sin_respuesta + m.acciones_vencidas)} detalle={`${m.sin_respuesta} sin respuesta · ${m.acciones_vencidas} acciones vencidas`} color={m.sin_respuesta + m.acciones_vencidas > 0 ? "text-rose-700" : "text-muted-foreground"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel titulo="Leads por día">
              <GraficoDias dias={m.dias} datos={m.porDia} />
            </Panel>
            <Panel titulo="Embudo">
              <Embudo m={m} />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {canal !== "llamada" && canal !== "web" && (
              <Panel titulo="¿A qué WhatsApp escribieron?">
                <Barras filas={m.porNumero} etiqueta={(f) => `${f.clave}${f.extra ? ` · ${f.extra}` : ""}`} color="bg-emerald-500" />
              </Panel>
            )}
            {canal !== "whatsapp" && canal !== "web" && (
              <Panel titulo="¿A qué agente de llamadas llamaron?">
                <Barras filas={m.porAgente} etiqueta={(f) => `${f.clave}${f.extra ? ` · ${f.extra}` : ""}`} color="bg-violet-500" />
              </Panel>
            )}
            <Panel titulo="Clasificación (de qué consultan)">
              <Barras filas={m.porCategoria} etiqueta={(f) => (f.clave === "sin_clasificar" ? "Sin clasificar" : nombreCategoria(f.clave))} color="bg-sky-500" />
            </Panel>
            <Panel titulo="Por origen">
              <Barras filas={m.porOrigen} etiqueta={(f) => nombreOrigen(f.clave)} color="bg-violet-500" />
            </Panel>
            <Panel titulo="Por responsable">
              <Barras filas={m.porResponsable} etiqueta={(f) => f.clave} color="bg-amber-500" />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ titulo, valor, detalle, color }: { titulo: string; valor: string; detalle: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold leading-none ${color}`}>{valor}</p>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{detalle}</p>
    </div>
  );
}

function Panel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

/** Barras horizontales: cuántos leads y cuántos de ellos se ganaron. */
function Barras({ filas, etiqueta, color }: { filas: FilaMetrica[]; etiqueta: (f: FilaMetrica) => string; color: string }) {
  if (filas.length === 0) return <p className="text-sm text-muted-foreground">Sin datos en este periodo.</p>;
  const max = Math.max(...filas.map((f) => f.n), 1);
  return (
    <ul className="space-y-2.5">
      {filas.map((f) => (
        <li key={`${f.clave}|${f.extra ?? ""}`} className="text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate">{etiqueta(f)}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{f.n}{f.ganados > 0 ? ` · ${f.ganados} ganado${f.ganados > 1 ? "s" : ""}` : ""}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, (f.n / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Embudo({ m }: { m: MetricasCrm }) {
  const pasos = [
    { nombre: "Leads nuevos", n: m.creados, color: "bg-sky-500" },
    { nombre: "Contactados", n: m.llegaron_contactado, color: "bg-violet-500" },
    { nombre: "Con presupuesto", n: m.llegaron_presupuesto, color: "bg-amber-500" },
    { nombre: "Ganados", n: m.ganados, color: "bg-emerald-500" },
  ];
  if (m.creados === 0) return <p className="text-sm text-muted-foreground">Sin datos en este periodo.</p>;
  return (
    <ul className="space-y-2.5">
      {pasos.map((p, i) => (
        <li key={p.nombre} className="text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span>{p.nombre}</span>
            <span className="text-xs text-muted-foreground">
              {p.n}{i > 0 && pasos[i - 1].n > 0 ? ` · ${pct(p.n / pasos[i - 1].n)} del paso anterior` : ""}
            </span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${p.color}`} style={{ width: `${Math.max(p.n > 0 ? 3 : 0, (p.n / m.creados) * 100)}%` }} />
          </div>
        </li>
      ))}
      <li className="pt-1 text-xs text-muted-foreground">Perdidos: {m.perdidos}</li>
    </ul>
  );
}

/** Columnas por día; con 90 o 365 días se agrupa por semana para que sea legible. */
function GraficoDias({ dias, datos }: { dias: number; datos: { dia: string; n: number }[] }) {
  const mapa = new Map(datos.map((d) => [d.dia, d.n]));
  const hoy = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }) + "T00:00:00Z");
  const serie: { etiqueta: string; n: number }[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy.getTime() - i * 86400000);
    serie.push({ etiqueta: d.toISOString().slice(0, 10), n: mapa.get(d.toISOString().slice(0, 10)) ?? 0 });
  }
  const agrupar = dias > 31 ? (dias > 100 ? 14 : 7) : 1;
  const barras: { etiqueta: string; n: number }[] = [];
  for (let i = 0; i < serie.length; i += agrupar) {
    const trozo = serie.slice(i, i + agrupar);
    barras.push({ etiqueta: trozo[0].etiqueta, n: trozo.reduce((s, x) => s + x.n, 0) });
  }
  const max = Math.max(...barras.map((b) => b.n), 1);
  const total = barras.reduce((s, b) => s + b.n, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">Sin leads en este periodo.</p>;
  return (
    <div>
      <div className="flex h-36 items-end gap-0.5">
        {barras.map((b) => (
          <div key={b.etiqueta} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${b.etiqueta.split("-").reverse().join("/")}: ${b.n}`}>
            <div className="w-full rounded-t bg-sky-500/80 transition-colors group-hover:bg-sky-600" style={{ height: `${b.n > 0 ? Math.max(4, (b.n / max) * 100) : 0}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{barras[0].etiqueta.split("-").reverse().slice(0, 2).join("/")}</span>
        <span>{agrupar > 1 ? `Por ${agrupar === 7 ? "semana" : "quincena"}` : "Por día"} · {total} leads</span>
        <span>hoy</span>
      </div>
    </div>
  );
}
