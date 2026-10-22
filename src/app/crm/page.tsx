"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, MessagesSquare, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BANDEJAS, CATEGORIAS, ETAPAS, GRUPOS_FECHA, accionVencida, bordeCategoria, esReciente, euros, grupoFecha, haceCuanto, nombreCategoria, nombreEtapa, type Lead, type ResumenCrm } from "@/lib/crm";
import { useApi } from "./use-api";
import { NuevoLeadDialog } from "./nuevo-lead-dialog";
import { FichaLead } from "./ficha-lead-dialog";

const POR_PAGINA = 60;
const ORDENES = [
  { id: "reciente", nombre: "Más reciente primero" },
  { id: "antiguo", nombre: "Más antiguo primero" },
  { id: "nombre", nombre: "Nombre (A-Z)" },
  { id: "valor", nombre: "Mayor valor" },
];

export default function CrmLeadsPage() {
  // useSearchParams (para abrir un lead concreto desde un enlace) exige un Suspense.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Leads />
    </Suspense>
  );
}

const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
const fechaDe = (l: Lead) => new Date(l.ultimo_contacto ?? l.creado_en).getTime();

/** «[15:17] Bot: hola» → «Bot: hola» (vista previa del último mensaje). */
function vistaPrevia(l: string | null | undefined): string | null {
  const m = l ? /^\[\d\d:\d\d\] (Cliente|Bot|Agente|Sistema): ([\s\S]*)$/.exec(l) : null;
  return m ? `${m[1]}: ${m[2]}`.replace(/\s+/g, " ").trim() : null;
}

function Leads() {
  const inicial = Number(useSearchParams().get("lead")) || null;
  const [recarga, setRecarga] = useState(0);
  const [vista, setVista] = useState<"bandeja" | "tarjetas">("bandeja");
  const [busqueda, setBusqueda] = useState("");
  const [etapa, setEtapa] = useState("todos");
  const [bandeja, setBandeja] = useState("todos");
  const [categoria, setCategoria] = useState("todos");
  const [orden, setOrden] = useState("reciente");
  const [soloVencidas, setSoloVencidas] = useState(false);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [nuevo, setNuevo] = useState(false);
  const [seleccionado, setSeleccionado] = useState<number | null>(inicial);

  const params = new URLSearchParams();
  if (busqueda.trim()) params.set("q", busqueda.trim());
  if (etapa !== "todos") params.set("etapa", etapa);
  if (bandeja !== "todos") params.set("bandeja", bandeja);
  if (categoria !== "todos") params.set("categoria", categoria);
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
  const leads = useMemo(() => {
    const l = [...(datos?.leads ?? [])];
    if (orden === "antiguo") l.sort((a, b) => fechaDe(a) - fechaDe(b));
    else if (orden === "nombre") l.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    else if (orden === "valor") l.sort((a, b) => Number(b.valor_estimado ?? 0) - Number(a.valor_estimado ?? 0) || fechaDe(b) - fechaDe(a));
    else l.sort((a, b) => fechaDe(b) - fechaDe(a));
    return l;
  }, [datos, orden]);
  const visibles = leads.slice(0, limite);
  const cuenta = (e: string) => (resumen ? resumen.porEtapa.filter((x) => x.etapa === e).reduce((s, x) => s + x.n, 0) : null);
  const total = resumen ? resumen.porEtapa.reduce((s, x) => s + x.n, 0) : null;
  const ganados = cuenta("ganado");
  const enCurso = resumen ? (cuenta("contactado") ?? 0) + (cuenta("presupuesto") ?? 0) : null;

  // Bloques por fecha solo con el orden «más reciente» y la vista de bandeja.
  const agrupar = orden === "reciente";
  const bloques = agrupar
    ? GRUPOS_FECHA.map((g) => ({ ...g, items: visibles.filter((l) => grupoFecha(l.ultimo_contacto ?? l.creado_en) === g.id) })).filter((b) => b.items.length > 0)
    : [{ id: "todos", nombre: "Todos", items: visibles }];

  const abrirKpi = (e: string, vencidas = false) => cambiar(() => { setEtapa(e); setSoloVencidas(vencidas); });

  const tarjetaLead = (l: Lead, compacta: boolean) => {
    const previa = vistaPrevia(l.ultima_linea);
    const activo = seleccionado === l.id;
    return (
      <button
        type="button"
        onClick={() => setSeleccionado(l.id)}
        className={`flex w-full gap-2.5 border-l-4 text-left transition-colors ${bordeCategoria(l.categoria)} ${compacta ? `border-b px-3 py-2.5 ${activo ? "bg-primary/10" : "hover:bg-muted/60"}` : `h-full rounded-lg border bg-card p-3 shadow-xs hover:shadow-md ${activo ? "ring-2 ring-primary" : ""}`}`}
      >
        <Avatar className="mt-0.5 size-9 shrink-0"><AvatarFallback className="text-xs font-semibold">{iniciales(l.nombre)}</AvatarFallback></Avatar>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
              {esReciente(l.creado_en) && <span className="size-2 shrink-0 rounded-full bg-sky-500" title="Llegó hace menos de 2 horas" />}
              <span className="truncate">{l.nombre}</span>
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{haceCuanto(l.ultimo_contacto ?? l.creado_en)}</span>
          </span>
          <span className={`block text-xs text-muted-foreground ${compacta ? "truncate" : "line-clamp-2 min-h-8"}`}>{previa ?? l.telefono ?? "Sin actividad"}</span>
          {!compacta && (l.telefono || l.email) && <span className="mt-1 block truncate text-[11px] text-muted-foreground">{[l.telefono, l.email].filter(Boolean).join(" · ")}</span>}
          <span className="mt-1.5 flex flex-wrap items-center gap-1">
            <Badge variant="secondary" className={`h-5 px-1.5 text-[10px] ${ETAPAS.find((e) => e.id === l.etapa)?.chip ?? ""}`}>{nombreEtapa(l.etapa)}</Badge>
            {l.bandeja_nombre && <Badge variant="secondary" className="h-5 bg-emerald-100 px-1.5 text-[10px] text-emerald-800">{l.bandeja_nombre}</Badge>}
            {l.categoria && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{nombreCategoria(l.categoria)}</Badge>}
            {accionVencida(l) && <Badge variant="secondary" className="h-5 bg-rose-100 px-1.5 text-[10px] text-rose-700">Acción vencida</Badge>}
            {!compacta && l.valor_estimado ? <span className="ml-auto text-[11px] font-medium">{euros(l.valor_estimado)}</span> : null}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">CRM · Leads</h1>
          <p className="text-sm text-muted-foreground">Quién ha escrito, qué necesita y qué falta por hacer con cada uno.</p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup variant="outline" value={[vista]} onValueChange={(v) => { if (v[0]) setVista(v[0] as "bandeja" | "tarjetas"); }} aria-label="Tipo de vista">
            <ToggleGroupItem value="bandeja" className="gap-1.5 px-3"><MessagesSquare className="size-4" /> Bandeja</ToggleGroupItem>
            <ToggleGroupItem value="tarjetas" className="gap-1.5 px-3"><LayoutGrid className="size-4" /> Tarjetas</ToggleGroupItem>
          </ToggleGroup>
          <Button className="gap-1.5" onClick={() => setNuevo(true)}><Plus className="size-4" /> Nuevo lead</Button>
        </div>
      </div>

      {/* ── KPIs (cada uno filtra la lista) ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi titulo="Nuevos hoy" valor={resumen?.nuevos_hoy} tono="text-sky-600" onClick={() => abrirKpi("nuevo")} />
        <Kpi titulo="Sin respuesta +24 h" valor={resumen?.sin_respuesta} tono={resumen && resumen.sin_respuesta > 0 ? "text-rose-600" : undefined} onClick={() => abrirKpi("nuevo")} />
        <Kpi titulo="Acciones vencidas" valor={resumen?.acciones_vencidas} tono={resumen && resumen.acciones_vencidas > 0 ? "text-amber-600" : undefined} onClick={() => abrirKpi("todos", true)} />
        <Kpi titulo="En conversación" valor={enCurso ?? undefined} nota="contactados y presupuestos" onClick={() => abrirKpi("contactado")} />
        <Kpi titulo="Ganados" valor={ganados ?? undefined} tono="text-emerald-600" nota={total && ganados !== null ? `${Math.round((ganados / total) * 100)}% de conversión` : undefined} onClick={() => abrirKpi("ganado")} />
        <Kpi titulo="Total de leads" valor={total ?? undefined} onClick={() => abrirKpi("todos")} />
      </div>

      {/* ── Filtros ── */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-60 max-w-md flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Nombre, teléfono, correo o DNI…" value={busqueda} onChange={(e) => cambiar(() => setBusqueda(e.target.value))} />
          </div>
          <Filtro valor={bandeja} onCambio={(v) => cambiar(() => setBandeja(v))} todos="Todos los WhatsApp" opciones={BANDEJAS.map((b) => ({ id: String(b.id), nombre: b.nombre }))} />
          <Filtro valor={categoria} onCambio={(v) => cambiar(() => setCategoria(v))} todos="Toda clasificación" opciones={CATEGORIAS.map((c) => ({ id: c.id, nombre: c.nombre }))} />
          <Filtro valor={orden} onCambio={setOrden} opciones={ORDENES} />
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input type="checkbox" checked={soloVencidas} onChange={(e) => cambiar(() => setSoloVencidas(e.target.checked))} /> Acción vencida
          </label>
        </div>
        <ToggleGroup variant="outline" size="sm" value={[etapa]} onValueChange={(v) => cambiar(() => setEtapa(v[0] ?? "todos"))} aria-label="Etapa" className="flex-wrap">
          <ToggleGroupItem value="todos" className="gap-1.5 px-3">Todos {total !== null && <span className="text-muted-foreground">{total}</span>}</ToggleGroupItem>
          {ETAPAS.map((e) => (
            <ToggleGroupItem key={e.id} value={e.id} className="gap-1.5 px-3">
              <span className={`size-1.5 rounded-full ${e.punto}`} />{e.nombre} {cuenta(e.id) !== null && <span className="text-muted-foreground">{cuenta(e.id)}</span>}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</p>}
      {!datos && !error && <Skeleton className="h-96 w-full" />}

      {datos && vista === "bandeja" && (
        <div className="flex h-[calc(100vh-23rem)] min-h-[28rem] gap-4">
          <aside className="flex w-[23rem] shrink-0 flex-col overflow-hidden rounded-lg border bg-card">
            <div className="flex-1 overflow-y-auto">
              {leads.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No hay leads con estos filtros.</p>}
              {bloques.map((b) => (
                <div key={b.id}>
                  {agrupar && <p className="sticky top-0 z-[1] bg-muted/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">{b.nombre} · {b.items.length}</p>}
                  <ul>{b.items.map((l) => <li key={l.id}>{tarjetaLead(l, true)}</li>)}</ul>
                </div>
              ))}
              {leads.length > limite && (
                <div className="p-3 text-center">
                  <Button variant="outline" size="sm" onClick={() => setLimite((n) => n + POR_PAGINA)}>Mostrar {Math.min(POR_PAGINA, leads.length - limite)} más ({leads.length - limite} restantes)</Button>
                </div>
              )}
            </div>
          </aside>
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
        </div>
      )}

      {datos && vista === "tarjetas" && (
        <div className="space-y-5">
          {leads.length === 0 && <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">No hay leads con estos filtros.</p>}
          {bloques.map((b) => (
            <section key={b.id}>
              {agrupar && <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{b.nombre} · {b.items.length}</h2>}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{b.items.map((l) => <div key={l.id}>{tarjetaLead(l, false)}</div>)}</div>
            </section>
          ))}
          {leads.length > limite && (
            <div className="text-center"><Button variant="outline" size="sm" onClick={() => setLimite((n) => n + POR_PAGINA)}>Mostrar {Math.min(POR_PAGINA, leads.length - limite)} más ({leads.length - limite} restantes)</Button></div>
          )}
          <Sheet open={seleccionado !== null} onOpenChange={(o) => { if (!o) setSeleccionado(null); }}>
            <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-3xl">
              <SheetTitle className="sr-only">Ficha del lead</SheetTitle>
              <SheetDescription className="sr-only">Conversación, datos y actividad del lead</SheetDescription>
              {seleccionado !== null && <FichaLead key={seleccionado} id={seleccionado} onCambio={recargar} />}
            </SheetContent>
          </Sheet>
        </div>
      )}

      {nuevo && <NuevoLeadDialog onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); recargar(); setSeleccionado(id); }} onAbrir={(id) => { setNuevo(false); setSeleccionado(id); }} />}
    </div>
  );
}

function Kpi({ titulo, valor, nota, tono, onClick }: { titulo: string; valor: number | undefined; nota?: string; tono?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card size="sm" className="h-full transition-shadow hover:shadow-md">
        <CardContent>
          <p className="text-xs text-muted-foreground">{titulo}</p>
          <p className={`mt-1 text-2xl font-semibold ${tono ?? ""}`}>{valor === undefined ? "—" : valor}</p>
          {nota && <p className="mt-0.5 text-[11px] text-muted-foreground">{nota}</p>}
        </CardContent>
      </Card>
    </button>
  );
}

function Filtro({ valor, onCambio, opciones, todos }: { valor: string; onCambio: (v: string) => void; opciones: { id: string; nombre: string }[]; todos?: string }) {
  const todas = todos ? [{ id: "todos", nombre: todos }, ...opciones] : opciones;
  return (
    <Select value={valor} onValueChange={(v) => onCambio(v ?? (todos ? "todos" : opciones[0].id))}>
      <SelectTrigger className="min-w-44"><SelectValue>{todas.find((o) => o.id === valor)?.nombre}</SelectValue></SelectTrigger>
      <SelectContent>{todas.map((o) => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}</SelectContent>
    </Select>
  );
}
