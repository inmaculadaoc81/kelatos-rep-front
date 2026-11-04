"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, fechaCorta, hoyISO, num } from "@/lib/contabilidad";
import { Kpi } from "../_ui";

interface RetiradaTransito {
  id: number | string;
  fecha_retirada: string;
  importe: number;
  motivo: string | null;
  banco_id: number | null;
  banco: string | null;
  ingresado: number;
  pendiente: number;
  modo: "transito" | "ya_contabilizado" | "sin_asiento";
  estado: "pendiente" | "parcial" | "ingresada";
  asiento_estado: string | null;
  sugeridos?: number[];
}
interface MovimientoBanco {
  id: number | string;
  banco_id: number;
  banco: string;
  fecha: string;
  importe: number;
  concepto: string;
  clase_sugerida: string | null;
  libre: number;
}
interface DatosTransito {
  retiradas: RetiradaTransito[];
  movimientos: MovimientoBanco[];
  bancos: { id: number; nombre: string }[];
  resumen: { pendiente_total: number; pendiente_conciliar_directos: number; saldo_5709_contabilizado: number; saldo_5709_en_borrador: number };
}

const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Efectivo en tránsito (cuenta 5709): lo retirado de la caja para ingresarlo en el banco, hasta que se confirma el ingreso. Cada confirmación puede ser
 * parcial o agrupada (varias retiradas en un mismo ingreso) y se vincula con el movimiento del extracto cuando lo hay.
 */
export function EfectivoTransito({ soloLectura, onCambio }: { soloLectura: boolean; onCambio: () => void }) {
  const [datos, setDatos] = useState<DatosTransito | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<number | string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await apiC<DatosTransito>("efectivo/transito"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!datos) return null;
  const pendientes = datos.retiradas.filter((r) => r.pendiente > 0);
  if (!pendientes.length && datos.resumen.saldo_5709_contabilizado === 0 && datos.resumen.saldo_5709_en_borrador === 0) return null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:max-w-3xl sm:grid-cols-4">
        <Kpi titulo="Efectivo en tránsito pendiente de ingresar" valor={eur(datos.resumen.pendiente_total)} color={datos.resumen.pendiente_total ? "text-amber-600 dark:text-amber-400" : ""} />
        <Kpi titulo="Saldo 5709 contabilizado" valor={eur(datos.resumen.saldo_5709_contabilizado)} color="" />
        <Kpi titulo="Saldo 5709 en borrador" valor={eur(datos.resumen.saldo_5709_en_borrador)} color="" />
        <Kpi titulo="Ya contabilizados, por conciliar" valor={eur(datos.resumen.pendiente_conciliar_directos)} color="" />
      </div>

      {pendientes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <p className="border-b px-3 py-2 text-sm font-semibold">Depósitos pendientes de conciliación (retirada de caja para ingreso en banco)</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Retirada</TableHead>
                <TableHead>Banco previsto</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-right">Ingresado</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Extracto</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendientes.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {fechaCorta(r.fecha_retirada)} <span className="text-xs text-muted-foreground">· EF-{String(r.id)}</span>
                  </TableCell>
                  <TableCell>{r.banco || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(r.importe)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(r.ingresado)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{num(r.pendiente)}</TableCell>
                  <TableCell className="text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${r.estado === "parcial" ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                      {r.estado === "parcial" ? "Ingreso parcial" : "Pendiente de ingreso"}
                    </span>
                    <span className="ml-1 text-muted-foreground">
                      {r.modo === "ya_contabilizado" ? "· ya contabilizado como 572/570, solo conciliar" : r.modo === "sin_asiento" ? "· sin asiento en tránsito (sincroniza)" : r.asiento_estado === "BORRADOR" ? "· 5709 en borrador" : "· en 5709"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.sugeridos && r.sugeridos.length ? `${r.sugeridos.length} movimiento(s) posible(s)` : "sin coincidencia"}</TableCell>
                  <TableCell>
                    {!soloLectura && r.modo !== "sin_asiento" && (
                      <Button size="sm" variant="outline" className="h-7" onClick={() => setDialogo(r.id)}>
                        Confirmar ingreso
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {dialogo !== null && (
        <ConfirmarIngresoDialog
          datos={datos}
          inicial={dialogo}
          onClose={() => setDialogo(null)}
          onHecho={async () => {
            setDialogo(null);
            await cargar();
            onCambio();
          }}
        />
      )}
    </div>
  );
}

function ConfirmarIngresoDialog({ datos, inicial, onClose, onHecho }: { datos: DatosTransito; inicial: number | string; onClose: () => void; onHecho: () => Promise<void> }) {
  const pendientes = useMemo(() => datos.retiradas.filter((r) => r.pendiente > 0 && r.modo !== "sin_asiento"), [datos.retiradas]);
  const [elegidas, setElegidas] = useState<Record<string, string>>(() => {
    const r = pendientes.find((x) => String(x.id) === String(inicial));
    return r ? { [String(r.id)]: String(r.pendiente) } : {};
  });
  const [movimientoId, setMovimientoId] = useState("");
  const [bancoId, setBancoId] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);

  const mov = datos.movimientos.find((m) => String(m.id) === movimientoId) || null;
  const total = redondear(Object.values(elegidas).reduce((s, v) => s + (Number(v) || 0), 0));
  const diferencia = mov ? redondear(mov.libre - total) : null;

  function elegirMovimiento(id: string) {
    setMovimientoId(id);
    const m = datos.movimientos.find((x) => String(x.id) === id);
    if (m) {
      setFecha(m.fecha);
      setBancoId(String(m.banco_id));
    }
  }

  function alternar(r: RetiradaTransito) {
    setElegidas((prev) => {
      const k = String(r.id);
      const sig = { ...prev };
      if (k in sig) delete sig[k];
      else sig[k] = String(r.pendiente);
      return sig;
    });
  }

  async function confirmar() {
    const partes = Object.entries(elegidas).map(([id, imp]) => ({ efectivo_id: Number(id), importe: Number(imp) }));
    if (!partes.length) return toast.error("Elige al menos una retirada");
    if (partes.some((p) => !(p.importe > 0))) return toast.error("Cada importe debe ser mayor que 0");
    if (!movimientoId && !bancoId) return toast.error("Elige el movimiento del extracto o, si no lo hay, el banco");
    if (!fecha) return toast.error("Indica la fecha real del ingreso");
    setEnviando(true);
    try {
      const r = await apiC<{ asientos: number[]; errores: string[]; movimiento_conciliado: boolean; diferencia_pendiente_en_movimiento: number | null }>("efectivo/transito/confirmar", {
        metodo: "POST",
        cuerpo: { fecha, banco_id: bancoId ? Number(bancoId) : undefined, movimiento_id: movimientoId ? Number(movimientoId) : undefined, partes, nota: nota.trim() || undefined },
      });
      if (r.errores?.length) toast.warning(`Ingreso confirmado, pero un asiento no se pudo generar: ${r.errores[0]}`);
      else toast.success(r.asientos.length ? `Ingreso confirmado: ${r.asientos.length} asiento(s) en borrador (572 / 5709)` : "Ingreso conciliado (ya estaba contabilizado)");
      if (r.diferencia_pendiente_en_movimiento && Number(r.diferencia_pendiente_en_movimiento) > 0) toast.info(`Quedan ${eur(Number(r.diferencia_pendiente_en_movimiento))} del movimiento sin repartir`);
      await onHecho();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !enviando && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirmar ingreso en el banco</DialogTitle>
          <DialogDescription>
            Cierra la 5709: Debe banco (572) / Haber efectivo en tránsito (5709). Puede ser un ingreso parcial o agrupar varias retiradas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Retiradas incluidas en este ingreso</p>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
              {pendientes.map((r) => {
                const k = String(r.id);
                const marcada = k in elegidas;
                return (
                  <label key={k} className="flex items-center gap-2">
                    <input type="checkbox" checked={marcada} onChange={() => alternar(r)} />
                    <span className="flex-1">
                      {fechaCorta(r.fecha_retirada)} · EF-{k} · {r.banco || "sin banco"} · pendiente {num(r.pendiente)} €
                    </span>
                    {marcada && (
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={r.pendiente}
                        className="h-7 w-28 text-right"
                        value={elegidas[k]}
                        onChange={(e) => setElegidas((prev) => ({ ...prev, [k]: e.target.value }))}
                        aria-label={`Importe ingresado de EF-${k}`}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Movimiento del extracto bancario</p>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={movimientoId} onChange={(e) => elegirMovimiento(e.target.value)} aria-label="Movimiento del extracto">
                <option value="">— Sin extracto (confirmación manual) —</option>
                {datos.movimientos.map((m) => (
                  <option key={String(m.id)} value={String(m.id)}>
                    {fechaCorta(m.fecha)} · {m.banco} · {num(m.libre)} € · {m.concepto.slice(0, 40)}
                    {m.clase_sugerida === "ingreso_efectivo" ? " · parece ingreso de efectivo" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Banco {movimientoId ? "(el del extracto)" : "*"}</p>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={bancoId}
                disabled={!!movimientoId}
                onChange={(e) => setBancoId(e.target.value)}
                aria-label="Banco del ingreso"
              >
                <option value="">— Selecciona el banco —</option>
                {datos.bancos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Fecha real del ingreso *</p>
              <Input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Nota (opcional)</p>
              <Input value={nota} maxLength={300} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: ingreso en cajero" />
            </div>
          </div>

          <p className={`text-xs font-medium ${mov && diferencia !== null && diferencia < 0 ? "text-red-600" : "text-muted-foreground"}`}>
            Total a confirmar: {num(total)} €
            {mov && diferencia !== null && (diferencia < 0 ? ` · supera en ${num(-diferencia)} € lo libre del movimiento (${num(mov.libre)} €)` : diferencia > 0 ? ` · quedarán ${num(diferencia)} € del movimiento sin repartir` : " · coincide con el movimiento")}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={enviando} onClick={confirmar}>
            {enviando ? "Confirmando…" : "Confirmar ingreso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
