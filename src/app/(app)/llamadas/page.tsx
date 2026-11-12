"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Call, Refresh2, SearchNormal1, ArrowLeft2, ArrowRight2, Clock } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DetalleLlamadaContenido, COLOR_ESTADO, fechaHora } from "./detalle-llamada";
import { useSoftphone } from "../softphone";
import { ETIQUETA_ESTADO, FilaLlamada, ListadoLlamadas, duracionTexto, tiempoTotalTexto } from "@/lib/llamadas";

const POR_PAGINA = 25;
const TODOS = "__todos";

/** Desplegable shadcn para los filtros: «» (todos) se guarda como valor vacío fuera de aquí. */
function Filtro({ etiqueta, valor, onCambio, opciones, ancho }: { etiqueta: string; valor: string; onCambio: (v: string) => void; opciones: { valor: string; texto: string }[]; ancho: string }) {
  const actual = valor || TODOS;
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{etiqueta}</label>
      <Select value={actual} onValueChange={(v) => onCambio(!v || v === TODOS ? "" : v)}>
        <SelectTrigger className={cn("h-9", ancho)} aria-label={etiqueta}>
          <SelectValue>{(v: string) => opciones.find((o) => o.valor === v)?.texto ?? "Todos"}</SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {opciones.map((o) => <SelectItem key={o.valor} value={o.valor}>{o.texto}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Número marcable: acepta espacios y guiones; un móvil/fijo español de 9 cifras se completa con +34; «00…» pasa a «+…». */
function numeroMarcable(texto: string): string {
  const limpio = texto.replace(/[^\d+]/g, "");
  if (limpio.startsWith("+")) return limpio;
  if (limpio.startsWith("00")) return "+" + limpio.slice(2);
  return /^[6789]\d{8}$/.test(limpio) ? "+34" + limpio : limpio;
}

function Insignia({ texto, clase }: { texto: string; clase: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", clase)}>{texto}</span>;
}

function DetalleDialog({ id, busca, onCerrar }: { id: string; busca: string; onCerrar: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="flex items-center gap-2"><Call className="size-5 text-primary" /> Detalle de la llamada</DialogTitle>
        <DialogDescription className="sr-only">Datos de la llamada y su transcripción</DialogDescription>
        <DetalleLlamadaContenido id={id} busca={busca} />
      </DialogContent>
    </Dialog>
  );
}

export default function LlamadasPage() {
  const softphone = useSoftphone();
  const [numeroPrueba, setNumeroPrueba] = useState("");
  const [datos, setDatos] = useState<ListadoLlamadas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [usuario, setUsuario] = useState("");
  const [origen, setOrigen] = useState("");
  const [direccion, setDireccion] = useState("");
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [minDur, setMinDur] = useState("");
  const [soloTranscripcion, setSoloTranscripcion] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState<string | null>(null);
  const reqId = useRef(0);

  const cargar = useCallback(async (pag: number) => {
    const mio = ++reqId.current;
    setCargando(true); setError(null);
    try {
      const p = new URLSearchParams({ limit: String(POR_PAGINA), offset: String((pag - 1) * POR_PAGINA) });
      if (q.trim()) p.set("q", q.trim());
      if (usuario) p.set("usuario", usuario);
      if (origen) p.set("origen", origen);
      if (direccion) p.set("direccion", direccion);
      if (estado) p.set("estado", estado);
      if (desde) p.set("desde", desde);
      if (hasta) p.set("hasta", hasta);
      if (Number(minDur) > 0) p.set("duracionMin", String(Math.round(Number(minDur) * 60)));
      if (soloTranscripcion) p.set("conTranscripcion", "true");
      const r = await fetch(`/api/llamadas?${p.toString()}`, { cache: "no-store" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      if (mio === reqId.current) setDatos(d as ListadoLlamadas);
    } catch (e) {
      if (mio === reqId.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (mio === reqId.current) setCargando(false);
    }
  }, [q, usuario, origen, direccion, estado, desde, hasta, minDur, soloTranscripcion]);

  useEffect(() => {
    const t = setTimeout(() => { setPagina(1); cargar(1); }, 350);
    return () => clearTimeout(t);
  }, [cargar]);

  // La lista se actualiza sola: cada 8 s con la pestaña visible, y al colgar una llamada.
  const ocupadoLlamada = softphone.ocupado;
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") cargar(pagina); }, 8000);
    return () => clearInterval(t);
  }, [cargar, pagina]);
  useEffect(() => {
    if (ocupadoLlamada) return;
    const t = setTimeout(() => cargar(pagina), 1500);
    return () => clearTimeout(t);
  }, [ocupadoLlamada, cargar, pagina]);

  const hayFiltros = !!(q || usuario || origen || direccion || estado || desde || hasta || minDur || soloTranscripcion);
  const limpiar = () => { setQ(""); setUsuario(""); setOrigen(""); setDireccion(""); setEstado(""); setDesde(""); setHasta(""); setMinDur(""); setSoloTranscripcion(false); };
  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const irA = (p: number) => { setPagina(p); cargar(p); };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Call className="size-5" /></span>
          <div>
            <h1 className="text-lg font-semibold">Llamadas</h1>
            <p className="text-sm text-muted-foreground">Llamadas de personas y de agentes de IA, con su transcripción. Solo superadmins.</p>
          </div>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={() => cargar(pagina)} title="Actualizar"><Refresh2 className={cn("size-4", cargando && "animate-spin")} /></Button>
      </div>

      {softphone.disponible && (
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Llamada de prueba (si es de España, basta con el número; fuera de España, con prefijo +…)</label>
            <Input className="w-64" placeholder="600 111 222" value={numeroPrueba} onChange={(e) => setNumeroPrueba(e.target.value)} />
          </div>
          <Button size="sm" disabled={softphone.ocupado || !/^\+\d{8,15}$/.test(numeroMarcable(numeroPrueba))} onClick={() => void softphone.llamar({ telefono: numeroMarcable(numeroPrueba) })}>
            <Call className="size-4" /> Llamar
          </Button>
          <span className="text-xs text-muted-foreground">Sale con el número de la empresa y se graba.</span>
        </div>
      )}

      {datos && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { t: "Hoy", v: datos.resumen.hoy },
            { t: "Últimos 7 días", v: datos.resumen.semana },
            { t: "Tiempo (7 días)", v: tiempoTotalTexto(datos.resumen.segundos_semana) },
            { t: "Total registradas", v: datos.resumen.total_global },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border bg-card p-3 shadow-sm">
              <div className="text-xs text-muted-foreground">{c.t}</div>
              <div className="text-xl font-semibold tabular-nums">{c.v}</div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
        <div className="relative">
          <SearchNormal1 className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar en la transcripción, teléfono, resguardo…" className="w-72 pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Filtro etiqueta="Usuario / agente" valor={usuario} onCambio={setUsuario} ancho="w-56"
          opciones={[{ valor: TODOS, texto: "Todos" }, ...(datos?.usuarios.map((u) => ({ valor: u.usuario, texto: `${u.usuario} (${u.n})` })) ?? [])]} />
        <Filtro etiqueta="Origen" valor={origen} onCambio={setOrigen} ancho="w-40"
          opciones={[{ valor: TODOS, texto: "Todos" }, { valor: "persona", texto: "Personas" }, { valor: "ia", texto: "Agentes de IA" }]} />
        <Filtro etiqueta="Dirección" valor={direccion} onCambio={setDireccion} ancho="w-36"
          opciones={[{ valor: TODOS, texto: "Todas" }, { valor: "saliente", texto: "Salientes" }, { valor: "entrante", texto: "Entrantes" }]} />
        <Filtro etiqueta="Estado" valor={estado} onCambio={setEstado} ancho="w-44"
          opciones={[{ valor: TODOS, texto: "Todos" }, ...(datos?.estados.map((e) => ({ valor: e.estado, texto: `${ETIQUETA_ESTADO[e.estado] || e.estado} (${e.n})` })) ?? [])]} />
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
          <Input type="date" className="w-36" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
          <Input type="date" className="w-36" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Duración mín. (min)</label>
          <Input type="number" min="0" step="1" className="w-28" value={minDur} onChange={(e) => setMinDur(e.target.value)} />
        </div>
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={soloTranscripcion} onCheckedChange={(c) => setSoloTranscripcion(!!c)} /> Solo con transcripción</label>
        {hayFiltros && <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={limpiar}>Limpiar filtros</Button>}
        {datos && <span className="ml-auto inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{total.toLocaleString("es-ES")} llamadas</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Fecha / hora</TableHead>
              <TableHead>Usuario / agente</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead className="whitespace-nowrap">Duración</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Transcripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && !datos && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {datos && datos.registros.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">{hayFiltros ? "Ninguna llamada con esos filtros" : "Todavía no hay llamadas registradas"}</TableCell></TableRow>
            )}
            {datos?.registros.map((f: FilaLlamada) => (
              <TableRow key={f.id} className="cursor-pointer align-top hover:bg-muted/40" onClick={() => setAbierta(f.id)}>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{fechaHora(f.inicio)}</TableCell>
                <TableCell className="text-sm">
                  <div>{f.usuario || "—"}</div>
                  <Insignia texto={f.origen === "ia" ? "IA" : "Persona"} clase={f.origen === "ia" ? "bg-violet-500/10 text-violet-700 dark:text-violet-400" : "bg-sky-500/10 text-sky-700 dark:text-sky-400"} />
                </TableCell>
                <TableCell className="text-sm">
                  <div>{f.cliente_nombre || "—"}</div>
                  {f.resguardo && <div className="text-xs text-muted-foreground">Resguardo {f.resguardo}</div>}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">{f.telefono || "—"}</TableCell>
                <TableCell className="text-sm">{f.direccion === "entrante" ? "Entrante" : "Saliente"}</TableCell>
                <TableCell className="text-sm whitespace-nowrap"><span className="inline-flex items-center gap-1"><Clock className="size-3.5 text-muted-foreground" />{duracionTexto(f.duracion_seg)}</span></TableCell>
                <TableCell><Insignia texto={ETIQUETA_ESTADO[f.estado] || f.estado} clase={COLOR_ESTADO[f.estado] || "bg-slate-500/10 text-slate-600 dark:text-slate-300"} /></TableCell>
                <TableCell className="max-w-xs text-sm">
                  {f.tiene_transcripcion ? <span className="line-clamp-2 text-muted-foreground">{f.resumen || "Ver transcripción"}</span> : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {datos && paginas > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => irA(pagina - 1)}><ArrowLeft2 className="size-3.5" /> Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {pagina} de {paginas}</span>
          <Button variant="outline" size="sm" disabled={pagina >= paginas} onClick={() => irA(pagina + 1)}>Siguiente <ArrowRight2 className="size-3.5" /></Button>
        </div>
      )}

      {abierta && <DetalleDialog key={abierta} id={abierta} busca={q} onCerrar={() => setAbierta(null)} />}
    </div>
  );
}
