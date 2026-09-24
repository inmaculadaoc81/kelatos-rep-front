"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Add, ArrowLeft2, ArrowRight2, DocumentText, Refresh2, SearchNormal1 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, fechaCorta, num, type AsientoResumen, type DetalleAsiento, type EstadoAsiento, type EventoContable } from "@/lib/contabilidad";
import { CajaError, Cabecera, EstadoBadge, FilaVacia, FilasCarga, Kpi, usePlan } from "../_ui";
import { AsientoDialog } from "../asiento-dialog";
import { AsientoFormDialog } from "../asiento-form-dialog";

const POR_PAGINA = 25;

export default function AsientosPage() {
  const [pestana, setPestana] = useState("asientos");
  const [filas, setFilas] = useState<AsientoResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [porEstado, setPorEstado] = useState<Record<string, number>>({});
  const [estado, setEstado] = useState<"" | EstadoAsiento>("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editar, setEditar] = useState<DetalleAsiento | null>(null);
  const [lote, setLote] = useState(false);
  const plan = usePlan();
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);
  useEffect(() => setPagina(1), [estado, busquedaAplicada]);

  const cargar = useCallback(async () => {
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const d = await apiC<{ total: number; asientos: AsientoResumen[]; porEstado: Record<string, number> }>("asientos", {
        query: { limit: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA, estado, q: busquedaAplicada.trim() },
      });
      if (id !== consulta.current) return;
      setFilas(d.asientos);
      setTotal(d.total);
      setPorEstado(d.porEstado);
      setSeleccion(new Set());
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [pagina, estado, busquedaAplicada]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
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
            <Button size="sm" className="gap-1.5" onClick={() => { setEditar(null); setFormAbierto(true); }}>
              <Add className="size-4" /> Asiento manual
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
              <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
            </Button>
          </>
        }
      />

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
            {estado && <Button variant="ghost" size="sm" className="h-8" onClick={() => setEstado("")}>Quitar filtro</Button>}
            {seleccion.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{seleccion.size} seleccionado(s)</span>
                <Button size="sm" variant="outline" disabled={lote} onClick={() => accionLote("validar")}>Validar</Button>
                <Button size="sm" disabled={lote} onClick={() => accionLote("contabilizar")}>Validar y contabilizar</Button>
              </div>
            )}
          </div>

          <CajaError mensaje={error || plan.error} />

          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      aria-label="Seleccionar todos"
                      checked={seleccionables.length > 0 && seleccion.size === seleccionables.length}
                      onCheckedChange={(c) => setSeleccion(c ? new Set(seleccionables.map((f) => f.id)) : new Set())}
                    />
                  </TableHead>
                  <TableHead>Nº</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando && <FilasCarga columnas={7} />}
                {!cargando && filas.length === 0 && <FilaVacia columnas={7} texto="Todavía no hay asientos. Aparecerán aquí cuando las operaciones generen eventos contables." />}
                {!cargando &&
                  filas.map((f) => (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => setDetalleId(f.id)}>
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
                      <TableCell className="max-w-md truncate">{f.concepto}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.origen_id ? `${f.origen_tipo} · ${f.origen_id}` : f.tipo}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(f.total)}</TableCell>
                      <TableCell><EstadoBadge estado={f.estado} /></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} asiento(s)</span>
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
                  <TableCell className="text-xs text-muted-foreground">{e.origen_tipo} · {e.origen_id}</TableCell>
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
