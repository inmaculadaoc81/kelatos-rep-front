"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Refresh2, MoneySend } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, fechaCorta, hoyISO, num } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga, InfoVista, Kpi, usePlan } from "../_ui";

interface Pago { id: number; importe: number; medio: string; banco: string | null; fecha: string; movimiento_id: number | null; nota: string | null }
interface Devolucion {
  id: number; origen_tipo: string; origen_id: string; numero: string; cliente: string | null; fecha: string; importe: number;
  medio_sugerido: string | null; banco_sugerido: string | null; estado: "pendiente" | "parcial" | "realizada" | "conciliada" | "anulada";
  supuesta: boolean; notas: string | null; devuelto: number; pagos: Pago[];
}
interface Movimiento { id: number; banco: string; fecha: string; importe: number; concepto: string }

const ESTADOS: { v: Devolucion["estado"]; t: string; c: string }[] = [
  { v: "pendiente", t: "Pendiente", c: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { v: "parcial", t: "Parcial", c: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  { v: "realizada", t: "Realizada", c: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  { v: "conciliada", t: "Conciliada", c: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  { v: "anulada", t: "Anulada", c: "bg-muted text-muted-foreground" },
];
const MEDIOS = [
  { v: "efectivo", t: "Efectivo (caja)" },
  { v: "transferencia", t: "Transferencia bancaria" },
  { v: "tarjeta", t: "Tarjeta (TPV físico)" },
  { v: "tarjeta_virtual", t: "Tarjeta virtual (pasarela web)" },
  { v: "bizum", t: "Bizum" },
];
const etiquetaMedio = (m: string | null) => MEDIOS.find((x) => x.v === m)?.t.replace(/ \(.*\)/, "") || m || "—";

export default function DevolucionesPage() {
  const plan = usePlan();
  const [filas, setFilas] = useState<Devolucion[]>([]);
  const [porEstado, setPorEstado] = useState<Record<string, { n: number; importe: number }>>({});
  const [estado, setEstado] = useState<"" | Devolucion["estado"]>("pendiente");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<Devolucion | null>(null);
  const [anular, setAnular] = useState<Devolucion | null>(null);
  const [conciliar, setConciliar] = useState<{ d: Devolucion; pago: Pago } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = await apiC<{ devoluciones: Devolucion[]; porEstado: Record<string, { n: number; importe: number }> }>("devoluciones", { query: { estado, q: busqueda.trim(), limit: 200 } });
      setFilas(d.devoluciones);
      setPorEstado(d.porEstado);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [estado, busqueda]);
  useEffect(() => { cargar(); }, [cargar]);

  const kpi = (e: Devolucion["estado"], titulo: string, color: string) => (
    <Kpi titulo={`${titulo} · ${eur(porEstado[e]?.importe ?? 0)}`} valor={String(porEstado[e]?.n ?? 0)} color={color} activo={estado === e} onClick={() => setEstado(estado === e ? "" : e)} />
  );

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<MoneySend className="size-4.5" />}
        titulo="Devoluciones de dinero"
        descripcion="La rectificativa corrige la venta; aquí se confirma cuándo y cómo se devolvió el dinero"
        acciones={<Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar"><Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /></Button>}
      />
      <InfoVista>
        Una factura rectificativa no significa que el dinero ya se haya devuelto. Cada rectificativa de una factura cobrada aparece aquí como <strong>pendiente</strong>. Al confirmar la devolución (medio, banco y fecha reales) se genera el asiento de salida:
        el cliente (430) contra caja, banco o la cuenta transitoria del TPV o de la pasarela. Ejemplo: se rectifica una factura de 121 € y se devuelven 40 € en efectivo hoy y 81 € por transferencia mañana → dos confirmaciones.
        Las marcadas como «supuesta» se generaron automáticamente antes de existir esta pantalla, suponiendo el mismo medio del cobro: revísalas.
      </InfoVista>
      <CajaError mensaje={error || plan.error} />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {kpi("pendiente", "Pendientes", "text-amber-600 dark:text-amber-400")}
        {kpi("parcial", "Parciales", "text-orange-600 dark:text-orange-400")}
        {kpi("realizada", "Realizadas", "text-sky-600 dark:text-sky-400")}
        {kpi("conciliada", "Conciliadas", "text-emerald-600 dark:text-emerald-400")}
        {kpi("anulada", "Anuladas", "text-muted-foreground")}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="h-8 w-64" placeholder="Buscar por nº de rectificativa o cliente…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        {estado && <Button variant="ghost" size="sm" className="h-8" onClick={() => setEstado("")}>Ver todas</Button>}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead><TableHead>Rectificativa</TableHead><TableHead>Cliente</TableHead>
              <TableHead className="text-right">A devolver</TableHead><TableHead className="text-right">Devuelto</TableHead><TableHead>Salidas de dinero</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && <FilasCarga columnas={8} />}
            {!cargando && filas.length === 0 && <FilaVacia columnas={8} texto="No hay devoluciones con este filtro. Aparecen al sincronizar las operaciones cuando una factura cobrada se rectifica." />}
            {!cargando && filas.map((f) => {
              const e = ESTADOS.find((x) => x.v === f.estado)!;
              const falta = f.importe - f.devuelto;
              return (
                <TableRow key={f.id}>
                  <TableCell className="tabular-nums">{fechaCorta(f.fecha)}</TableCell>
                  <TableCell className="font-medium">{f.numero || "—"}<div className="text-xs font-normal text-muted-foreground">{f.origen_tipo} · {f.origen_id.split(":")[0]}</div></TableCell>
                  <TableCell className="max-w-48 truncate">{f.cliente || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(f.importe)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(f.devuelto)}</TableCell>
                  <TableCell className="text-xs">
                    {f.pagos.length === 0 && <span className="text-muted-foreground">Sugerido: {etiquetaMedio(f.medio_sugerido)}{f.banco_sugerido ? ` · ${f.banco_sugerido}` : ""}</span>}
                    {f.pagos.map((p) => (
                      <div key={p.id} className="flex items-center gap-1">
                        <span>{fechaCorta(p.fecha)} · {num(p.importe)} € · {etiquetaMedio(p.medio)}{p.banco ? ` ${p.banco}` : ""}</span>
                        {p.movimiento_id ? <span className="text-emerald-600">✓ banco</span> : p.medio !== "efectivo" && f.estado !== "anulada" && !f.supuesta ? (
                          <button type="button" className="text-primary hover:underline" onClick={() => setConciliar({ d: f, pago: p })}>conciliar</button>
                        ) : null}
                      </div>
                    ))}
                    {f.supuesta && <div className="text-amber-600">Supuesta: confirmar con el medio real</div>}
                  </TableCell>
                  <TableCell><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${e.c}`}>{e.t}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {(f.estado === "pendiente" || f.estado === "parcial") && <Button size="sm" className="h-7" onClick={() => setConfirmar(f)}>Confirmar devolución{f.estado === "parcial" ? ` (${num(falta)} €)` : ""}</Button>}
                      {f.estado === "pendiente" && <Button size="sm" variant="ghost" className="h-7" onClick={() => setAnular(f)}>No se devuelve</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {confirmar && <ConfirmarDialog d={confirmar} bancos={plan.bancos.filter((b) => b.activa).map((b) => b.nombre)} onClose={() => setConfirmar(null)} onHecho={() => { setConfirmar(null); void cargar(); }} />}
      {anular && <AnularDialog d={anular} onClose={() => setAnular(null)} onHecho={() => { setAnular(null); void cargar(); }} />}
      {conciliar && <ConciliarDialog datos={conciliar} onClose={() => setConciliar(null)} onHecho={() => { setConciliar(null); void cargar(); }} />}
    </div>
  );
}

function ConfirmarDialog({ d, bancos, onClose, onHecho }: { d: Devolucion; bancos: string[]; onClose: () => void; onHecho: () => void }) {
  const falta = Math.round((d.importe - d.devuelto) * 100) / 100;
  const [medio, setMedio] = useState(d.medio_sugerido && MEDIOS.some((m) => m.v === d.medio_sugerido) ? d.medio_sugerido : "efectivo");
  const [banco, setBanco] = useState(d.banco_sugerido && bancos.includes(d.banco_sugerido) ? d.banco_sugerido : "");
  const [importe, setImporte] = useState(String(falta));
  const [fecha, setFecha] = useState(hoyISO());
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const necesitaBanco = medio === "transferencia" || medio === "tarjeta";

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const r = await apiC<{ asiento_id: number | null; estado: string }>(`devoluciones/${d.id}/confirmar`, { metodo: "POST", cuerpo: { medio, banco: necesitaBanco ? banco : "", importe: Number(importe.replace(",", ".")), fecha, nota } });
      toast.success(`Devolución registrada${r.asiento_id ? ` (borrador #${r.asiento_id})` : ""}`);
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
        <DialogHeader><DialogTitle>Confirmar devolución · {d.numero} · {d.cliente || ""}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Quedan por devolver <strong>{eur(falta)}</strong>. Registra la salida real de dinero; el asiento se genera como borrador.</p>
        <CajaError mensaje={error} />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm">Medio de la devolución
            <select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={medio} onChange={(e) => setMedio(e.target.value)}>
              {MEDIOS.map((m) => <option key={m.v} value={m.v}>{m.t}</option>)}
            </select>
          </label>
          {necesitaBanco && (
            <label className="text-sm">Banco
              <select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={banco} onChange={(e) => setBanco(e.target.value)}>
                <option value="">Elegir…</option>
                {bancos.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
          )}
          <label className="text-sm">Importe devuelto (€)
            <Input className="mt-1" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} />
          </label>
          <label className="text-sm">Fecha en que salió el dinero
            <Input className="mt-1" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
        </div>
        <label className="text-sm">Nota (opcional)
          <Input className="mt-1" value={nota} onChange={(e) => setNota(e.target.value)} />
        </label>
        {medio === "tarjeta_virtual" && <p className="text-xs text-muted-foreground">Va a la cuenta transitoria de la pasarela web (44000001) si está activada; si no, a la 555.</p>}
        {medio === "tarjeta" && <p className="text-xs text-muted-foreground">Si el TPV está activado, la devolución se carga a la cuenta transitoria del TPV de ese banco; si no, directamente al banco.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={guardando || (necesitaBanco && !banco)} onClick={guardar}>{guardando ? "Registrando…" : "Registrar devolución"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnularDialog({ d, onClose, onHecho }: { d: Devolucion; onClose: () => void; onHecho: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function guardar() {
    try {
      await apiC(`devoluciones/${d.id}/anular`, { metodo: "POST", cuerpo: { motivo } });
      onHecho();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }
  return (
    <Dialog open onOpenChange={(a) => { if (!a) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>No se devuelve · {d.numero}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Úsalo cuando la rectificativa no implica devolver dinero (por ejemplo, el importe se compensó con otra factura). El saldo del cliente (430) queda a su favor.</p>
        <CajaError mensaje={error} />
        <label className="text-sm">Motivo<Input className="mt-1" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!motivo.trim()} onClick={guardar}>Marcar como no devuelta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConciliarDialog({ datos, onClose, onHecho }: { datos: { d: Devolucion; pago: Pago }; onClose: () => void; onHecho: () => void }) {
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [sel, setSel] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    apiC<{ movimientos: Movimiento[] }>("tpv/movimientos", { query: { signo: "cargos", estado: "pendiente", limit: 200 } })
      .then((r) => setMovs(r.movimientos.filter((m) => Math.abs(Math.abs(m.importe) - datos.pago.importe) < 0.005)))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [datos.pago.importe]);
  async function guardar() {
    try {
      await apiC(`devoluciones/${datos.d.id}/pagos/${datos.pago.id}/conciliar`, { metodo: "POST", cuerpo: { movimiento_id: Number(sel) } });
      toast.success("Devolución conciliada con el banco");
      onHecho();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }
  return (
    <Dialog open onOpenChange={(a) => { if (!a) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Conciliar con el banco · {num(datos.pago.importe)} €</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Elige el cargo del extracto bancario que corresponde a esta devolución (mismo importe). No se crea otro asiento: se enlaza con el que ya existe.</p>
        <CajaError mensaje={error} />
        {movs.length === 0 ? (
          <p className="text-sm">No hay cargos pendientes de ese importe. Importa antes el extracto en <em>Conciliación TPV</em>.</p>
        ) : (
          <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">Elegir movimiento…</option>
            {movs.map((m) => <option key={m.id} value={m.id}>{fechaCorta(m.fecha)} · {m.banco} · {num(m.importe)} · {m.concepto.slice(0, 50)}</option>)}
          </select>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!sel} onClick={guardar}>Conciliar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
