"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Phone, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ETAPAS, ORIGENES, accionVencida, euros, haceCuanto, nombreOrigen, type Etapa, type Lead, type ResumenCrm } from "@/lib/crm";
import { useApi } from "./use-api";
import { NuevoLeadDialog } from "./nuevo-lead-dialog";
import { FichaLeadDialog } from "./ficha-lead-dialog";

export default function CrmTableroPage() {
  const [recarga, setRecarga] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [origen, setOrigen] = useState("");
  const [soloVencidas, setSoloVencidas] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [destino, setDestino] = useState<Etapa | null>(null);
  // Mientras se arrastra, la tarjeta se ve ya en su columna nueva (el servidor confirma después).
  const [moviendo, setMoviendo] = useState<Record<number, Etapa>>({});

  const params = new URLSearchParams();
  if (busqueda.trim()) params.set("q", busqueda.trim());
  if (origen) params.set("origen", origen);
  if (soloVencidas) params.set("vencidas", "1");
  const { datos, error } = useApi<{ ok: boolean; leads: Lead[] }>(`/api/crm/leads?${params.toString()}`, recarga);
  const { datos: resumen } = useApi<{ ok: boolean } & ResumenCrm>("/api/crm/resumen", recarga);

  const recargar = () => setRecarga((n) => n + 1);
  const leads = useMemo(() => (datos?.leads ?? []).map((l) => (moviendo[l.id] ? { ...l, etapa: moviendo[l.id] } : l)), [datos, moviendo]);

  async function mover(id: number, etapa: Etapa) {
    const lead = (datos?.leads ?? []).find((l) => l.id === id);
    if (!lead || lead.etapa === etapa) return;
    setMoviendo((m) => ({ ...m, [id]: etapa }));
    try {
      const res = await fetch(`/api/crm/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ etapa }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo mover el lead");
    } finally {
      setMoviendo((m) => { const { [id]: _quitado, ...resto } = m; void _quitado; return resto; });
    }
  }

  const enPipeline = resumen ? resumen.porEtapa.filter((e) => ["nuevo", "contactado", "presupuesto"].includes(e.etapa)) : [];
  const valorPipeline = enPipeline.reduce((s, e) => s + e.valor, 0);
  const activos = enPipeline.reduce((s, e) => s + e.n, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">CRM · Tablero</h1>
          <p className="text-sm text-muted-foreground">Cada columna es una etapa. Arrastra una ficha para moverla de etapa o ábrela para ver su historial.</p>
        </div>
        <Button className="gap-1.5" onClick={() => setNuevo(true)}><Plus className="size-4" /> Nuevo lead</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tarjeta titulo="En seguimiento" valor={resumen ? String(activos) : "…"} detalle="Nuevos, contactados y con presupuesto" color="text-sky-700" />
        <Tarjeta titulo="Valor en juego" valor={resumen ? euros(valorPipeline) : "…"} detalle="Suma del valor estimado" color="text-emerald-700" />
        <Tarjeta titulo="Nuevos hoy" valor={resumen ? String(resumen.nuevos_hoy) : "…"} detalle="Leads creados hoy" color="text-violet-700" />
        <Tarjeta titulo="Sin respuesta" valor={resumen ? String(resumen.sin_respuesta) : "…"} detalle="Siguen en «Nuevo» tras 24 h" color={resumen && resumen.sin_respuesta > 0 ? "text-rose-700" : "text-muted-foreground"} />
        <Tarjeta titulo="Acciones vencidas" valor={resumen ? String(resumen.acciones_vencidas) : "…"} detalle="Su próxima acción ya pasó" color={resumen && resumen.acciones_vencidas > 0 ? "text-amber-700" : "text-muted-foreground"} />
      </div>

      {resumen && resumen.porOrigen.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Últimos 30 días: {resumen.porOrigen.map((o) => `${nombreOrigen(o.origen)} ${o.n}`).join(" · ")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por nombre, teléfono o correo…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={origen} onChange={(e) => setOrigen(e.target.value)} aria-label="Origen">
          <option value="">Todos los orígenes</option>
          {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input type="checkbox" checked={soloVencidas} onChange={(e) => setSoloVencidas(e.target.checked)} /> Solo con acción vencida
        </label>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      {!datos && !error && <div className="grid gap-3 md:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-48" />)}</div>}

      {datos && (
        <>
          {leads.length === 0 && !busqueda && !origen && !soloVencidas && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Todavía no hay leads</p>
              <p className="mt-1 text-sm text-muted-foreground">Cuando se conecten WhatsApp, las llamadas y las webs llegarán solos. Mientras tanto puedes crear uno a mano o leer cómo funciona en la pestaña «Cómo funciona».</p>
              <Button className="mt-4 gap-1.5" onClick={() => setNuevo(true)}><Plus className="size-4" /> Crear el primero</Button>
            </div>
          )}
          <div className="flex gap-3 overflow-x-auto pb-3">
            {ETAPAS.map((et) => {
              const lista = leads.filter((l) => l.etapa === et.id);
              const valor = lista.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);
              return (
                <section
                  key={et.id}
                  onDragOver={(e) => { e.preventDefault(); setDestino(et.id); }}
                  onDragLeave={() => setDestino((d) => (d === et.id ? null : d))}
                  onDrop={(e) => { e.preventDefault(); setDestino(null); if (arrastrando !== null) mover(arrastrando, et.id); setArrastrando(null); }}
                  className={`flex w-72 min-w-[16rem] shrink-0 flex-col rounded-lg border border-t-4 bg-muted/30 ${et.cabecera} ${destino === et.id ? "ring-2 ring-primary/50" : ""}`}
                >
                  <header className="flex items-center justify-between px-3 py-2">
                    <span className="flex items-center gap-2 text-sm font-semibold"><span className={`size-2 rounded-full ${et.punto}`} />{et.nombre}</span>
                    <span className="text-xs text-muted-foreground">{lista.length}{valor > 0 ? ` · ${euros(valor)}` : ""}</span>
                  </header>
                  <div className="flex min-h-24 flex-1 flex-col gap-2 p-2 pt-0">
                    {lista.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        draggable
                        onDragStart={() => setArrastrando(l.id)}
                        onDragEnd={() => { setArrastrando(null); setDestino(null); }}
                        onClick={() => setAbierto(l.id)}
                        className={`rounded-md border bg-card p-2.5 text-left text-sm shadow-sm transition-shadow hover:shadow-md ${arrastrando === l.id ? "opacity-50" : ""}`}
                      >
                        <p className="font-medium leading-tight">{l.nombre}</p>
                        {l.telefono && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" />{l.telefono}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="rounded-full bg-muted px-1.5 py-0.5">{nombreOrigen(l.origen)}</span>
                          {Number(l.valor_estimado) > 0 && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-800">{euros(l.valor_estimado)}</span>}
                        </div>
                        {l.proxima_accion && (
                          <p className={`mt-1.5 text-xs ${accionVencida(l) ? "font-medium text-rose-700" : "text-muted-foreground"}`}>
                            {accionVencida(l) ? "⚠ " : "→ "}{l.proxima_accion}{l.proxima_accion_fecha ? ` (${l.proxima_accion_fecha.split("-").reverse().slice(0, 2).join("/")})` : ""}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground">{l.ultimo_contacto ? `Último contacto ${haceCuanto(l.ultimo_contacto)}` : `Creado ${haceCuanto(l.creado_en)}`}</p>
                      </button>
                    ))}
                    {lista.length === 0 && <p className="px-1 py-3 text-center text-xs text-muted-foreground">Sin leads</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {nuevo && <NuevoLeadDialog onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); recargar(); setAbierto(id); }} onAbrir={(id) => { setNuevo(false); setAbierto(id); }} />}
      {abierto !== null && <FichaLeadDialog id={abierto} onCerrar={() => setAbierto(null)} onCambio={recargar} />}
    </div>
  );
}

function Tarjeta({ titulo, valor, detalle, color }: { titulo: string; valor: string; detalle: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold leading-none ${color}`}>{valor}</p>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{detalle}</p>
    </div>
  );
}
