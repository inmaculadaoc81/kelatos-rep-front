"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiC, hoyISO } from "@/lib/contabilidad";
import { CajaError } from "./_ui";

interface Resumen {
  simulacion: boolean;
  desde?: string;
  documentosLeidos: number;
  eventos: number;
  porTipo: Record<string, number>;
  nuevos: number;
  yaRegistrados: number;
  cambiadosEnOrigen: string[];
  anomalias: { origen: string; motivo: string }[];
  totalAnomalias: number;
  noCubiertos: Record<string, number>;
  registrados?: number;
  proceso?: { procesados: number; errores: number };
}

const ETIQUETA: Record<string, string> = {
  factura_reparacion: "Facturas de reparación",
  factura_venta: "Facturas de venta / manuales",
  ticket_reparacion: "Tickets de reparación",
  ticket_venta: "Tickets de venta / manuales",
  cobro_factura: "Cobros de facturas",
  rectificativa_emitida: "Rectificativas de reparación",
  rectificativa_emitida_venta: "Rectificativas de venta",
  rectificativa_ticket: "Rectificativas de ticket",
  rectificativa_ticket_venta: "Rectificativas de ticket de venta",
  devolucion_cliente: "Devoluciones al cliente",
  factura_proveedor: "Facturas de proveedor",
  factura_acreedor: "Facturas de acreedores (servicios)",
  factura_proveedor_autorrepercutida: "Facturas de proveedor con IVA autorrepercutido",
  factura_acreedor_autorrepercutida: "Facturas de acreedor con IVA autorrepercutido",
  rectificativa_proveedor: "Rectificativas de proveedor",
  pago_proveedor: "Pagos a proveedores",
  pago_acreedor: "Pagos a acreedores",
  dua_importacion: "Importaciones (DUA)",
  retirada_caja: "Retiradas de caja",
  ingreso_caja_en_banco: "Ingresos de efectivo en banco",
  ingreso_caja_socio: "Aportaciones del socio a la caja",
};
const NO_CUBIERTO: Record<string, string> = { alquileres: "Facturas de alquiler", facturas_mensajeria: "Facturas de mensajería" };

/** Trae las operaciones existentes a la bandeja contable. Siempre simula primero. */
export function SincronizarDialog({ abierto, onClose, onHecho }: { abierto: boolean; onClose: () => void; onHecho: () => void }) {
  const [desde, setDesde] = useState("2026-09-01");
  const [hasta, setHasta] = useState(hoyISO());
  const [res, setRes] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirma, setConfirma] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simular = useCallback(async () => {
    setCargando(true);
    setError(null);
    setConfirma(false);
    try {
      setRes(await apiC<Resumen>("sincronizar", { metodo: "POST", cuerpo: { desde, hasta, simular: true } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    if (abierto) simular();
  }, [abierto, simular]);

  async function registrar() {
    setCargando(true);
    setError(null);
    try {
      const r = await apiC<Resumen>("sincronizar", { metodo: "POST", cuerpo: { desde, hasta, simular: false, procesar: true } });
      toast.success(`${r.registrados ?? 0} eventos registrados; ${r.proceso?.procesados ?? 0} borradores generados${r.proceso?.errores ? ` (${r.proceso.errores} con error)` : ""}`);
      onHecho();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !cargando && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>Sincronizar operaciones</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Lee las facturas, tickets, cobros y rectificativas ya emitidos y prepara sus asientos como <strong>borradores</strong>. No modifica ninguna factura ni ticket.
          Primero se muestra una simulación; no se guarda nada hasta que confirmes. La contabilidad arranca el 01/09/2026: nada anterior se carga.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" className="w-40" value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" />
          <span className="text-xs text-muted-foreground">a</span>
          <Input type="date" className="w-40" value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" />
          <Button variant="outline" size="sm" onClick={simular} disabled={cargando}>Volver a simular</Button>
        </div>
        <CajaError mensaje={error} />
        {cargando && !res && <Skeleton className="h-40 w-full" />}
        {res && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-2"><div className="text-lg font-semibold tabular-nums">{res.documentosLeidos}</div><div className="text-xs text-muted-foreground">documentos leídos</div></div>
              <div className="rounded-lg border p-2"><div className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{res.nuevos}</div><div className="text-xs text-muted-foreground">eventos nuevos</div></div>
              <div className="rounded-lg border p-2"><div className="text-lg font-semibold tabular-nums">{res.yaRegistrados}</div><div className="text-xs text-muted-foreground">ya registrados</div></div>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(res.porTipo).map(([k, n]) => (
                  <tr key={k} className="border-t"><td className="py-1">{ETIQUETA[k] || k}</td><td className="py-1 text-right tabular-nums">{n}</td></tr>
                ))}
              </tbody>
            </table>
            {res.cambiadosEnOrigen.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                <strong>{res.cambiadosEnOrigen.length} documento(s) cambiaron en origen</strong> tras registrarse. No se sobrescriben; revísalos: {res.cambiadosEnOrigen.slice(0, 3).join("; ")}
              </div>
            )}
            {res.totalAnomalias > 0 && (
              <div className="space-y-1 rounded-md border px-3 py-2 text-sm">
                <div className="font-medium">{res.totalAnomalias} aviso(s)</div>
                {res.anomalias.slice(0, 8).map((a, i) => (
                  <div key={i} className="text-xs text-muted-foreground">{a.origen} — {a.motivo}</div>
                ))}
              </div>
            )}
            {Object.keys(res.noCubiertos).length > 0 && (
              <div className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-900 dark:text-sky-200">
                Todavía <strong>no se contabilizan</strong>: {Object.entries(res.noCubiertos).map(([k, n]) => `${NO_CUBIERTO[k] || k} (${n})`).join(", ")}.
              </div>
            )}
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox checked={confirma} onCheckedChange={(c) => setConfirma(!!c)} className="mt-0.5" />
              <span>Entiendo que se registrarán {res.nuevos} eventos y sus borradores contables. Los borradores se pueden revisar, editar o eliminar antes de contabilizar.</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={cargando}>Cerrar</Button>
              <Button onClick={registrar} disabled={cargando || !confirma || res.nuevos === 0}>{cargando ? "Trabajando…" : "Registrar y generar borradores"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
