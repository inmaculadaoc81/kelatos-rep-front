"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Add, ArrowLeft2, ArrowRight2, DocumentDownload, DocumentText, Refresh2, SearchNormal1 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { descargarCsv } from "@/lib/reporte-facturas";
import { ColumnaFiltroFechas, ColumnaFiltroOpciones, ColumnaFiltroTexto } from "../../facturas-recibidas/columna-filtro-simple";
import { ColumnaFiltroRango } from "../../reporte-facturas/columna-filtro-rango";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, fechaCorta, num, type AsientoResumen, type DetalleAsiento, type EstadoAsiento, type EventoContable } from "@/lib/contabilidad";
import { CajaError, Cabecera, EstadoBadge, FilaVacia, FilasCarga, InfoVista, Kpi, usePlan } from "../_ui";
import { AsientoDialog } from "../asiento-dialog";
import { AsientoFormDialog } from "../asiento-form-dialog";
import { SincronizarDialog } from "../sincronizar-dialog";

const OPCIONES_POR_PAGINA = [25, 50, 100, 200, 500];
const ORIGENES: { valor: string; etiqueta: string }[] = [
  { valor: "reparaciones", etiqueta: "Reparaciones" },
  { valor: "tickets_manuales", etiqueta: "Tickets manuales" },
  { valor: "facturas_manuales", etiqueta: "Facturas manuales" },
  { valor: "ventas", etiqueta: "Ventas" },
  { valor: "alquileres", etiqueta: "Alquileres" },
  { valor: "facturas_recibidas", etiqueta: "Facturas recibidas" },
  { valor: "importaciones", etiqueta: "Importaciones" },
];
const TIPOS_ORIGEN: Record<string, string> = {
  reparaciones: "Reparación", tickets_manuales: "Ticket manual", facturas_manuales: "Factura manual", ventas: "Venta", alquileres: "Alquiler",
  facturas_recibidas: "Compra", importaciones: "Importación", banco_movimientos: "Banco", efectivo_retiradas: "Efectivo", pagos_compras: "Pago de compra",
};
const SUFIJOS_ORIGEN: [RegExp, string][] = [
  [/:rect:devolucion|:devolucion|:conf\d+/, "devolución"], [/:rect/, "rectificativa"], [/:corr:cobro/, "cobro de la corregida"], [/:corr/, "corregida"],
  [/:cobro/, "cobro"], [/:pago/, "pago"], [/f_anticipo|t_anticipo/, "anticipo"], [/f_revision|t_revision/, "revisión"], [/t_mensajeria/, "mensajería"],
];
/** Convierte «reparaciones · 19583:t_principal» en algo que se lee: «Reparación 19583» + «ticket». */
function origenLegible(f: { origen_tipo: string | null; origen_id: string | null; tipo: string }): { titulo: string; detalle: string } {
  if (!f.origen_tipo || !f.origen_id) return { titulo: f.tipo === "manual" ? "Asiento manual" : f.tipo === "reversion" ? "Reversión" : f.tipo, detalle: "" };
  const ref = f.origen_id.split(":")[0].replace(/^(TICKETMAN|MANUAL)-/, "");
  const sufijo = SUFIJOS_ORIGEN.find(([re]) => re.test(f.origen_id!))?.[1];
  const clase = /(^|:)f_|factura/.test(f.origen_id) ? "factura" : /(^|:)t_|ticket/i.test(f.origen_id) ? "ticket" : "";
  return { titulo: `${TIPOS_ORIGEN[f.origen_tipo] || f.origen_tipo} ${ref}`, detalle: [clase, sufijo].filter(Boolean).join(" · ") };
}
const OPERACIONES: [RegExp, string, string][] = [
  [/^rectificativa/i, "Rectificativa", "bg-amber-500/10 text-amber-700 dark:text-amber-400"],
  [/^devoluci/i, "Devolución", "bg-orange-500/10 text-orange-700 dark:text-orange-400"],
  [/^cobro/i, "Cobro", "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"],
  [/^factura/i, "Factura", "bg-sky-500/10 text-sky-700 dark:text-sky-400"],
  [/^ticket/i, "Ticket", "bg-violet-500/10 text-violet-700 dark:text-violet-400"],
  [/^(liquidaci|comisi|cuota)/i, "Banco / TPV", "bg-teal-500/10 text-teal-700 dark:text-teal-400"],
  [/^(compra|pago|dua|importaci)/i, "Compra", "bg-slate-500/10 text-slate-700 dark:text-slate-300"],
];
const operacionDe = (concepto: string) => OPERACIONES.find(([re]) => re.test(concepto.trim())) || null;
const celdaCsv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function AsientosPage() {
  const [pestana, setPestana] = useState("asientos");
  const [filas, setFilas] = useState<AsientoResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [porEstado, setPorEstado] = useState<Record<string, number>>({});
  const [estado, setEstado] = useState<"" | EstadoAsiento>("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [origen, setOrigen] = useState("");
  const [numero, setNumero] = useState("");
  const [concepto, setConcepto] = useState("");
  const [importeMin, setImporteMin] = useState("");
  const [importeMax, setImporteMax] = useState("");
  const [exportando, setExportando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editar, setEditar] = useState<DetalleAsiento | null>(null);
  const [lote, setLote] = useState(false);
  const [sincAbierto, setSincAbierto] = useState(false);
  const [eventosConError, setEventosConError] = useState(0);
  const plan = usePlan();
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);
  useEffect(() => setPagina(1), [estado, busquedaAplicada, porPagina, desde, hasta, origen, importeMin, importeMax, numero, concepto]);

  const cargar = useCallback(async () => {
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const d = await apiC<{ total: number; asientos: AsientoResumen[]; porEstado: Record<string, number> }>("asientos", {
        query: { limit: porPagina, offset: (pagina - 1) * porPagina, estado, q: busquedaAplicada.trim(), desde, hasta, origen, importeMin, importeMax, numero, concepto },
      });
      if (id !== consulta.current) return;
      setFilas(d.asientos);
      setTotal(d.total);
      setPorEstado(d.porEstado);
      setSeleccion(new Set());
      // Operaciones que no han podido generar su asiento: se avisa aquí para que no pasen días sin que nadie lo vea.
      apiC<{ porEstado: Record<string, number> }>("eventos", { query: { limit: 1 } }).then((e) => setEventosConError(e.porEstado?.error ?? 0)).catch(() => {});
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [pagina, porPagina, estado, busquedaAplicada, desde, hasta, origen, importeMin, importeMax, numero, concepto]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const hayFiltros = !!(estado || busquedaAplicada.trim() || desde || hasta || origen || importeMin || importeMax || numero || concepto);
  function quitarFiltros() {
    setEstado(""); setBusqueda(""); setDesde(""); setHasta(""); setOrigen(""); setImporteMin(""); setImporteMax(""); setNumero(""); setConcepto("");
  }

  // Exporta TODOS los asientos que cumplen los filtros activos (no solo la página), en bloques de 500, a un CSV que abre Excel (separador «;», coma decimal).
  async function exportarCsv() {
    setExportando(true);
    try {
      const todos: AsientoResumen[] = [];
      for (let offset = 0; ; offset += 500) {
        const d = await apiC<{ asientos: AsientoResumen[] }>("asientos", { query: { limit: 500, offset, estado, q: busquedaAplicada.trim(), desde, hasta, origen, importeMin, importeMax, numero, concepto } });
        todos.push(...d.asientos);
        if (d.asientos.length < 500) break;
      }
      if (todos.length === 0) return toast.error("No hay asientos que exportar con estos filtros");
      const cab = ["Nº", "Fecha", "Concepto", "Tipo", "Estado", "Origen", "Referencia de origen", "Importe"];
      const filasCsv = todos.map((f) => [f.numero || `#${f.id}`, f.fecha, f.concepto, f.tipo, f.estado, f.origen_tipo || "", f.origen_id || "", String(f.total ?? 0).replace(".", ",")]);
      descargarCsv("\uFEFF" + [cab, ...filasCsv].map((r) => r.map(celdaCsv).join(";")).join("\r\n"), `asientos-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`${todos.length} asiento${todos.length !== 1 ? "s" : ""} exportado${todos.length !== 1 ? "s" : ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setExportando(false);
    }
  }
  const seleccionables = filas.filter((f) => f.estado === "BORRADOR" || f.estado === "VALIDADO");

  async function accionLote(accion: "validar" | "contabilizar") {
    setLote(true);
    try {
      const r = await apiC<{ ok: number; fallidos: { id: number; error: string }[] }>("asientos/lote", { metodo: "POST", cuerpo: { accion, ids: [...seleccion] } });
      if (r.ok) toast.success(`${r.ok} asiento(s) ${accion === "validar" ? "validados" : "contabilizados"}`);
      if (r.fallidos.length) toast.error(`${r.fallidos.length} con error: ${r.fallidos[0].error}`);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLote(false);
    }
  }

  const kpiEstado = (e: EstadoAsiento, titulo: string, color: string) => (
    <Kpi titulo={titulo} valor={String(porEstado[e] ?? 0)} color={color} activo={estado === e} onClick={() => setEstado(estado === e ? "" : e)} />
  );

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<DocumentText className="size-4.5" />}
        titulo="Asientos contables"
        descripcion="Los borradores se generan solos desde las operaciones; aquí se revisan, validan y contabilizan"
        acciones={
          <>
            <Button size="sm" variant="outline" onClick={() => setSincAbierto(true)}>Sincronizar operaciones</Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditar(null); setFormAbierto(true); }}>
              <Add className="size-4" /> Asiento manual
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
              <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
            </Button>
          </>
        }
      />
      <InfoVista>Todos los apuntes contables (los movimientos de debe/haber), en sus tres estados: borrador, validado y contabilizado. Ejemplo: la venta de un ticket de reparación genera un borrador que carga Caja (570) y abona Ventas (700) e IVA repercutido (477); al contabilizarlo, ya cuenta en el resto de informes.</InfoVista>

      {eventosConError > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <span>⚠️ Hay <strong>{eventosConError}</strong> operaciones que no han podido generar su asiento (aparecen en la «Bandeja de eventos» con el motivo). Al sincronizar se reintentan; si el motivo no se ha arreglado, seguirán ahí.</span>
          <Button size="sm" variant="outline" className="h-7 border-red-300 text-red-800" onClick={() => setPestana("eventos")}>Ver la bandeja</Button>
        </div>
      )}

      <Tabs value={pestana} onValueChange={(v) => setPestana(String(v))}>
        <TabsList>
          <TabsTrigger value="asientos">Asientos</TabsTrigger>
          <TabsTrigger value="eventos">Bandeja de eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="asientos" className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {kpiEstado("BORRADOR", "Borradores", "text-amber-600 dark:text-amber-400")}
            {kpiEstado("VALIDADO", "Validados", "text-sky-600 dark:text-sky-400")}
            {kpiEstado("CONTABILIZADO", "Contabilizados", "text-emerald-600 dark:text-emerald-400")}
            {kpiEstado("CERRADO", "Cerrados", "text-muted-foreground")}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por concepto, número u origen…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            {hayFiltros && <Button variant="ghost" size="sm" className="h-8" onClick={quitarFiltros}>Quitar filtros</Button>}
            <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={exportando || total === 0} onClick={exportarCsv} title="Descarga todos los asientos que cumplen los filtros actuales">
              <DocumentDownload className="size-4" /> {exportando ? "Exportando…" : "Exportar CSV"}
            </Button>
            {seleccion.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{seleccion.size} seleccionado(s) · <strong className="text-foreground tabular-nums">{eur(filas.filter((f) => seleccion.has(f.id)).reduce((s, f) => s + (f.total ?? 0), 0))}</strong></span>
                <Button size="sm" variant="outline" disabled={lote} onClick={() => accionLote("validar")}>Validar</Button>
                <Button size="sm" disabled={lote} onClick={() => accionLote("contabilizar")}>Validar y contabilizar</Button>
              </div>
            )}
          </div>

          <CajaError mensaje={error || plan.error} />

          <div className="max-h-[70vh] overflow-auto rounded-lg border bg-card">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      aria-label="Seleccionar todos"
                      checked={seleccionables.length > 0 && seleccion.size === seleccionables.length}
                      onCheckedChange={(c) => setSeleccion(c ? new Set(seleccionables.map((f) => f.id)) : new Set())}
                    />
                  </TableHead>
                  <TableHead>Nº<ColumnaFiltroTexto valor={numero} placeholder="Nº de asiento…" onAplicar={setNumero} /></TableHead>
                  <TableHead>Fecha<ColumnaFiltroFechas valor={{ desde, hasta }} onAplicar={(r) => { setDesde(r.desde); setHasta(r.hasta); }} /></TableHead>
                  <TableHead>Concepto<ColumnaFiltroTexto valor={concepto} placeholder="Contiene…" onAplicar={setConcepto} /></TableHead>
                  <TableHead>Origen<ColumnaFiltroOpciones valor={origen} opciones={ORIGENES.map((o) => ({ id: o.valor, etiqueta: o.etiqueta }))} onAplicar={setOrigen} /></TableHead>
                  <TableHead className="text-right">Importe<ColumnaFiltroRango seleccion={importeMin || importeMax ? { min: importeMin ? Number(importeMin) : null, max: importeMax ? Number(importeMax) : null } : null} onAplicar={(r) => { setImporteMin(r?.min != null ? String(r.min) : ""); setImporteMax(r?.max != null ? String(r.max) : ""); }} /></TableHead>
                  <TableHead>Estado<ColumnaFiltroOpciones valor={estado} opciones={[{ id: "BORRADOR", etiqueta: "Borrador" }, { id: "VALIDADO", etiqueta: "Validado" }, { id: "CONTABILIZADO", etiqueta: "Contabilizado" }, { id: "CERRADO", etiqueta: "Cerrado" }]} onAplicar={(v) => setEstado(v === "BORRADOR" || v === "VALIDADO" || v === "CONTABILIZADO" || v === "CERRADO" ? v : "")} /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando && <FilasCarga columnas={7} />}
                {!cargando && filas.length === 0 && <FilaVacia columnas={7} texto="Todavía no hay asientos. Aparecerán aquí cuando las operaciones generen eventos contables." />}
                {!cargando &&
                  filas.map((f) => (
                    <TableRow key={f.id} className="cursor-pointer even:bg-muted/20 hover:bg-muted/50" onClick={() => setDetalleId(f.id)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {(f.estado === "BORRADOR" || f.estado === "VALIDADO") && (
                          <Checkbox
                            aria-label={`Seleccionar asiento ${f.id}`}
                            checked={seleccion.has(f.id)}
                            onCheckedChange={(c) => setSeleccion((s) => { const n = new Set(s); if (c) n.add(f.id); else n.delete(f.id); return n; })}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">{f.numero || <span className="text-muted-foreground">#{f.id}</span>}</TableCell>
                      <TableCell className="tabular-nums">{fechaCorta(f.fecha)}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="flex items-center gap-2">
                          {(() => { const o = operacionDe(f.concepto); return o ? <span className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${o[2]}`}>{o[1]}</span> : null; })()}
                          <span className="truncate" title={f.concepto}>{f.concepto}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => { const o = origenLegible(f); return (<><div className="text-sm">{o.titulo}</div>{o.detalle && <div className="text-xs text-muted-foreground">{o.detalle}</div>}</>); })()}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{num(f.total)}</TableCell>
                      <TableCell><EstadoBadge estado={f.estado} /></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>{total === 0 ? "0 asientos" : `${(pagina - 1) * porPagina + 1}–${Math.min(pagina * porPagina, total)} de ${total} asientos`}</span>
              {filas.length > 0 && <span className="hidden sm:inline">· importe de la página: <strong className="text-foreground tabular-nums">{eur(filas.reduce((s, f) => s + (f.total ?? 0), 0))}</strong></span>}
              <label className="flex items-center gap-1.5 text-xs">
                Filas por página
                <Select value={String(porPagina)} onValueChange={(v) => setPorPagina(Number(v) || 25)}>
                  <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPCIONES_POR_PAGINA.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="size-8" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}><ArrowLeft2 className="size-4" /></Button>
              <span className="px-2 tabular-nums">{pagina} / {totalPaginas}</span>
              <Button variant="outline" size="icon" className="size-8" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}><ArrowRight2 className="size-4" /></Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="eventos" className="pt-3">
          <BandejaEventos onAsiento={setDetalleId} onCambio={cargar} />
        </TabsContent>
      </Tabs>

      <AsientoDialog
        id={detalleId}
        onClose={() => setDetalleId(null)}
        onCambio={cargar}
        onEditar={(d) => { setDetalleId(null); setEditar(d); setFormAbierto(true); }}
      />
      <SincronizarDialog abierto={sincAbierto} onClose={() => setSincAbierto(false)} onHecho={cargar} />
      <AsientoFormDialog
        abierto={formAbierto}
        editar={editar}
        cuentas={plan.cuentas}
        onClose={() => setFormAbierto(false)}
        onGuardado={() => { setFormAbierto(false); cargar(); }}
      />
    </div>
  );
}

function BandejaEventos({ onAsiento, onCambio }: { onAsiento: (id: number) => void; onCambio: () => void }) {
  const [eventos, setEventos] = useState<EventoContable[]>([]);
  const [porEstado, setPorEstado] = useState<Record<string, number>>({});
  const [estado, setEstado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [ignorando, setIgnorando] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = await apiC<{ eventos: EventoContable[]; porEstado: Record<string, number> }>("eventos", { query: { estado, limit: 100 } });
      setEventos(d.eventos);
      setPorEstado(d.porEstado);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [estado]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function accion(ruta: string, cuerpo: unknown, ok: string) {
    setProcesando(true);
    try {
      const r = await apiC<{ errores?: number }>(ruta, { metodo: "POST", cuerpo });
      if (r.errores) toast.error(`${r.errores} evento(s) con error; revisa el detalle`);
      else toast.success(ok);
      setIgnorando(null);
      setMotivo("");
      await cargar();
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setProcesando(false);
    }
  }

  const etiqueta: Record<string, string> = { pendiente: "Pendientes", procesado: "Procesados", error: "Con error", ignorado: "Ignorados" };
  const color: Record<string, string> = { pendiente: "text-amber-600 dark:text-amber-400", procesado: "text-emerald-600 dark:text-emerald-400", error: "text-red-600 dark:text-red-400", ignorado: "text-muted-foreground" };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Object.keys(etiqueta).map((e) => (
          <Kpi key={e} titulo={etiqueta[e]} valor={String(porEstado[e] ?? 0)} color={color[e]} activo={estado === e} onClick={() => setEstado(estado === e ? "" : e)} />
        ))}
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" disabled={procesando || !(porEstado.pendiente > 0)} onClick={() => accion("eventos/procesar", {}, "Eventos procesados")}>
          Procesar pendientes
        </Button>
      </div>
      <CajaError mensaje={error} />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && <FilasCarga columnas={5} />}
            {!cargando && eventos.length === 0 && <FilaVacia columnas={5} texto="No hay eventos con este filtro." />}
            {!cargando &&
              eventos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.tipo_evento}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(() => {
                      const numero = (e.payload as { numero?: string } | null)?.numero;
                      const resguardo = e.origen_tipo === "reparaciones" ? e.origen_id.split(":")[0] : null;
                      return (
                        <>
                          {numero && <div className="font-medium text-foreground">Documento {numero}</div>}
                          <div>{e.origen_tipo} · {e.origen_id}</div>
                          {resguardo && (
                            <a href={`/reparaciones?resguardo=${encodeURIComponent(resguardo)}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              Abrir la reparación {resguardo}
                            </a>
                          )}
                          {e.asiento_id && <div>Asiento n.º {e.asiento_id}</div>}
                        </>
                      );
                    })()}
                  </TableCell>
                  <TableCell><span className={`text-sm font-medium ${color[e.estado]}`}>{etiqueta[e.estado]?.replace(/s$/, "")}</span></TableCell>
                  <TableCell className="max-w-md text-xs text-muted-foreground">
                    {ignorando === e.id ? (
                      <div className="flex gap-2">
                        <Input className="h-7" placeholder="Motivo" value={motivo} onChange={(ev) => setMotivo(ev.target.value)} />
                        <Button size="sm" className="h-7" disabled={procesando || !motivo.trim()} onClick={() => accion(`eventos/${e.id}/ignorar`, { motivo }, "Evento ignorado")}>Ignorar</Button>
                      </div>
                    ) : (
                      e.error || (e.asiento_id ? `Asiento #${e.asiento_id}` : "")
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {e.asiento_id && <Button size="sm" variant="ghost" className="h-7" onClick={() => onAsiento(e.asiento_id!)}>Ver asiento</Button>}
                      {e.estado === "error" && <Button size="sm" variant="outline" className="h-7" disabled={procesando} onClick={() => accion(`eventos/${e.id}/reprocesar`, {}, "Reprocesado")}>Reintentar</Button>}
                      {(e.estado === "error" || e.estado === "pendiente") && ignorando !== e.id && <Button size="sm" variant="ghost" className="h-7" onClick={() => setIgnorando(e.id)}>Ignorar</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
