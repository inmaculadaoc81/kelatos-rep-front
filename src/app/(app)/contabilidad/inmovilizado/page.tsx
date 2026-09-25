"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Add, Box, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, fechaCorta, hoyISO, MESES, num } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga, Kpi, usePlan } from "../_ui";
import { AsientoDialog } from "../asiento-dialog";

interface Activo {
  id: number;
  codigo: string;
  nombre: string;
  cuenta_activo: string;
  fecha_alta: string;
  amortizar_desde: string;
  coste: number;
  valor_residual: number;
  vida_util_meses: number;
  estado: "activo" | "baja";
  fecha_baja: string | null;
  motivo_baja: string | null;
  amortizado: number;
  valor_neto: number;
  cuota_mensual: number;
  completo: boolean;
}
interface MesAmort {
  mes: number;
  estado: "generado" | "pendiente" | "futuro" | "sin_cuotas";
  asiento_id?: number;
  numero?: string | null;
  estado_asiento?: string;
  activos: number;
  total: number;
}

/** Bienes de la empresa (equipos, mobiliario, software) y su amortización mensual lineal. */
export default function InmovilizadoPage() {
  const plan = usePlan();
  const [activos, setActivos] = useState<Activo[]>([]);
  const [totales, setTotales] = useState({ coste: 0, amortizado: 0, valor_neto: 0 });
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [meses, setMeses] = useState<MesAmort[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [baja, setBaja] = useState<Activo | null>(null);
  const [generando, setGenerando] = useState<number | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [a, m] = await Promise.all([apiC<{ activos: Activo[]; totales: typeof totales }>("activos"), apiC<{ meses: MesAmort[] }>("amortizacion", { query: { anio } })]);
      setActivos(a.activos);
      setTotales(a.totales);
      setMeses(m.meses);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [anio]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function generar(mes: number) {
    setGenerando(mes);
    try {
      const r = await apiC<{ activos: number; total: number }>("amortizacion/generar", { metodo: "POST", cuerpo: { anio, mes } });
      toast.success(`Borrador creado: ${r.activos} activo(s), ${num(r.total)} €`);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setGenerando(null);
    }
  }

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<Box className="size-4.5" />}
        titulo="Inmovilizado y amortización"
        descripcion="Registra los bienes de la empresa; la amortización se genera cada mes como un borrador que tú revisas y contabilizas"
        acciones={
          <>
            <Button size="sm" className="gap-1.5" onClick={() => setNuevo(true)}><Add className="size-4" /> Nuevo activo</Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar"><Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /></Button>
          </>
        }
      />
      <CajaError mensaje={error || plan.error} />
      <div className="grid grid-cols-3 gap-2 sm:max-w-2xl">
        <Kpi titulo="Coste de los activos" valor={eur(totales.coste)} color="" />
        <Kpi titulo="Amortizado" valor={eur(totales.amortizado)} color="" />
        <Kpi titulo="Valor neto" valor={eur(totales.valor_neto)} color="text-emerald-600 dark:text-emerald-400" />
      </div>

      <Tabs defaultValue="activos">
        <TabsList>
          <TabsTrigger value="activos">Activos ({activos.length})</TabsTrigger>
          <TabsTrigger value="amortizacion">Amortización mensual</TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="pt-3">
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activo</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead className="text-right">Coste</TableHead>
                  <TableHead className="text-right">Cuota/mes</TableHead>
                  <TableHead className="text-right">Amortizado</TableHead>
                  <TableHead className="text-right">Valor neto</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando && !activos.length && <FilasCarga columnas={8} />}
                {!cargando && activos.length === 0 && <FilaVacia columnas={8} texto="Todavía no hay activos. Añade los equipos de alquiler y demás bienes con los datos de la gestoría." />}
                {activos.map((a) => (
                  <TableRow key={a.id} className={a.estado === "baja" ? "opacity-60" : undefined}>
                    <TableCell>
                      <div className="font-medium">{a.nombre}</div>
                      <div className="text-xs text-muted-foreground">{a.codigo} · {a.vida_util_meses} meses{a.estado === "baja" ? ` · baja ${fechaCorta(a.fecha_baja)}` : a.completo ? " · totalmente amortizado" : ""}</div>
                    </TableCell>
                    <TableCell className="tabular-nums">{a.cuenta_activo}</TableCell>
                    <TableCell className="tabular-nums">{fechaCorta(a.fecha_alta)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(a.coste)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(a.cuota_mensual)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(a.amortizado)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{num(a.valor_neto)}</TableCell>
                    <TableCell className="text-right">{a.estado === "activo" && <Button size="sm" variant="ghost" className="h-7" onClick={() => setBaja(a)}>Dar de baja</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="amortizacion" className="space-y-3 pt-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAnio((a) => a - 1)}>‹</Button>
            <span className="w-16 text-center text-sm font-semibold tabular-nums">{anio}</span>
            <Button variant="outline" size="sm" onClick={() => setAnio((a) => a + 1)}>›</Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {meses.map((m) => (
              <div key={m.mes} className="flex flex-col gap-1 rounded-lg border bg-card p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{MESES[m.mes - 1]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.estado === "generado" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : m.estado === "pendiente" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300"}`}>
                    {m.estado === "generado" ? "Generado" : m.estado === "pendiente" ? "Pendiente" : m.estado === "futuro" ? "Aún no acaba" : "Sin cuotas"}
                  </span>
                </div>
                {m.estado === "generado" ? (
                  <button type="button" className="text-left text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setDetalleId(m.asiento_id!)}>
                    {m.numero || `Borrador #${m.asiento_id}`} · {num(m.total)} € · {m.activos} activo(s)
                  </button>
                ) : (
                  <div className="text-xs text-muted-foreground">{m.activos ? `${m.activos} activo(s) · ${num(m.total)} €` : "—"}</div>
                )}
                {m.estado === "pendiente" && (
                  <Button size="sm" variant="outline" className="mt-1 h-7" disabled={generando === m.mes} onClick={() => generar(m.mes)}>
                    {generando === m.mes ? "Generando…" : "Generar amortización"}
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Los meses se generan en orden. El asiento queda en borrador: si te equivocas, elimínalo y se libera el mes.</p>
        </TabsContent>
      </Tabs>

      <ActivoDialog abierto={nuevo} cuentas={plan.cuentas.filter((c) => /^2[0-7]/.test(c.codigo) && c.imputable && c.activa)} onClose={() => setNuevo(false)} onGuardado={() => { setNuevo(false); cargar(); }} />
      <BajaDialog activo={baja} onClose={() => setBaja(null)} onGuardado={() => { setBaja(null); cargar(); }} />
      <AsientoDialog id={detalleId} onClose={() => setDetalleId(null)} onCambio={cargar} onEditar={() => setDetalleId(null)} />
    </div>
  );
}

function ActivoDialog({ abierto, cuentas, onClose, onGuardado }: { abierto: boolean; cuentas: { codigo: string; nombre: string }[]; onClose: () => void; onGuardado: () => void }) {
  const vacio = { codigo: "", nombre: "", cuenta_activo: "217", fecha_alta: hoyISO(), coste: "", vida_util_meses: "60", valor_residual: "0", amortizado_previo: "0", amortizar_desde: "", notas: "" };
  const [f, setF] = useState(vacio);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const poner = (k: keyof typeof vacio, v: string) => setF((p) => ({ ...p, [k]: v }));
  const n = (s: string) => Number(String(s).replace(",", "."));

  async function guardar() {
    setEnviando(true);
    setError(null);
    try {
      await apiC("activos", {
        metodo: "POST",
        cuerpo: { codigo: f.codigo, nombre: f.nombre, cuenta_activo: f.cuenta_activo, fecha_alta: f.fecha_alta, coste: n(f.coste), vida_util_meses: n(f.vida_util_meses), valor_residual: n(f.valor_residual), amortizado_previo: n(f.amortizado_previo), amortizar_desde: f.amortizar_desde || undefined, notas: f.notas || undefined },
      });
      toast.success("Activo creado");
      setF({ ...vacio, fecha_alta: hoyISO() });
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !enviando && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>Nuevo activo</DialogTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Código (p. ej. EQ-001)" value={f.codigo} onChange={(e) => poner("codigo", e.target.value)} />
          <Input placeholder="Nombre" value={f.nombre} onChange={(e) => poner("nombre", e.target.value)} />
          <select className="h-9 rounded-md border bg-background px-2 text-sm sm:col-span-2" value={f.cuenta_activo} onChange={(e) => poner("cuenta_activo", e.target.value)} aria-label="Cuenta del activo">
            {cuentas.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
          </select>
          <label className="space-y-1 text-xs text-muted-foreground">Fecha de alta<Input type="date" value={f.fecha_alta} onChange={(e) => poner("fecha_alta", e.target.value)} /></label>
          <label className="space-y-1 text-xs text-muted-foreground">Amortizar desde (opcional)<Input type="date" value={f.amortizar_desde} onChange={(e) => poner("amortizar_desde", e.target.value)} /></label>
          <label className="space-y-1 text-xs text-muted-foreground">Coste (sin IVA)<Input inputMode="decimal" className="tabular-nums" value={f.coste} onChange={(e) => poner("coste", e.target.value)} /></label>
          <label className="space-y-1 text-xs text-muted-foreground">Vida útil (meses)<Input inputMode="numeric" className="tabular-nums" value={f.vida_util_meses} onChange={(e) => poner("vida_util_meses", e.target.value)} /></label>
          <label className="space-y-1 text-xs text-muted-foreground">Valor residual<Input inputMode="decimal" className="tabular-nums" value={f.valor_residual} onChange={(e) => poner("valor_residual", e.target.value)} /></label>
          <label className="space-y-1 text-xs text-muted-foreground">Ya amortizado antes<Input inputMode="decimal" className="tabular-nums" value={f.amortizado_previo} onChange={(e) => poner("amortizado_previo", e.target.value)} /></label>
          <Input className="sm:col-span-2" placeholder="Notas (opcional)" value={f.notas} onChange={(e) => poner("notas", e.target.value)} maxLength={500} />
        </div>
        <p className="text-xs text-muted-foreground">Si el bien ya venía en el balance de la gestoría, indica lo ya amortizado y pon «Amortizar desde» el 01/09/2026 (inicio de la contabilidad). Por defecto se empieza el mes siguiente al alta.</p>
        <CajaError mensaje={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button onClick={guardar} disabled={enviando || !f.codigo.trim() || !f.nombre.trim() || !f.coste}>{enviando ? "Guardando…" : "Crear activo"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BajaDialog({ activo, onClose, onGuardado }: { activo: Activo | null; onClose: () => void; onGuardado: () => void }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function guardar() {
    setEnviando(true);
    setError(null);
    try {
      const r = await apiC<{ aviso: string }>(`activos/${activo!.id}/baja`, { metodo: "POST", cuerpo: { fecha, motivo } });
      toast.success(r.aviso);
      setMotivo("");
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Dialog open={!!activo} onOpenChange={(o) => !o && !enviando && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Dar de baja {activo?.nombre}</DialogTitle>
        <p className="text-sm text-muted-foreground">Deja de amortizarse a partir del mes siguiente. El asiento de la baja (venta o pérdida del bien) se hace aparte, como asiento manual.</p>
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha de baja" />
        <Input placeholder="Motivo (obligatorio)" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} />
        <CajaError mensaje={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button onClick={guardar} disabled={enviando || !motivo.trim()}>Dar de baja</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
