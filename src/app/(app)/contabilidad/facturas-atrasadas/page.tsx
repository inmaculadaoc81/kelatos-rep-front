"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Refresh2, Calendar, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, fechaCorta, num } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga, InfoVista, Kpi } from "../_ui";

interface Linea { cuenta_codigo: string; cuenta_nombre?: string; debe: number; haber: number }
interface Propuesta { tipo_evento: string; fecha: string; concepto: string; lineas: Linea[] }
interface Atrasada {
  id: number; recepcion_id: string; numero: string; proveedor: string; categoria: string; moneda: string; base: number; total: number; estado_pago: string;
  fecha_emision: string | null; fecha_operacion: string | null; fecha_recepcion: string | null; fecha_contabilizacion: string | null; fecha_iva: string | null;
  propuesta_fecha: string | null; estado: "pendiente" | "contabilizada_en_borrador"; aprobada_por: string | null; nota: string | null;
  requiere_confirmar_iva: boolean; avisos: string[]; motivo_bloqueo: string | null; motivo_actual: string | null; propuesta: Propuesta[] | null;
  asientos: { id: number; estado: string; fecha: string }[];
}

export default function FacturasAtrasadasPage() {
  const [filas, setFilas] = useState<Atrasada[]>([]);
  const [inicio, setInicio] = useState<string | null>(null);
  const [apertura, setApertura] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revisar, setRevisar] = useState<Atrasada | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = await apiC<{ inicio: string | null; apertura_cargada?: boolean; facturas: Atrasada[] }>("facturas-atrasadas");
      setFilas(d.facturas);
      setInicio(d.inicio);
      setApertura(!!d.apertura_cargada);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const pendientes = filas.filter((f) => f.estado === "pendiente");

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<Calendar className="size-4.5" />}
        titulo="Facturas atrasadas"
        descripcion="Facturas recibidas con fecha anterior al inicio de la contabilidad, para revisarlas y registrarlas sin abrir periodos"
        acciones={
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        }
      />
      <InfoVista>
        Una factura de {inicio ? `antes del ${fechaCorta(inicio)}` : "fechas anteriores al inicio"} no se contabiliza sola. Aquí revisas la propuesta, eliges su <strong>fecha de contabilización</strong> (en un periodo abierto) y, si hace falta, el
        periodo de IVA. La fecha original de la factura no se modifica y el asiento queda en <strong>borrador</strong> para que lo revises antes de validarlo.
      </InfoVista>
      {!apertura && !cargando && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          <Warning2 className="mt-0.5 size-3.5 shrink-0" />
          <p>No hay asiento de apertura cargado, así que el sistema no puede comprobar si estas facturas ya estaban en los saldos iniciales. Confirma con la gestoría que no están contabilizadas antes de aprobar.</p>
        </div>
      )}
      <CajaError mensaje={error} />

      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <Kpi titulo="Pendientes de revisar" valor={String(pendientes.length)} color={pendientes.length ? "text-amber-600 dark:text-amber-400" : ""} />
        <Kpi titulo="Ya aprobadas (en borrador)" valor={String(filas.length - pendientes.length)} color="" />
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-lg border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
            <TableRow>
              <TableHead>Recepción</TableHead>
              <TableHead>Proveedor / nº</TableHead>
              <TableHead>Emisión</TableHead>
              <TableHead>Recibida</TableHead>
              <TableHead>Contabilización</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && <FilasCarga columnas={8} />}
            {!cargando && filas.length === 0 && <FilaVacia columnas={8} texto="No hay facturas atrasadas: todas las facturas validadas son posteriores al inicio de la contabilidad." />}
            {!cargando &&
              filas.map((f) => (
                <TableRow key={f.id} className="even:bg-muted/20 hover:bg-muted/50">
                  <TableCell className="font-medium">{f.recepcion_id}</TableCell>
                  <TableCell>
                    <div>{f.proveedor}</div>
                    <div className="text-xs text-muted-foreground">nº {f.numero}</div>
                  </TableCell>
                  <TableCell className="tabular-nums">{f.fecha_emision ? fechaCorta(f.fecha_emision) : "—"}</TableCell>
                  <TableCell className="tabular-nums">{f.fecha_recepcion ? fechaCorta(f.fecha_recepcion) : "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    {f.fecha_contabilizacion ? fechaCorta(f.fecha_contabilizacion) : <span className="text-muted-foreground">sin fijar</span>}
                    {f.fecha_iva && <div className="text-xs text-muted-foreground">IVA: {fechaCorta(f.fecha_iva)}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{eur(f.total)}</TableCell>
                  <TableCell>
                    {f.estado === "pendiente" ? (
                      <span className="inline-flex whitespace-nowrap rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">Pendiente de revisar</span>
                    ) : (
                      <span className="inline-flex whitespace-nowrap rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400" title={f.asientos.map((a) => `#${a.id} ${a.estado}`).join(", ")}>
                        Asiento en borrador
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant={f.estado === "pendiente" ? "default" : "outline"} className="h-7" onClick={() => setRevisar(f)}>
                      {f.estado === "pendiente" ? "Revisar" : "Ver"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {revisar && <RevisarDialog f={revisar} inicio={inicio} onCerrar={() => setRevisar(null)} onAprobada={() => { setRevisar(null); cargar(); }} />}
    </div>
  );
}

function RevisarDialog({ f, inicio, onCerrar, onAprobada }: { f: Atrasada; inicio: string | null; onCerrar: () => void; onAprobada: () => void }) {
  const soloVer = f.estado !== "pendiente";
  const [fechaContab, setFechaContab] = useState(f.fecha_contabilizacion || f.propuesta_fecha || "");
  const [fechaIva, setFechaIva] = useState(f.fecha_iva || "");
  const [nota, setNota] = useState(f.nota || "");
  const [confirmaIva, setConfirmaIva] = useState(false);
  const [confirmaApertura, setConfirmaApertura] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hayAvisoApertura = f.avisos.some((a) => a.startsWith("No hay asiento de apertura"));
  const puede = !soloVer && !!fechaContab && (!inicio || fechaContab >= inicio) && (!f.requiere_confirmar_iva || confirmaIva) && (!hayAvisoApertura || confirmaApertura) && !guardando;

  async function aprobar() {
    setGuardando(true);
    setError(null);
    try {
      await apiC(`facturas-atrasadas/${f.id}/aprobar`, { metodo: "POST", cuerpo: { fecha_contabilizacion: fechaContab, fecha_iva: fechaIva || null, nota: nota.trim() || null, confirma_iva: confirmaIva } });
      toast.success("Aprobada: asiento generado en borrador");
      onAprobada();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(a) => { if (!a) onCerrar(); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{f.recepcion_id} · {f.proveedor} · nº {f.numero}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <div><span className="text-muted-foreground">Emisión</span><div className="font-medium">{f.fecha_emision ? fechaCorta(f.fecha_emision) : "—"}</div></div>
          <div><span className="text-muted-foreground">Operación</span><div className="font-medium">{f.fecha_operacion ? fechaCorta(f.fecha_operacion) : "no indicada"}</div></div>
          <div><span className="text-muted-foreground">Recepción</span><div className="font-medium">{f.fecha_recepcion ? fechaCorta(f.fecha_recepcion) : "—"}</div></div>
          <div><span className="text-muted-foreground">Total</span><div className="font-medium">{eur(f.total)} · {f.estado_pago}</div></div>
        </div>

        {f.motivo_actual && <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{f.motivo_actual}</p>}
        {f.motivo_bloqueo && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">No se puede preparar el asiento: {f.motivo_bloqueo}</p>
        )}
        {f.avisos.length > 0 && (
          <ul className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            {f.avisos.map((a) => <li key={a}>• {a}</li>)}
          </ul>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Fecha de contabilización</label>
            <Input type="date" value={fechaContab} min={inicio || undefined} disabled={soloVer} onChange={(e) => setFechaContab(e.target.value)} />
            <p className="text-xs text-muted-foreground">Debe caer en un periodo abierto{inicio ? ` (desde ${fechaCorta(inicio)})` : ""}. No se reabre ningún periodo.</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Fecha para el periodo de IVA <span className="font-normal text-muted-foreground">(opcional)</span></label>
            <Input type="date" value={fechaIva} min={inicio || undefined} disabled={soloVer} onChange={(e) => setFechaIva(e.target.value)} />
            <p className="text-xs text-muted-foreground">Si no la indicas, el IVA va al mismo periodo que el asiento. Puede ser distinta.</p>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Nota de revisión</label>
          <Input value={nota} disabled={soloVer} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: confirmado con la gestoría, no estaba en agosto" />
        </div>

        {f.propuesta && f.propuesta.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Asientos propuestos (borrador)</h3>
            {f.propuesta.map((p, i) => (
              <div key={i} className="overflow-hidden rounded-lg border">
                <div className="bg-muted/40 px-3 py-1.5 text-xs font-medium">{fechaCorta(p.fecha)} · {p.concepto}</div>
                <Table>
                  <TableBody>
                    {p.lineas.map((l, j) => (
                      <TableRow key={j}>
                        <TableCell className="py-1 font-medium tabular-nums">{l.cuenta_codigo}</TableCell>
                        <TableCell className="py-1 text-xs text-muted-foreground">{l.cuenta_nombre}</TableCell>
                        <TableCell className="py-1 text-right tabular-nums">{l.debe ? num(l.debe) : ""}</TableCell>
                        <TableCell className="py-1 text-right tabular-nums">{l.haber ? num(l.haber) : ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">El pago, si la factura figura como pagada, se contabiliza en la misma fecha y el cobro queda en partidas pendientes hasta asignar el banco.</p>
          </div>
        )}

        {!soloVer && (f.requiere_confirmar_iva || hayAvisoApertura) && (
          <div className="space-y-2 rounded-md border px-3 py-2 text-sm">
            {f.requiere_confirmar_iva && (
              <label className="flex cursor-pointer items-start gap-2"><Checkbox checked={confirmaIva} onCheckedChange={(c) => setConfirmaIva(!!c)} className="mt-0.5" /> He comprobado el tipo de operación y los requisitos fiscales del IVA autorrepercutido.</label>
            )}
            {hayAvisoApertura && (
              <label className="flex cursor-pointer items-start gap-2"><Checkbox checked={confirmaApertura} onCheckedChange={(c) => setConfirmaApertura(!!c)} className="mt-0.5" /> He confirmado que la factura no está ya contabilizada ni en saldos iniciales.</label>
            )}
          </div>
        )}
        {soloVer && f.aprobada_por && <p className="text-xs text-muted-foreground">Aprobada por {f.aprobada_por}. Para cambiar la fecha, edita el asiento en borrador desde Asientos.</p>}
        <CajaError mensaje={error} />

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>Cerrar</Button>
          {!soloVer && <Button disabled={!puede || !!f.motivo_bloqueo} onClick={aprobar}>{guardando ? "Generando…" : "Aprobar y generar borrador"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
