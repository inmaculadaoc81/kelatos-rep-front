"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Phone, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BANDEJAS, CATEGORIAS, ETAPAS, ORIGENES, accionVencida, chipCategoria, euros, haceCuanto, nombreCategoria, nombreOrigen, type Etapa, type Lead, type ResumenCrm } from "@/lib/crm";
import { useApi } from "./use-api";
import { NuevoLeadDialog } from "./nuevo-lead-dialog";
import { FichaLeadDialog } from "./ficha-lead-dialog";

/** Tarjetas que se pintan de golpe por columna: con cientos de leads el resto se ve con «Mostrar más» o en la Lista. */
const POR_PAGINA = 20;

export default function CrmTableroPage() {
  const [recarga, setRecarga] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [origen, setOrigen] = useState("");
  const [bandeja, setBandeja] = useState("");
  const [categoria, setCategoria] = useState("");
  const [soloVencidas, setSoloVencidas] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [destino, setDestino] = useState<Etapa | null>(null);
  const [visibles, setVisibles] = useState<Partial<Record<Etapa, number>>>({});
  // Mientras se arrastra, la tarjeta se ve ya en su columna nueva (el servidor confirma después).
  const [moviendo, setMoviendo] = useState<Record<number, Etapa>>({});

  const params = new URLSearchParams();
  if (busqueda.trim()) params.set("q", busqueda.trim());
  if (origen) params.set("origen", origen);
  if (bandeja) params.set("bandeja", bandeja);
  if (categoria) params.set("categoria", categoria);
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
  const hayFiltros = !!(busqueda || origen || bandeja || categoria || soloVencidas);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">CRM · Tablero</h1>
          <p className="text-sm text-muted-foreground">Arrastra una ficha a otra columna para cambiarla de etapa. Cada columna se desplaza sola; con «Ver todos» la abres en la Lista.</p>
        </div>
        <Button className="gap-1.5" onClick={() => setNuevo(true)}><Plus className="size-4" /> Nuevo lead</Button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Tarjeta titulo="En seguimiento" valor={resumen ? String(activos) : "…"} detalle="Nuevos, contactados y con presupuesto" color="text-sky-700" />
        <Tarjeta titulo="Valor en juego" valor={resumen ? euros(valorPipeline) : "…"} detalle="Suma del valor estimado" color="text-emerald-700" />
        <Tarjeta titulo="Nuevos hoy" valor={resumen ? String(resumen.nuevos_hoy) : "…"} detalle="Leads creados hoy" color="text-violet-700" />
        <Tarjeta titulo="Sin respuesta" valor={resumen ? String(resumen.sin_respuesta) : "…"} detalle="Siguen en «Nuevo» tras 24 h" color={resumen && resumen.sin_respuesta > 0 ? "text-rose-700" : "text-muted-foreground"} />
        <Tarjeta titulo="Acciones vencidas" valor={resumen ? String(resumen.acciones_vencidas) : "…"} detalle="Su próxima acción ya pasó" color={resumen && resumen.acciones_vencidas > 0 ? "text-amber-700" : "text-muted-foreground"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por nombre, teléfono, correo o DNI…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={origen} onChange={(e) => setOrigen(e.target.value)} aria-label="Origen">
          <option value="">Todos los orígenes</option>
          {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={bandeja} onChange={(e) => setBandeja(e.target.value)} aria-label="WhatsApp">
          <option value="">Todos los WhatsApp</option>
          {BANDEJAS.map((b) => <option key={b.id} value={b.id}>{b.nombre} · {b.numero}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Clasificación">
          <option value="">Todas las clasificaciones</option>
          {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input type="checkbox" checked={soloVencidas} onChange={(e) => setSoloVencidas(e.target.checked)} /> Solo con acción vencida
        </label>
        {hayFiltros && datos && <span className="text-xs text-muted-foreground">{leads.length} resultado{leads.length === 1 ? "" : "s"}</span>}
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      {!datos && !error && <div className="grid gap-3 md:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-48" />)}</div>}

      {datos && (
        <>
          {leads.length === 0 && !hayFiltros && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Todavía no hay leads</p>
              <p className="mt-1 text-sm text-muted-foreground">Cuando entren mensajes por WhatsApp aparecerán solos. Mientras tanto puedes crear uno a mano o leer cómo funciona en la pestaña «Cómo funciona».</p>
              <Button className="mt-4 gap-1.5" onClick={() => setNuevo(true)}><Plus className="size-4" /> Crear el primero</Button>
            </div>
          )}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {ETAPAS.map((et) => {
              const lista = leads.filter((l) => l.etapa === et.id);
              const valor = lista.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);
              const limite = visibles[et.id] ?? POR_PAGINA;
              return (
                <section
                  key={et.id}
                  onDragOver={(e) => { e.preventDefault(); setDestino(et.id); }}
                  onDragLeave={() => setDestino((d) => (d === et.id ? null : d))}
                  onDrop={(e) => { e.preventDefault(); setDestino(null); if (arrastrando !== null) mover(arrastrando, et.id); setArrastrando(null); }}
                  className={`flex w-72 min-w-[16rem] shrink-0 flex-col rounded-lg border border-t-4 bg-muted/30 ${et.cabecera} ${destino === et.id ? "ring-2 ring-primary/50" : ""}`}
                >
                  <header className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm font-semibold"><span className={`size-2 rounded-full ${et.punto}`} />{et.nombre}</span>
                    <span className="text-xs text-muted-foreground">{lista.length}{valor > 0 ? ` · ${euros(valor)}` : ""}</span>
                  </header>
                  {lista.length > POR_PAGINA && (
                    <Link href={`/crm/lista?etapa=${et.id}`} className="px-3 pb-1.5 text-[11px] font-medium text-primary hover:underline">Ver todos en la Lista →</Link>
                  )}
                  {/* Altura fija con scroll propio: la página no crece con cientos de tarjetas. */}
                  <div className="flex max-h-[calc(100vh-25rem)] min-h-40 flex-1 flex-col gap-1.5 overflow-y-auto p-2 pt-0">
                    {lista.slice(0, limite).map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        draggable
                        onDragStart={() => setArrastrando(l.id)}
                        onDragEnd={() => { setArrastrando(null); setDestino(null); }}
                        onClick={() => setAbierto(l.id)}
                        className={`rounded-md border bg-card px-2.5 py-2 text-left text-sm shadow-sm transition-shadow hover:shadow-md ${arrastrando === l.id ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="min-w-0 truncate font-medium leading-tight">{l.nombre}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{haceCuanto(l.ultimo_contacto ?? l.creado_en)}</span>
                        </div>
                        {l.telefono && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" />{l.telefono}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                          {l.bandeja_nombre && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-800" title={l.numero_destino ?? undefined}>{l.bandeja_nombre}</span>}
                          <span className={`rounded-full px-1.5 py-0.5 ${chipCategoria(l.categoria)}`}>{nombreCategoria(l.categoria)}</span>
                          {l.origen !== "whatsapp" && <span className="rounded-full bg-muted px-1.5 py-0.5">{nombreOrigen(l.origen)}</span>}
                          {Number(l.valor_estimado) > 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-800">{euros(l.valor_estimado)}</span>}
                        </div>
                        {l.proxima_accion && (
                          <p className={`mt-1 truncate text-[11px] ${accionVencida(l) ? "font-medium text-rose-700" : "text-muted-foreground"}`}>
                            {accionVencida(l) ? "⚠ " : "→ "}{l.proxima_accion}{l.proxima_accion_fecha ? ` (${l.proxima_accion_fecha.split("-").reverse().slice(0, 2).join("/")})` : ""}
                          </p>
                        )}
                      </button>
                    ))}
                    {lista.length > limite && (
                      <button type="button" className="rounded-md border border-dashed py-1.5 text-xs text-muted-foreground hover:bg-muted" onClick={() => setVisibles((v) => ({ ...v, [et.id]: limite + POR_PAGINA }))}>
                        Mostrar {Math.min(POR_PAGINA, lista.length - limite)} más ({lista.length - limite} restantes)
                      </button>
                    )}
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
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{titulo}</p>
      <p className={`text-xl font-bold leading-tight ${color}`}>{valor}</p>
      <p className="text-[10px] text-muted-foreground">{detalle}</p>
    </div>
  );
}
