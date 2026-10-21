"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BANDEJAS, CATEGORIAS, ETAPAS, GRUPOS_FECHA, accionVencida, bordeCategoria, esReciente, grupoFecha, haceCuanto, nombreCategoria, nombreEtapa, type Lead, type ResumenCrm } from "@/lib/crm";
import { useApi } from "./use-api";
import { NuevoLeadDialog } from "./nuevo-lead-dialog";
import { FichaLead } from "./ficha-lead-dialog";

const POR_PAGINA = 50;

export default function CrmBandejaPage() {
  // useSearchParams (para abrir un lead concreto desde un enlace) exige un Suspense.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Bandeja />
    </Suspense>
  );
}

const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

/** «[15:17] Bot: hola» → «Bot: hola» (vista previa del último mensaje). */
function vistaPrevia(l: string | null | undefined): string | null {
  const m = l ? /^\[\d\d:\d\d\] (Cliente|Bot|Agente|Sistema): ([\s\S]*)$/.exec(l) : null;
  return m ? `${m[1]}: ${m[2]}`.replace(/\s+/g, " ").trim() : null;
}

function Bandeja() {
  const inicial = Number(useSearchParams().get("lead")) || null;
  const [recarga, setRecarga] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [etapa, setEtapa] = useState("");
  const [bandeja, setBandeja] = useState("");
  const [categoria, setCategoria] = useState("");
  const [soloVencidas, setSoloVencidas] = useState(false);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [nuevo, setNuevo] = useState(false);
  const [seleccionado, setSeleccionado] = useState<number | null>(inicial);

  const params = new URLSearchParams();
  if (busqueda.trim()) params.set("q", busqueda.trim());
  if (etapa) params.set("etapa", etapa);
  if (bandeja) params.set("bandeja", bandeja);
  if (categoria) params.set("categoria", categoria);
  if (soloVencidas) params.set("vencidas", "1");
  const { datos, error } = useApi<{ ok: boolean; leads: Lead[] }>(`/api/crm/leads?${params.toString()}`, recarga);
  const { datos: resumen } = useApi<{ ok: boolean } & ResumenCrm>("/api/crm/resumen", recarga);
  const recargar = () => setRecarga((n) => n + 1);

  // La lista se actualiza sola cada 30 s (con la pestaña a la vista): los leads nuevos aparecen sin recargar.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") setRecarga((n) => n + 1); }, 30_000);
    return () => clearInterval(t);
  }, []);

  const cambiar = (fn: () => void) => { fn(); setLimite(POR_PAGINA); };
  const leads = useMemo(() => [...(datos?.leads ?? [])].sort((a, b) => new Date(b.ultimo_contacto ?? b.creado_en).getTime() - new Date(a.ultimo_contacto ?? a.creado_en).getTime()), [datos]);
  const visibles = leads.slice(0, limite);
  const cuenta = (e: string) => (resumen ? resumen.porEtapa.filter((x) => x.etapa === e).reduce((s, x) => s + x.n, 0) : null);
  const total = resumen ? resumen.porEtapa.reduce((s, x) => s + x.n, 0) : null;

  // Bloques por fecha (Hoy, Ayer, Esta semana, Anteriores) solo dentro de lo ya visible.
  const bloques = GRUPOS_FECHA.map((g) => ({ ...g, items: visibles.filter((l) => grupoFecha(l.ultimo_contacto ?? l.creado_en) === g.id) })).filter((b) => b.items.length > 0);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[32rem] gap-4">
      {/* ── Lista ── */}
      <aside className="flex w-[22rem] shrink-0 flex-col overflow-hidden rounded-lg border bg-card">
        <div className="space-y-2 border-b p-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold">Bandeja de leads</h1>
            <Button size="sm" className="gap-1" onClick={() => setNuevo(true)}><Plus className="size-3.5" /> Nuevo</Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Nombre, teléfono, correo o DNI…" value={busqueda} onChange={(e) => cambiar(() => setBusqueda(e.target.value))} />
          </div>
          <div className="flex flex-wrap gap-1">
            <Pestana activa={etapa === ""} onClick={() => cambiar(() => setEtapa(""))} texto="Todos" n={total} />
            {ETAPAS.map((e) => <Pestana key={e.id} activa={etapa === e.id} onClick={() => cambiar(() => setEtapa(e.id))} texto={e.nombre} n={cuenta(e.id)} punto={e.punto} />)}
          </div>
          <div className="flex gap-1.5">
            <select className="h-8 min-w-0 flex-1 rounded-md border bg-background px-1.5 text-xs" value={bandeja} onChange={(e) => cambiar(() => setBandeja(e.target.value))} aria-label="WhatsApp">
              <option value="">Todos los WhatsApp</option>
              {BANDEJAS.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
            <select className="h-8 min-w-0 flex-1 rounded-md border bg-background px-1.5 text-xs" value={categoria} onChange={(e) => cambiar(() => setCategoria(e.target.value))} aria-label="Clasificación">
              <option value="">Toda clasificación</option>
              {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
            <input type="checkbox" checked={soloVencidas} onChange={(e) => cambiar(() => setSoloVencidas(e.target.checked))} /> Solo con acción vencida
            {resumen && resumen.sin_respuesta > 0 && <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">{resumen.sin_respuesta} sin respuesta</span>}
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <p className="p-3 text-sm text-destructive">No se pudo cargar: {error}</p>}
          {!datos && !error && <div className="space-y-2 p-3">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>}
          {datos && leads.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No hay leads con estos filtros.</p>}
          {bloques.map((b) => (
            <div key={b.id}>
              <p className="sticky top-0 z-[1] bg-muted/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">{b.nombre} · {b.items.length}</p>
              <ul>
                {b.items.map((l) => {
                  const previa = vistaPrevia(l.ultima_linea);
                  const activo = seleccionado === l.id;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setSeleccionado(l.id)}
                        className={`flex w-full gap-2.5 border-b border-l-4 px-3 py-2.5 text-left transition-colors ${bordeCategoria(l.categoria)} ${activo ? "bg-primary/10" : "hover:bg-muted/60"}`}
                      >
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{iniciales(l.nombre)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                              {esReciente(l.creado_en) && <span className="size-2 shrink-0 rounded-full bg-sky-500" title="Llegó hace menos de 2 horas" />}
                              <span className="truncate">{l.nombre}</span>
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">{haceCuanto(l.ultimo_contacto ?? l.creado_en)}</span>
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">{previa ?? l.telefono ?? "Sin actividad"}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                            <span className={`rounded-full px-1.5 py-0.5 font-medium ${ETAPAS.find((e) => e.id === l.etapa)?.chip ?? ""}`}>{nombreEtapa(l.etapa)}</span>
                            {l.bandeja_nombre && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-800">{l.bandeja_nombre}</span>}
                            {l.categoria && <span className="rounded-full bg-muted px-1.5 py-0.5">{nombreCategoria(l.categoria)}</span>}
                            {accionVencida(l) && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 font-medium text-rose-700">Acción vencida</span>}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {leads.length > limite && (
            <div className="p-3 text-center">
              <Button variant="outline" size="sm" onClick={() => setLimite((n) => n + POR_PAGINA)}>Mostrar {Math.min(POR_PAGINA, leads.length - limite)} más ({leads.length - limite} restantes)</Button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Ficha ── */}
      <section className="min-w-0 flex-1 overflow-y-auto rounded-lg border bg-card p-4">
        {seleccionado === null ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-muted-foreground">
            <p className="text-sm font-medium text-foreground">Elige un lead de la lista</p>
            <p className="max-w-sm text-xs">Verás aquí su conversación de WhatsApp, sus datos y lo que ha pasado con él. Cambia su etapa con un clic y anota llamadas o notas.</p>
          </div>
        ) : (
          <FichaLead key={seleccionado} id={seleccionado} onCambio={recargar} />
        )}
      </section>

      {nuevo && <NuevoLeadDialog onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); recargar(); setSeleccionado(id); }} onAbrir={(id) => { setNuevo(false); setSeleccionado(id); }} />}
    </div>
  );
}

function Pestana({ activa, onClick, texto, n, punto }: { activa: boolean; onClick: () => void; texto: string; n: number | null; punto?: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${activa ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
      {punto && <span className={`size-1.5 rounded-full ${punto}`} />}{texto}{n !== null && <span className={activa ? "opacity-80" : "text-muted-foreground/70"}>{n}</span>}
    </button>
  );
}
