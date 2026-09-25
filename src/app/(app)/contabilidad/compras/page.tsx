"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MoneySend, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, fechaCorta, hoyISO, num } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga, Kpi } from "../_ui";

interface PagoRegistrado {
  id: number;
  fecha: string;
  importe: number;
  medio: string;
  banco: string | null;
  referencia: string | null;
}
interface FacturaCompra {
  id: number;
  numero: string;
  fecha: string;
  proveedor: string;
  categoria: string | null;
  tipo_documento: string | null;
  validada: boolean;
  contabilizable: boolean;
  motivo: string | null;
  total: number | null;
  pagado: number;
  pendiente: number | null;
  en_contabilidad: boolean;
  pagos: PagoRegistrado[];
}
interface Datos {
  facturas: FacturaCompra[];
  bancos: { id: number; nombre: string }[];
}

const MEDIOS: [string, string][] = [
  ["transferencia", "Transferencia"],
  ["tarjeta", "Tarjeta"],
  ["efectivo", "Efectivo"],
  ["otro", "Otro"],
];

/** Facturas de proveedor validadas y sus pagos reales (fecha, importe y banco). */
export default function ComprasPagosPage() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"" | "pendientes" | "pagadas" | "sin_validar">("");
  const [pagando, setPagando] = useState<FacturaCompra | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await apiC<Datos>("compras"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const todas = datos?.facturas ?? [];
  const pendientes = todas.filter((f) => f.validada && f.contabilizable && (f.pendiente ?? 0) > 0.004);
  const pagadas = todas.filter((f) => f.validada && f.contabilizable && (f.pendiente ?? 0) <= 0.004);
  const sinValidar = todas.filter((f) => !f.validada);
  const visibles = filtro === "pendientes" ? pendientes : filtro === "pagadas" ? pagadas : filtro === "sin_validar" ? sinValidar : todas;
  const porPagar = pendientes.reduce((s, f) => s + (f.pendiente ?? 0), 0);

  function estado(f: FacturaCompra) {
    if (!f.validada) return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">Sin validar</span>;
    if (!f.contabilizable) return <span title={f.motivo || ""} className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">No contabilizable</span>;
    if ((f.pendiente ?? 0) <= 0.004) return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">Pagada</span>;
    if (f.pagado > 0) return <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">Pago parcial</span>;
    return <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">Pendiente</span>;
  }

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<MoneySend className="size-4.5" />}
        titulo="Compras y pagos"
        descripcion="Registra cuándo, cuánto y por qué banco se pagó cada factura de proveedor; el asiento del pago sale de aquí"
        acciones={
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        }
      />
      <CajaError mensaje={error} />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi titulo="Pendientes de pago" valor={String(pendientes.length)} color="text-amber-600 dark:text-amber-400" activo={filtro === "pendientes"} onClick={() => setFiltro(filtro === "pendientes" ? "" : "pendientes")} />
        <Kpi titulo="Importe por pagar" valor={`${num(porPagar)} €`} color="" />
        <Kpi titulo="Pagadas" valor={String(pagadas.length)} color="text-emerald-600 dark:text-emerald-400" activo={filtro === "pagadas"} onClick={() => setFiltro(filtro === "pagadas" ? "" : "pagadas")} />
        <Kpi titulo="Sin validar en el Libro de Compras" valor={String(sinValidar.length)} color="text-muted-foreground" activo={filtro === "sin_validar"} onClick={() => setFiltro(filtro === "sin_validar" ? "" : "sin_validar")} />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">A pagar</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && !datos && <FilasCarga columnas={8} />}
            {datos && visibles.length === 0 && <FilaVacia columnas={8} texto="No hay facturas de compra con este filtro." />}
            {visibles.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="tabular-nums">{fechaCorta(f.fecha)}</TableCell>
                <TableCell className="font-medium">{f.numero}</TableCell>
                <TableCell>{f.proveedor}</TableCell>
                <TableCell className="text-right tabular-nums">{f.total == null ? "—" : num(f.total)}</TableCell>
                <TableCell className="text-right tabular-nums">{f.pagado ? num(f.pagado) : ""}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{f.pendiente == null ? "—" : num(f.pendiente)}</TableCell>
                <TableCell>{estado(f)}</TableCell>
                <TableCell className="text-right">
                  {f.validada && f.contabilizable && (
                    <Button size="sm" variant={(f.pendiente ?? 0) > 0.004 ? "outline" : "ghost"} className="h-7" onClick={() => setPagando(f)}>
                      {(f.pendiente ?? 0) > 0.004 ? "Registrar pago" : "Ver pagos"}
                    </Button>
                  )}
                  {!f.validada && <span className="text-xs text-muted-foreground">Valídala en el Libro de Compras</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PagoDialog factura={pagando} bancos={datos?.bancos ?? []} onClose={() => setPagando(null)} onGuardado={() => { setPagando(null); cargar(); }} />
    </div>
  );
}

function PagoDialog({ factura, bancos, onClose, onGuardado }: { factura: FacturaCompra | null; bancos: { id: number; nombre: string }[]; onClose: () => void; onGuardado: () => void }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [importe, setImporte] = useState("");
  const [medio, setMedio] = useState("transferencia");
  const [bancoId, setBancoId] = useState("");
  const [referencia, setReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visto, setVisto] = useState<number | null>(null);
  if ((factura?.id ?? null) !== visto) {
    setVisto(factura?.id ?? null);
    if (factura) {
      setFecha(hoyISO());
      setImporte(String(Math.max(0, factura.pendiente ?? 0)));
      setMedio("transferencia");
      setBancoId("");
      setReferencia("");
      setError(null);
    }
  }
  if (!factura) return <Dialog open={false} onOpenChange={() => {}}><DialogContent /></Dialog>;
  const pendiente = factura.pendiente ?? 0;

  async function guardar() {
    setEnviando(true);
    setError(null);
    try {
      await apiC(`compras/${factura!.id}/pagos`, {
        metodo: "POST",
        cuerpo: { fecha, importe: Number(importe.replace(",", ".")), medio, banco_id: medio === "efectivo" ? null : bancoId ? Number(bancoId) : null, referencia },
      });
      toast.success("Pago registrado; se contabilizará en la próxima sincronización");
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !enviando && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Pagos de {factura.numero}</DialogTitle>
        <p className="text-sm text-muted-foreground">{factura.proveedor} · a pagar {num(factura.total)} € · pendiente {num(pendiente)} €</p>
        {factura.pagos.length > 0 && (
          <div className="space-y-1 rounded-md border p-2 text-sm">
            {factura.pagos.map((p) => (
              <div key={p.id} className="flex justify-between gap-2">
                <span>{fechaCorta(p.fecha)} · {p.medio}{p.banco ? ` · ${p.banco}` : ""}{p.referencia ? ` · ${p.referencia}` : ""}</span>
                <span className="tabular-nums">{num(p.importe)} €</span>
              </div>
            ))}
          </div>
        )}
        {pendiente > 0.004 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha del pago" />
              <Input inputMode="decimal" className="text-right tabular-nums" value={importe} onChange={(e) => setImporte(e.target.value)} aria-label="Importe" />
            </div>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={medio} onChange={(e) => setMedio(e.target.value)} aria-label="Medio de pago">
              {MEDIOS.map(([v, et]) => <option key={v} value={v}>{et}</option>)}
            </select>
            {medio !== "efectivo" && (
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={bancoId} onChange={(e) => setBancoId(e.target.value)} aria-label="Banco">
                <option value="">Banco no identificado (pendiente de aplicar)</option>
                {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            )}
            <Input placeholder="Referencia (opcional)" value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={120} />
          </div>
        )}
        <CajaError mensaje={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={enviando}>Cerrar</Button>
          {pendiente > 0.004 && <Button onClick={guardar} disabled={enviando || !importe}>{enviando ? "Guardando…" : "Registrar pago"}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
