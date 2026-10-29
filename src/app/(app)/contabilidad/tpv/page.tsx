"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CardPos, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, fechaCorta, num } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga, InfoVista, Kpi } from "../_ui";

interface BancoRes { banco_id: number; banco: string; cuenta: string; cobros_pendientes: number; pendiente: number; saldo_contabilizado: number }
interface LineaTpv { linea_id: number; asiento_id: number; numero: string | null; estado: string; fecha: string; concepto: string; importe: number }
interface Movimiento {
  id: number; banco_id: number; banco: string; fecha: string; importe: number; concepto: string; referencia: string;
  estado: "pendiente" | "conciliado" | "ya_contabilizado" | "ignorado"; clase_sugerida: string | null; nota: string | null; asiento_id: number | null; liquidacion_id: number | null;
}
type Modo = "con_iva" | "exento" | "sin_iva";

const ETQ_ESTADO: Record<Movimiento["estado"], { t: string; c: string }> = {
  pendiente: { t: "Pendiente", c: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  conciliado: { t: "Conciliado", c: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  ya_contabilizado: { t: "Ya contabilizado", c: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  ignorado: { t: "Ignorado", c: "bg-muted text-muted-foreground" },
};
const CLASES_CARGO = [
  { v: "comision_tpv", t: "Comisión del TPV" },
  { v: "cuota_tpv", t: "Cuota / alquiler del TPV" },
  { v: "devolucion", t: "Devolución de un cobro" },
  { v: "contracargo", t: "Contracargo" },
];
const MODOS_IVA: { v: Modo; t: string }[] = [
  { v: "sin_iva", t: "Sin IVA" },
  { v: "exento", t: "Exenta de IVA" },
  { v: "con_iva", t: "Con IVA (21 %, incluido en el importe)" },
];

async function leerArchivo(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  // Muchos bancos exportan en Windows-1252/ISO-8859-1: si hay caracteres rotos, se vuelve a leer así.
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buf) : utf8;
}

export default function TpvPage() {
  const [resumen, setResumen] = useState<BancoRes[]>([]);
  const [bancos, setBancos] = useState<{ id: number; nombre: string }[]>([]);
  const [activoDesde, setActivoDesde] = useState<string | null>(null);
  const [fechaActivar, setFechaActivar] = useState("");
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [total, setTotal] = useState(0);
  const [porEstado, setPorEstado] = useState<Record<string, number>>({});
  const [filtroBanco, setFiltroBanco] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [filtroSigno, setFiltroSigno] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [bancoImportar, setBancoImportar] = useState("");
  const [liquidar, setLiquidar] = useState<Movimiento | null>(null);
  const [cargo, setCargo] = useState<Movimiento | null>(null);
  const [marcar, setMarcar] = useState<{ mov: Movimiento; accion: "ya_contabilizado" | "ignorado" } | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const POR_PAGINA = 50;

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [a, m] = await Promise.all([
        apiC<{ activo_desde: string | null; bancos: { id: number; nombre: string }[]; resumen: BancoRes[] }>("tpv"),
        apiC<{ total: number; movimientos: Movimiento[]; porEstado: Record<string, number> }>("tpv/movimientos", {
          query: { banco_id: filtroBanco, estado: filtroEstado, signo: filtroSigno, q: busqueda.trim(), limit: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA },
        }),
      ]);
      setActivoDesde(a.activo_desde);
      setBancos(a.bancos);
      setResumen(a.resumen);
      setMovs(m.movimientos);
      setTotal(m.total);
      setPorEstado(m.porEstado);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [filtroBanco, filtroEstado, filtroSigno, busqueda, pagina]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => setPagina(1), [filtroBanco, filtroEstado, filtroSigno, busqueda]);

  async function guardarActivacion(desde: string | null) {
    setTrabajando(true);
    try {
      await apiC("tpv/configurar", { metodo: "POST", cuerpo: { desde } });
      toast.success(desde ? `Los cobros con tarjeta desde el ${fechaCorta(desde)} irán a la cuenta del TPV` : "Función desactivada: la tarjeta vuelve a ir directa al banco");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setTrabajando(false);
    }
  }

  async function importar(f: File) {
    if (!bancoImportar) return toast.error("Elige primero el banco del extracto");
    setTrabajando(true);
    try {
      const texto = await leerArchivo(f);
      const r = await apiC<{ formato: string; leidos: number; nuevos: number; duplicados: number; desde: string; hasta: string }>("tpv/importar", {
        metodo: "POST",
        cuerpo: { banco_id: Number(bancoImportar), nombre: f.name, texto },
      });
      toast.success(`${r.nuevos} movimientos nuevos (${r.duplicados} ya estaban) · ${fechaCorta(r.desde)} – ${fechaCorta(r.hasta)} · ${r.formato === "norma43" ? "Norma 43" : "CSV"}`);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setTrabajando(false);
      if (archivo.current) archivo.current.value = "";
    }
  }

  async function deshacer(m: Movimiento) {
    if (!window.confirm("Se elimina el borrador de este asiento y el movimiento y los cobros quedan libres otra vez. ¿Continuar?")) return;
    try {
      await apiC("tpv/anular", { metodo: "POST", cuerpo: { movimiento_id: m.id } });
      toast.success("Conciliación deshecha");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }
  async function reabrir(m: Movimiento) {
    try {
      await apiC("tpv/marcar", { metodo: "POST", cuerpo: { movimiento_id: m.id, accion: "pendiente" } });
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pendienteTotal = resumen.reduce((s, r) => s + r.pendiente, 0);

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<CardPos className="size-4.5" />}
        titulo="Conciliación TPV y extractos"
        descripcion="Cobros con tarjeta pendientes de liquidar, extractos del banco y comisiones"
        acciones={<Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar"><Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /></Button>}
      />
      <InfoVista>
        Los cobros con tarjeta quedan primero en una cuenta puente del TPV (5729) por el importe completo de la venta. Cuando el banco ingresa la liquidación, la importas con el extracto, la emparejas con los cobros que cubre
        y al confirmar se genera un borrador: banco por el neto, comisión (626) y el TPV a cero. Ejemplo: 3 ventas con tarjeta por 124 €; el banco ingresa 122,50 € → comisión de 1,50 €.
      </InfoVista>
      <CajaError mensaje={error} />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
        <span className="font-medium">Cobros con tarjeta a la cuenta del TPV:</span>
        {activoDesde ? (
          <>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">Activo desde {fechaCorta(activoDesde)}</span>
            <Button size="sm" variant="outline" disabled={trabajando} onClick={() => guardarActivacion(null)}>Desactivar</Button>
          </>
        ) : (
          <>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Desactivado: la tarjeta va directa al banco</span>
            <Input type="date" className="h-8 w-40" value={fechaActivar} onChange={(e) => setFechaActivar(e.target.value)} aria-label="Activar desde" />
            <Button size="sm" disabled={trabajando || !fechaActivar} onClick={() => guardarActivacion(fechaActivar)}>Activar desde esa fecha</Button>
            <span className="text-xs text-muted-foreground">Solo afecta a operaciones nuevas; los borradores ya generados no cambian.</span>
          </>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Pendiente de liquidar (todos los bancos)" valor={eur(pendienteTotal)} color="text-amber-600 dark:text-amber-400" />
        {resumen.filter((r) => r.cobros_pendientes > 0 || r.saldo_contabilizado !== 0).map((r) => (
          <Kpi key={r.banco_id} titulo={`${r.banco} · ${r.cobros_pendientes} cobro(s) · cta. ${r.cuenta}`} valor={eur(r.pendiente)} color="" />
        ))}
      </div>
      {resumen.some((r) => Math.abs(r.pendiente - r.saldo_contabilizado) > 0.005 && r.saldo_contabilizado !== 0) && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Diferencia entre lo pendiente de liquidar y el saldo contabilizado de la cuenta del TPV:{" "}
          {resumen.filter((r) => Math.abs(r.pendiente - r.saldo_contabilizado) > 0.005 && r.saldo_contabilizado !== 0).map((r) => `${r.banco} (${eur(r.pendiente)} frente a ${eur(r.saldo_contabilizado)})`).join(" · ")}. Suele deberse a asientos aún en borrador.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <span className="text-sm font-medium">Importar extracto:</span>
        <select className="h-8 rounded-md border bg-background px-2 text-sm" value={bancoImportar} onChange={(e) => setBancoImportar(e.target.value)} aria-label="Banco del extracto">
          <option value="">Banco…</option>
          {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
        <input ref={archivo} type="file" accept=".txt,.csv,.n43,.c43,.tsv,text/plain,text/csv" className="text-sm" disabled={trabajando} onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); }} />
        <span className="text-xs text-muted-foreground">Norma 43 (recomendada) o CSV con columnas Fecha e Importe (o Cargo/Abono). Un archivo ya importado no crea nada nuevo.</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="h-8 rounded-md border bg-background px-2 text-sm" value={filtroBanco} onChange={(e) => setFiltroBanco(e.target.value)} aria-label="Banco">
          <option value="">Todos los bancos</option>
          {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
        <select className="h-8 rounded-md border bg-background px-2 text-sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendientes ({porEstado.pendiente ?? 0})</option>
          <option value="conciliado">Conciliados ({porEstado.conciliado ?? 0})</option>
          <option value="ya_contabilizado">Ya contabilizados ({porEstado.ya_contabilizado ?? 0})</option>
          <option value="ignorado">Ignorados ({porEstado.ignorado ?? 0})</option>
        </select>
        <select className="h-8 rounded-md border bg-background px-2 text-sm" value={filtroSigno} onChange={(e) => setFiltroSigno(e.target.value)} aria-label="Tipo">
          <option value="">Abonos y cargos</option>
          <option value="abonos">Solo abonos</option>
          <option value="cargos">Solo cargos</option>
        </select>
        <Input className="h-8 w-56" placeholder="Buscar en concepto o referencia…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead><TableHead>Banco</TableHead><TableHead>Concepto</TableHead>
              <TableHead className="text-right">Importe</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && <FilasCarga columnas={6} />}
            {!cargando && movs.length === 0 && <FilaVacia columnas={6} texto="No hay movimientos con estos filtros. Importa un extracto para empezar." />}
            {!cargando && movs.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="tabular-nums">{fechaCorta(m.fecha)}</TableCell>
                <TableCell>{m.banco}</TableCell>
                <TableCell className="max-w-md text-sm">
                  <div className="truncate" title={m.concepto}>{m.concepto || "—"}</div>
                  {m.referencia && <div className="truncate text-xs text-muted-foreground" title={m.referencia}>Ref. {m.referencia}</div>}
                  {m.nota && <div className="text-xs text-muted-foreground">Nota: {m.nota}</div>}
                </TableCell>
                <TableCell className={`text-right tabular-nums ${m.importe < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{num(m.importe)}</TableCell>
                <TableCell><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ETQ_ESTADO[m.estado].c}`}>{ETQ_ESTADO[m.estado].t}</span></TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    {m.estado === "pendiente" && m.importe > 0 && <Button size="sm" className="h-7" onClick={() => setLiquidar(m)}>Liquidación TPV{m.clase_sugerida === "liquidacion_tpv" ? " ✓" : ""}</Button>}
                    {m.estado === "pendiente" && m.importe < 0 && <Button size="sm" className="h-7" onClick={() => setCargo(m)}>Registrar cargo</Button>}
                    {m.estado === "pendiente" && <Button size="sm" variant="outline" className="h-7" onClick={() => setMarcar({ mov: m, accion: "ya_contabilizado" })}>Ya contabilizado</Button>}
                    {m.estado === "pendiente" && <Button size="sm" variant="ghost" className="h-7" onClick={() => setMarcar({ mov: m, accion: "ignorado" })}>Ignorar</Button>}
                    {(m.estado === "ya_contabilizado" || m.estado === "ignorado") && <Button size="sm" variant="outline" className="h-7" onClick={() => reabrir(m)}>Reabrir</Button>}
                    {m.estado === "conciliado" && <Button size="sm" variant="outline" className="h-7" onClick={() => deshacer(m)}>Deshacer</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} movimiento(s)</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
          <span className="tabular-nums">{pagina} / {totalPaginas}</span>
          <Button variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</Button>
        </div>
      </div>

      {liquidar && <LiquidarDialog mov={liquidar} onClose={() => setLiquidar(null)} onHecho={() => { setLiquidar(null); void cargar(); }} />}
      {cargo && <CargoDialog mov={cargo} onClose={() => setCargo(null)} onHecho={() => { setCargo(null); void cargar(); }} />}
      {marcar && <MarcarDialog datos={marcar} onClose={() => setMarcar(null)} onHecho={() => { setMarcar(null); void cargar(); }} />}
    </div>
  );
}

function LiquidarDialog({ mov, onClose, onHecho }: { mov: Movimiento; onClose: () => void; onHecho: () => void }) {
  const [lineas, setLineas] = useState<LineaTpv[]>([]);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [modo, setModo] = useState<Modo>("sin_iva");
  const [ref, setRef] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiC<{ lineas: LineaTpv[] }>("tpv", { query: { banco_id: mov.banco_id } })
      .then((d) => { setLineas(d.lineas); })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setCargando(false));
  }, [mov.banco_id]);

  const bruto = lineas.filter((l) => sel.has(l.linea_id)).reduce((s, l) => s + l.importe, 0);
  const comision = bruto - mov.importe;
  const discrepancia = sel.size > 0 && comision < -0.005;

  async function confirmar() {
    setGuardando(true);
    setError(null);
    try {
      const r = await apiC<{ bruto: number; comision: number }>("tpv/liquidaciones", {
        metodo: "POST",
        cuerpo: { movimiento_id: mov.id, lineas: [...sel], iva_modo: modo, referencia_tpv: ref.trim() },
      });
      toast.success(`Borrador generado: bruto ${eur(r.bruto)}, comisión ${eur(r.comision)}`);
      onHecho();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(a) => { if (!a) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Liquidación del TPV · {mov.banco} · {fechaCorta(mov.fecha)} · {eur(mov.importe)}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Marca los cobros con tarjeta que cubre este ingreso. La diferencia con lo ingresado es la comisión del TPV.</p>
        <CajaError mensaje={error} />
        <div className="max-h-72 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"><Checkbox aria-label="Seleccionar todos" checked={lineas.length > 0 && sel.size === lineas.length} onCheckedChange={(c) => setSel(c ? new Set(lineas.map((l) => l.linea_id)) : new Set())} /></TableHead>
                <TableHead>Fecha</TableHead><TableHead>Asiento</TableHead><TableHead>Concepto</TableHead><TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargando && <FilasCarga columnas={5} filas={3} />}
              {!cargando && lineas.length === 0 && <FilaVacia columnas={5} texto="No hay cobros con tarjeta pendientes en este banco (¿está activada la función y hay ventas desde esa fecha?)." />}
              {lineas.map((l) => (
                <TableRow key={l.linea_id}>
                  <TableCell><Checkbox aria-label={`Cobro ${l.numero || l.asiento_id}`} checked={sel.has(l.linea_id)} onCheckedChange={(c) => setSel((s) => { const n = new Set(s); if (c) n.add(l.linea_id); else n.delete(l.linea_id); return n; })} /></TableCell>
                  <TableCell className="tabular-nums">{fechaCorta(l.fecha)}</TableCell>
                  <TableCell className="text-xs">{l.numero || `#${l.asiento_id}`} <span className="text-muted-foreground">({l.estado.toLowerCase()})</span></TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{l.concepto}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(l.importe)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Kpi titulo="Cobros seleccionados" valor={eur(bruto)} color="" />
          <Kpi titulo="Ingresado por el banco" valor={eur(mov.importe)} color="" />
          <Kpi titulo="Comisión implícita" valor={eur(comision)} color={discrepancia ? "text-red-600" : "text-amber-600 dark:text-amber-400"} />
        </div>
        {discrepancia && <p className="text-sm text-destructive">El banco ingresó más de lo seleccionado: falta marcar algún cobro.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm">IVA de la comisión
            <select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={modo} onChange={(e) => setModo(e.target.value as Modo)}>
              {MODOS_IVA.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
            </select>
          </label>
          <label className="text-sm">Referencia de la liquidación del TPV (opcional, evita duplicarla)
            <Input className="mt-1" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Nº de liquidación o lote" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={guardando || sel.size === 0 || discrepancia} onClick={confirmar}>{guardando ? "Generando…" : "Confirmar y generar borrador"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CargoDialog({ mov, onClose, onHecho }: { mov: Movimiento; onClose: () => void; onHecho: () => void }) {
  const [clase, setClase] = useState(mov.clase_sugerida === "comision_tpv" ? "comision_tpv" : "comision_tpv");
  const [modo, setModo] = useState<Modo>("sin_iva");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esGasto = clase === "comision_tpv" || clase === "cuota_tpv";
  async function confirmar() {
    setGuardando(true);
    setError(null);
    try {
      await apiC("tpv/cargos", { metodo: "POST", cuerpo: { movimiento_id: mov.id, clase, iva_modo: modo } });
      toast.success("Borrador generado");
      onHecho();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }
  return (
    <Dialog open onOpenChange={(a) => { if (!a) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Cargo del banco · {fechaCorta(mov.fecha)} · {eur(mov.importe)}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{mov.concepto}</p>
        <CajaError mensaje={error} />
        <label className="text-sm">¿Qué es?
          <select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={clase} onChange={(e) => setClase(e.target.value)}>
            {CLASES_CARGO.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
          </select>
        </label>
        {esGasto ? (
          <label className="text-sm">IVA según la documentación del banco
            <select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={modo} onChange={(e) => setModo(e.target.value as Modo)}>
              {MODOS_IVA.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
            </select>
          </label>
        ) : (
          <p className="text-xs text-muted-foreground">Se registra contra la cuenta 555 (partidas pendientes) hasta que se resuelva con la rectificativa o la reclamación.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={guardando} onClick={confirmar}>{guardando ? "Generando…" : "Generar borrador"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarcarDialog({ datos, onClose, onHecho }: { datos: { mov: Movimiento; accion: "ya_contabilizado" | "ignorado" }; onClose: () => void; onHecho: () => void }) {
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ya = datos.accion === "ya_contabilizado";
  async function confirmar() {
    setGuardando(true);
    setError(null);
    try {
      await apiC("tpv/marcar", { metodo: "POST", cuerpo: { movimiento_id: datos.mov.id, accion: datos.accion, nota } });
      onHecho();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }
  return (
    <Dialog open onOpenChange={(a) => { if (!a) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{ya ? "Marcar como ya contabilizado" : "Ignorar movimiento"}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          {ya ? "Úsalo para cobros con tarjeta que ya estaban contabilizados directamente en el banco antes de activar esta función: así no se duplican al importar extractos históricos." : "El movimiento no generará ningún asiento."}
        </p>
        <CajaError mensaje={error} />
        <label className="text-sm">Nota {ya ? "(por ejemplo, el nº de asiento donde ya está)" : "(motivo)"}
          <Input className="mt-1" value={nota} onChange={(e) => setNota(e.target.value)} />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={guardando || !nota.trim()} onClick={confirmar}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
