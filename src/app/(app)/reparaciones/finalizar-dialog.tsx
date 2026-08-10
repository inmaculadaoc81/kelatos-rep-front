"use client";

import { useState } from "react";
import { Setting2, BoxTick } from "@/lib/icons";
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
import { toast } from "sonner";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { DatosFinalizarReparacion, ResultadoReparacion } from "@/lib/reparacion-finalizar";

function tienePieza(detalle: ReparacionDetalle): boolean {
  const pptoAceptado = detalle.presupuestos.find((p) => p.estado === "aceptado") || detalle.presupuestos[0];
  return (pptoAceptado?.costoPiezas ?? 0) > 0 || detalle.pedidos.length > 0;
}

const VACIO: DatosFinalizarReparacion = {
  resultado: "reparado",
  tecnico: "",
  fecha: new Date().toISOString().slice(0, 10),
  observaciones: "",
  motivoSinReparacion: "",
  piezaOk: false,
  piezaNoResuelve: false,
  codigoDevolucion: "",
};

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
  const [datos, setDatos] = useState<DatosFinalizarReparacion>(VACIO);
  const [enviando, setEnviando] = useState(false);
  const conPieza = tienePieza(detalle);

  function actualizar<K extends keyof DatosFinalizarReparacion>(campo: K, valor: DatosFinalizarReparacion[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    if (!datos.tecnico.trim()) return toast.error("El técnico es obligatorio");
    if (datos.resultado === "no_reparado" && !datos.motivoSinReparacion.trim()) {
      return toast.error("El motivo por el que no tiene reparación es obligatorio");
    }
    if (conPieza) {
      if (datos.resultado === "reparado" && !datos.piezaOk) return toast.error("Confirma el estado de la pieza");
      if (datos.resultado === "no_reparado") {
        if (!datos.piezaNoResuelve) return toast.error("Marca la casilla sobre el estado de la pieza");
        if (!datos.codigoDevolucion.trim()) return toast.error("El código de devolución es obligatorio");
      }
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Reparación finalizada: ${datos.resultado === "reparado" ? "Reparado" : "No tiene Reparación"}`);
      setDatos(VACIO);
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
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Setting2 className="size-5" /> Finalizar Reparación #{detalle.resguardo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={datos.resultado} onValueChange={(v) => actualizar("resultado", v as ResultadoReparacion)} className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="reparado" /> ✅ Reparado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="no_reparado" /> ❌ No tiene Reparación
            </label>
          </RadioGroup>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tecnico">Técnico *</Label>
              <Input id="tecnico" value={datos.tecnico} onChange={(e) => actualizar("tecnico", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input id="fecha" type="date" value={datos.fecha} onChange={(e) => actualizar("fecha", e.target.value)} />
            </div>
          </div>

          {conPieza && datos.resultado === "reparado" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={datos.piezaOk} onCheckedChange={(v) => actualizar("piezaOk", v === true)} />
              Pieza OK (funcionó correctamente) *
            </label>
          )}

          {datos.resultado === "no_reparado" && (
            <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="motivoSinReparacion">Motivo *</Label>
                <Textarea id="motivoSinReparacion" rows={2} value={datos.motivoSinReparacion} onChange={(e) => actualizar("motivoSinReparacion", e.target.value)} />
              </div>
              {conPieza && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={datos.piezaNoResuelve} onCheckedChange={(v) => actualizar("piezaNoResuelve", v === true)} />
                    Pieza OK, pero no resuelve el problema *
                  </label>
                  {datos.piezaNoResuelve && (
                    <div className="space-y-1.5">
                      <Label htmlFor="codigoDevolucion">Código de devolución *</Label>
                      <Input id="codigoDevolucion" value={datos.codigoDevolucion} onChange={(e) => actualizar("codigoDevolucion", e.target.value)} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" rows={2} value={datos.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : "Finalizar"}
          </Button>
        </DialogFooter>
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
