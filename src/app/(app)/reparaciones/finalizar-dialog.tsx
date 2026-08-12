"use client";

import { useState } from "react";
import { TickCircle, CloseCircle, BoxTick, Cd, Notification } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { DatosFinalizarReparacion, ResultadoReparacion } from "@/lib/reparacion-finalizar";

const TECNICOS_FINALIZAR = ["Iván", "Romer", "Daniela", "Repuesto"];

function tienePieza(detalle: ReparacionDetalle): boolean {
  const pptoAceptado = detalle.presupuestos.find((p) => p.estado === "aceptado") || detalle.presupuestos[0];
  return (pptoAceptado?.costoPiezas ?? 0) > 0 || detalle.pedidos.length > 0;
}

interface Borrador {
  resultado: ResultadoReparacion | "";
  tecnico: string;
  fecha: string;
  observaciones: string;
  motivoSinReparacion: string;
  piezaOk: boolean;
  piezaNoResuelve: boolean;
  codigoDevolucion: string;
  delayHoras: number;
  delayMinutos: number;
  pesoValor: string;
  pesoUnidad: "GB" | "MB";
}

function borradorVacio(): Borrador {
  return {
    resultado: "",
    tecnico: "",
    fecha: new Date().toISOString().slice(0, 10),
    observaciones: "",
    motivoSinReparacion: "",
    piezaOk: false,
    piezaNoResuelve: false,
    codigoDevolucion: "",
    delayHoras: 0,
    delayMinutos: 0,
    pesoValor: "",
    pesoUnidad: "GB",
  };
}

function resumenDelay(horas: number, minutos: number): string {
  const totalMin = horas * 60 + Math.min(minutos, 59);
  if (totalMin === 0) return "Envío inmediato";
  let txt = "En ";
  if (horas > 0) txt += `${horas}h `;
  if (Math.min(minutos, 59) > 0) txt += `${Math.min(minutos, 59)}min`;
  return txt.trim();
}

export function FinalizarReparacionDialog({
  detalle,
  open,
  onOpenChange,
  onFinalizada,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinalizada: () => void;
}) {
  const [datos, setDatos] = useState<Borrador>(borradorVacio());
  const [enviando, setEnviando] = useState(false);
  const conPieza = tienePieza(detalle);
  // Reproduce la detección de esCintas en toggleOpcionesFinalizarReparacion():
  // (reparacionActual?.equipo?.modelo || '').toUpperCase().includes('CINTAS').
  const esCintas = (detalle.equipo.modelo || "").toUpperCase().includes("CINTAS");
  const esReparado = datos.resultado === "reparado";
  const esNoReparado = datos.resultado === "no_reparado";

  function actualizar<K extends keyof Borrador>(campo: K, valor: Borrador[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  // Reproduce toggleOpcionesFinalizarReparacion(): al elegir un resultado se
  // marca por defecto la casilla de pieza correspondiente (el original la
  // pre-marca automáticamente, no arranca desmarcada) y se limpian los
  // campos de la rama contraria.
  function elegirResultado(v: ResultadoReparacion) {
    setDatos((prev) => ({
      ...prev,
      resultado: v,
      motivoSinReparacion: v === "reparado" ? "" : prev.motivoSinReparacion,
      piezaOk: v === "reparado" ? true : prev.piezaOk,
      piezaNoResuelve: v === "no_reparado" ? true : prev.piezaNoResuelve,
      codigoDevolucion: v === "no_reparado" ? prev.codigoDevolucion : "",
      delayHoras: v === "reparado" ? prev.delayHoras : 0,
      delayMinutos: v === "reparado" ? prev.delayMinutos : 0,
      pesoValor: v === "reparado" ? prev.pesoValor : "",
    }));
  }

  async function guardar() {
    if (!datos.resultado) return toast.error("Debe seleccionar el resultado de la reparación");
    if (!datos.tecnico.trim()) return toast.error("El técnico es obligatorio");
    if (esNoReparado && !datos.motivoSinReparacion.trim()) {
      return toast.error("El motivo por el que no tiene reparación es obligatorio");
    }
    if (conPieza) {
      if (esReparado && !datos.piezaOk) return toast.error("Confirma el estado de la pieza");
      if (esNoReparado) {
        if (!datos.piezaNoResuelve) return toast.error("Marca la casilla sobre el estado de la pieza");
        if (!datos.codigoDevolucion.trim()) return toast.error("El código de devolución es obligatorio");
      }
    }

    const payload: DatosFinalizarReparacion = {
      resultado: datos.resultado,
      tecnico: datos.tecnico,
      fecha: datos.fecha,
      observaciones: datos.observaciones,
      motivoSinReparacion: datos.motivoSinReparacion,
      piezaOk: datos.piezaOk,
      piezaNoResuelve: datos.piezaNoResuelve,
      codigoDevolucion: datos.codigoDevolucion,
      minutosNotificacion: esReparado ? datos.delayHoras * 60 + Math.min(datos.delayMinutos, 59) : 0,
      pesoArchivo: esReparado && esCintas && datos.pesoValor ? `${datos.pesoValor} ${datos.pesoUnidad}` : "",
    };

    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Reparación finalizada: ${esReparado ? "Reparado" : "No tiene Reparación"}`);
      setDatos(borradorVacio());
      onOpenChange(false);
      onFinalizada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-emerald-600 px-4 py-3 text-white">
          <TickCircle className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-white">Finalizar Reparación</DialogTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto text-white hover:bg-white/15 hover:text-white"
            onClick={() => !enviando && onOpenChange(false)}
          >
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label>¿Cómo terminó la reparación? *</Label>
            <RadioGroup value={datos.resultado} onValueChange={(v) => elegirResultado(v as ResultadoReparacion)} className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="reparado" /> ✅ Reparado
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="no_reparado" /> ❌ No tiene Reparación
              </label>
            </RadioGroup>
          </div>

          {conPieza && esReparado && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={datos.piezaOk} onCheckedChange={(v) => actualizar("piezaOk", v === true)} />
              Pieza OK (funcionó correctamente) *
            </label>
          )}

          {esReparado && esCintas && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Cd className="size-4 text-primary" /> Peso de la digitalización
              </Label>
              <div className="flex max-w-56 gap-1.5">
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="Ej: 45.2"
                  value={datos.pesoValor}
                  onChange={(e) => actualizar("pesoValor", e.target.value)}
                />
                <Select value={datos.pesoUnidad} onValueChange={(v) => actualizar("pesoUnidad", (v || "GB") as "GB" | "MB")}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GB">GB</SelectItem>
                    <SelectItem value="MB">MB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">Se incluirá en el email al cliente indicando qué capacidad de pendrive necesita.</p>
            </div>
          )}

          {esReparado && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Notification className="size-4 text-primary" /> ¿Cuándo notificar al cliente?
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={72}
                    className="w-16 text-center"
                    value={datos.delayHoras}
                    onChange={(e) => actualizar("delayHoras", parseInt(e.target.value) || 0)}
                  />
                  <span className="text-sm text-muted-foreground">h</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    className="w-16 text-center"
                    value={datos.delayMinutos}
                    onChange={(e) => actualizar("delayMinutos", Math.min(59, parseInt(e.target.value) || 0))}
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
                <Badge variant={datos.delayHoras === 0 && datos.delayMinutos === 0 ? "secondary" : "outline"} className={datos.delayHoras === 0 && datos.delayMinutos === 0 ? "" : "border-amber-500 text-amber-700 dark:text-amber-400"}>
                  {resumenDelay(datos.delayHoras, datos.delayMinutos)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Deja en 0 h 0 min para enviar en cuanto guardes. Se enviará un correo al cliente indicando que su equipo está listo para recoger.</p>
            </div>
          )}

          {esNoReparado && (
            <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="motivoSinReparacion">Motivo por el que no tiene reparación *</Label>
                <Textarea id="motivoSinReparacion" rows={2} placeholder="Ej: La placa base presenta daño irreparable por cortocircuito" value={datos.motivoSinReparacion} onChange={(e) => actualizar("motivoSinReparacion", e.target.value)} />
                <p className="text-xs text-muted-foreground">Esta información se incluirá en el correo al cliente</p>
              </div>
              {conPieza && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={datos.piezaNoResuelve} onCheckedChange={(v) => actualizar("piezaNoResuelve", v === true)} />
                    Pieza OK, pero no resuelve el problema *
                  </label>
                  {datos.piezaNoResuelve && (
                    <div className="space-y-1.5">
                      <Label htmlFor="codigoDevolucion">Código de Devolución *</Label>
                      <Input id="codigoDevolucion" placeholder="Ej: RMA-123456" value={datos.codigoDevolucion} onChange={(e) => actualizar("codigoDevolucion", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Código proporcionado por el proveedor para la devolución</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Técnico Responsable *</Label>
              <Select value={datos.tecnico} onValueChange={(v) => actualizar("tecnico", v || "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {TECNICOS_FINALIZAR.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha de Reparación</Label>
              <Input id="fecha" type="date" value={datos.fecha} readOnly disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Fecha actual (no editable)</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea id="observaciones" rows={3} placeholder="Ej: Placa cambiada, funciona perfectamente" value={datos.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} />
          </div>
        </div>

        <footer className="flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5" onClick={guardar} disabled={enviando}>
            <TickCircle className="size-3.5" /> {enviando ? "Guardando..." : "Finalizar"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

const VACIO_ENTREGA = {
  fechaRecogida: new Date().toISOString().slice(0, 10),
  tipoEntrega: "ENTREGADO" as const,
  numeroFactura: "",
  resena: "NO" as const,
  observaciones: "",
};

export function MarcarEntregadoDialog({
  resguardo,
  open,
  onOpenChange,
  onEntregado,
}: {
  resguardo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntregado: () => void;
}) {
  const [datos, setDatos] = useState(VACIO_ENTREGA);
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/salidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Entrega registrada (${data.diasTotales} días desde recepción)`);
      setDatos(VACIO_ENTREGA);
      onOpenChange(false);
      onEntregado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-w-md sm:max-w-md" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BoxTick className="size-5" /> Marcar como entregado #{resguardo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fechaRecogida">Fecha de recogida *</Label>
              <Input id="fechaRecogida" type="date" value={datos.fechaRecogida} onChange={(e) => setDatos((p) => ({ ...p, fechaRecogida: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de entrega</Label>
              <Select value={datos.tipoEntrega} onValueChange={(v) => setDatos((p) => ({ ...p, tipoEntrega: v as typeof p.tipoEntrega }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTREGADO">Entregado en local</SelectItem>
                  <SelectItem value="ENVIO">Enviado por mensajería</SelectItem>
                  <SelectItem value="RECICLAJE">Punto limpio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="numeroFactura">Nº factura (opcional)</Label>
            <Input id="numeroFactura" value={datos.numeroFactura} onChange={(e) => setDatos((p) => ({ ...p, numeroFactura: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label>¿Deja reseña?</Label>
            <RadioGroup value={datos.resena} onValueChange={(v) => setDatos((p) => ({ ...p, resena: v as typeof p.resena }))} className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="SI" /> Sí
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="NO" /> No
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacionesEntrega">Observaciones</Label>
            <Textarea id="observacionesEntrega" rows={2} value={datos.observaciones} onChange={(e) => setDatos((p) => ({ ...p, observaciones: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : "Confirmar entrega"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Reproduce #modalConfirmarEntregaLocal / abrirConfirmarEntrega() /
 * confirmarEntregaLocal() (Index.html) — la confirmación rápida que se usa
 * cuando la reparación ya está "Reparado" (y por tanto ya facturada): un
 * solo clic, sin formulario. Reutiliza la MISMA ruta que MarcarEntregadoDialog
 * (POST /salidas, acción marcar_entregado) con los valores que el original
 * fija de antemano (fecha de hoy, tipoEntrega ENTREGADO, sin reseña, sin
 * observaciones) — el backend conserva el nº de factura ya existente porque
 * no se envía uno nuevo (numeroFactura vacío → COALESCE).
 */
export function ConfirmarEntregaLocalDialog({
  resguardo,
  open,
  onOpenChange,
  onEntregado,
}: {
  resguardo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntregado: () => void;
}) {
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/salidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaRecogida: new Date().toISOString().slice(0, 10),
          tipoEntrega: "ENTREGADO",
          numeroFactura: "",
          resena: "NO",
          observaciones: "",
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Equipo marcado como entregado");
      onOpenChange(false);
      onEntregado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-w-sm gap-0 p-0 sm:max-w-sm" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-emerald-600 px-4 py-2.5 text-white">
          <BoxTick className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-white">Entregado en Local</DialogTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto text-white hover:bg-white/15 hover:text-white"
            onClick={() => !enviando && onOpenChange(false)}
          >
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <p className="px-4 py-6 text-center text-sm">¿Confirmas que el equipo ha sido entregado al cliente en local?</p>

        <footer className="flex justify-center gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-2.5">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5" onClick={confirmar} disabled={enviando}>
            <TickCircle className="size-3.5" /> {enviando ? "Marcando..." : "Confirmar"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
