"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Add, Trash } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiC, hoyISO, num, type Cuenta, type DetalleAsiento } from "@/lib/contabilidad";
import { CajaError } from "./_ui";

interface LineaForm {
  cuenta: string;
  debe: string;
  haber: string;
  concepto: string;
}

const aNumero = (s: string): number => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const vacia = (): LineaForm => ({ cuenta: "", debe: "", haber: "", concepto: "" });

/** Alta y edición de asientos manuales (borrador): apertura, ajustes, nóminas, etc. */
export function AsientoFormDialog({ abierto, editar, cuentas, onClose, onGuardado }: { abierto: boolean; editar: DetalleAsiento | null; cuentas: Cuenta[]; onClose: () => void; onGuardado: () => void }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [concepto, setConcepto] = useState("");
  const [tipo, setTipo] = useState("manual");
  const [lineas, setLineas] = useState<LineaForm[]>([vacia(), vacia()]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    if (editar) {
      setFecha(editar.asiento.fecha);
      setConcepto(editar.asiento.concepto);
      setTipo(editar.asiento.tipo);
      setLineas(editar.lineas.map((l) => ({ cuenta: l.cuenta_codigo, debe: l.debe ? String(l.debe) : "", haber: l.haber ? String(l.haber) : "", concepto: l.concepto })));
    } else {
      setFecha(hoyISO());
      setConcepto("");
      setTipo("manual");
      setLineas([vacia(), vacia()]);
    }
  }, [abierto, editar]);

  const imputables = useMemo(() => cuentas.filter((c) => c.imputable && c.activa), [cuentas]);
  const nombre = useMemo(() => new Map(cuentas.map((c) => [c.codigo, c.nombre])), [cuentas]);
  const debe = lineas.reduce((s, l) => s + aNumero(l.debe), 0);
  const haber = lineas.reduce((s, l) => s + aNumero(l.haber), 0);
  const cuadra = Math.abs(debe - haber) < 0.005 && debe > 0;

  const cambiar = (i: number, campo: keyof LineaForm, v: string) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: v } : l)));

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const cuerpo = {
        fecha,
        concepto,
        tipo,
        lineas: lineas
          .filter((l) => l.cuenta.trim() || l.debe || l.haber)
          .map((l) => ({ cuenta_codigo: l.cuenta.trim(), debe: aNumero(l.debe), haber: aNumero(l.haber), concepto: l.concepto })),
      };
      if (editar) await apiC(`asientos/${editar.asiento.id}`, { metodo: "PUT", cuerpo });
      else await apiC("asientos", { metodo: "POST", cuerpo });
      toast.success(editar ? "Borrador actualizado" : "Borrador creado");
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] sm:max-w-3xl overflow-y-auto">
        <DialogTitle>{editar ? "Editar borrador" : "Nuevo asiento manual"}</DialogTitle>
        <div className="grid gap-2 sm:grid-cols-[10rem_1fr_11rem]">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha" />
          <Input placeholder="Concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} maxLength={300} />
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de asiento">
            <option value="manual">Manual</option>
            <option value="apertura">Apertura</option>
            <option value="regularizacion">Regularización</option>
          </select>
        </div>

        <datalist id="cuentas-imputables">
          {imputables.map((c) => (
            <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
          ))}
        </datalist>

        <div className="space-y-1.5">
          <div className="hidden grid-cols-[9rem_1fr_7rem_7rem_2rem] gap-2 px-1 text-xs text-muted-foreground sm:grid">
            <span>Cuenta</span><span>Concepto</span><span className="text-right">Debe</span><span className="text-right">Haber</span><span />
          </div>
          {lineas.map((l, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[9rem_1fr_7rem_7rem_2rem]">
              <div className="col-span-2 sm:col-span-1">
                <Input list="cuentas-imputables" placeholder="Cuenta" value={l.cuenta} onChange={(e) => cambiar(i, "cuenta", e.target.value.trim())} className="tabular-nums" />
                <span className="block truncate text-[11px] text-muted-foreground">{nombre.get(l.cuenta) || (l.cuenta ? "Cuenta no encontrada" : "")}</span>
              </div>
              <Input className="col-span-2 sm:col-span-1" placeholder="Concepto de la línea" value={l.concepto} onChange={(e) => cambiar(i, "concepto", e.target.value)} />
              <Input inputMode="decimal" placeholder="0,00" className="text-right tabular-nums" value={l.debe} onChange={(e) => setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, debe: e.target.value, haber: e.target.value ? "" : x.haber } : x)))} />
              <Input inputMode="decimal" placeholder="0,00" className="text-right tabular-nums" value={l.haber} onChange={(e) => setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, haber: e.target.value, debe: e.target.value ? "" : x.debe } : x)))} />
              <Button variant="ghost" size="icon" className="size-8" title="Quitar línea" disabled={lineas.length <= 2} onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}>
                <Trash className="size-4" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setLineas((ls) => [...ls, vacia()])}>
            <Add className="size-4" /> Añadir línea
          </Button>
        </div>

        <div className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${cuadra ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
          <span>{cuadra ? "El asiento cuadra" : `Descuadre: ${num(Math.abs(debe - haber))}`}</span>
          <span className="tabular-nums">Debe {num(debe)} · Haber {num(haber)}</span>
        </div>

        <CajaError mensaje={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando || !concepto.trim()}>{guardando ? "Guardando…" : "Guardar borrador"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
