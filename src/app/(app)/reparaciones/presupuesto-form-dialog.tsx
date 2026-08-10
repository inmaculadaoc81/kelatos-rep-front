"use client";

import { useState } from "react";
import { Add, Trash, DocumentText } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Presupuesto } from "@/lib/reparacion-detalle";
import { DatosPresupuestoForm, PiezaForm, TipoLineaPieza } from "@/lib/presupuesto-form";

function vacio(): DatosPresupuestoForm {
  return { elaboradoPor: "", descripcion: "", notas: "", manoObra: 0, diasEntrega: 0, tipoPieza: "no", piezas: [] };
}

function piezaVacia(): PiezaForm {
  return { descripcion: "", tipo: "stock", costo: 0, precio: 0, enlace: "", proveedorId: "", referenciaStock: "", notas: "" };
}

function desdeExistente(p: Presupuesto): DatosPresupuestoForm {
  return {
    elaboradoPor: p.elaboradoPor,
    descripcion: p.descripcion,
    notas: p.notas,
    manoObra: p.manoObra,
    diasEntrega: p.diasEntrega,
    tipoPieza: p.tipoPieza === "stock" || p.tipoPieza === "pedido" || p.tipoPieza === "mixto" ? p.tipoPieza : "no",
    piezas: p.piezas.map((pz) => ({
      descripcion: pz.descripcion,
      tipo: pz.tipo === "pedido" ? "pedido" : "stock",
      costo: pz.costo,
      precio: pz.precio,
      enlace: pz.enlace,
      proveedorId: pz.proveedorId,
      referenciaStock: pz.referenciaStock,
      notas: pz.notas,
    })),
  };
}

export function PresupuestoFormDialog({
  resguardo,
  presupuestoExistente,
  open,
  onOpenChange,
  onGuardado,
}: {
  resguardo: string;
  presupuestoExistente: Presupuesto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosPresupuestoForm>(() => (presupuestoExistente ? desdeExistente(presupuestoExistente) : vacio()));
  const [enviando, setEnviando] = useState(false);
  const esEdicion = presupuestoExistente !== null;

  function reiniciar() {
    setDatos(presupuestoExistente ? desdeExistente(presupuestoExistente) : vacio());
  }

  function actualizar<K extends keyof DatosPresupuestoForm>(campo: K, valor: DatosPresupuestoForm[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  function actualizarPieza(i: number, campo: keyof PiezaForm, valor: string | number) {
    setDatos((prev) => ({
      ...prev,
      piezas: prev.piezas.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)),
    }));
  }

  function agregarPieza() {
    setDatos((prev) => ({ ...prev, piezas: [...prev.piezas, piezaVacia()] }));
  }

  function quitarPieza(i: number) {
    setDatos((prev) => ({ ...prev, piezas: prev.piezas.filter((_, idx) => idx !== i) }));
  }

  const costoPiezas = datos.piezas.reduce((s, p) => s + (Number(p.costo) || 0), 0);
  const precioPiezas = datos.piezas.reduce((s, p) => s + (Number(p.precio) || 0), 0);
  const total = Math.max(0, Number(datos.manoObra) + precioPiezas);

  async function guardar() {
    if (datos.piezas.some((p) => !p.descripcion.trim())) return toast.error("Todas las piezas deben tener descripción");
    if (datos.piezas.some((p) => p.tipo === "pedido" && !p.enlace.trim())) return toast.error("Las piezas 'Por pedido' deben tener enlace de compra");

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/presupuestos/${presupuestoExistente!.presupuestoId}` : `/api/reparaciones/${resguardo}/presupuestos`;
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEdicion ? "Presupuesto actualizado" : "Presupuesto creado");
      onOpenChange(false);
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (enviando) return;
        if (!o) reiniciar();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl sm:max-w-2xl" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentText className="size-5" /> {esEdicion ? "Editar presupuesto" : "Nuevo presupuesto"} — #{resguardo}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-4 pr-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="elaboradoPor">Elaborado por</Label>
                <Input id="elaboradoPor" value={datos.elaboradoPor} onChange={(e) => actualizar("elaboradoPor", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="diasEntrega">Días estimados de entrega</Label>
                <Input id="diasEntrega" type="number" min={0} value={datos.diasEntrega} onChange={(e) => actualizar("diasEntrega", parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion">Diagnóstico / descripción</Label>
              <Textarea id="descripcion" rows={2} value={datos.descripcion} onChange={(e) => actualizar("descripcion", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manoObra">Mano de obra (€)</Label>
              <Input id="manoObra" type="number" min={0} step="0.01" value={datos.manoObra} onChange={(e) => actualizar("manoObra", parseFloat(e.target.value) || 0)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Piezas</Label>
                <Button size="sm" variant="outline" className="h-7 gap-1" onClick={agregarPieza}>
                  <Add className="size-3.5" /> Añadir pieza
                </Button>
              </div>
              {datos.piezas.length === 0 && <p className="text-xs text-muted-foreground">Sin piezas.</p>}
              <div className="space-y-2">
                {datos.piezas.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-md border p-2 sm:grid-cols-6">
                    <Input
                      className="col-span-2"
                      placeholder="Descripción"
                      value={p.descripcion}
                      onChange={(e) => actualizarPieza(i, "descripcion", e.target.value)}
                    />
                    <Select value={p.tipo} onValueChange={(v) => actualizarPieza(i, "tipo", v as TipoLineaPieza)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">En stock</SelectItem>
                        <SelectItem value="pedido">Por pedido</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Costo" step="0.01" value={p.costo} onChange={(e) => actualizarPieza(i, "costo", parseFloat(e.target.value) || 0)} />
                    <Input type="number" placeholder="Precio" step="0.01" value={p.precio} onChange={(e) => actualizarPieza(i, "precio", parseFloat(e.target.value) || 0)} />
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => quitarPieza(i)}>
                      <Trash className="size-4" />
                    </Button>
                    {p.tipo === "pedido" && (
                      <Input
                        className="col-span-2 sm:col-span-6"
                        placeholder="Enlace de compra *"
                        value={p.enlace}
                        onChange={(e) => actualizarPieza(i, "enlace", e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notasPpto">Notas</Label>
              <Textarea id="notasPpto" rows={2} value={datos.notas} onChange={(e) => actualizar("notas", e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/30 p-2.5 text-sm">
              <span>Costo piezas: {costoPiezas.toFixed(2)} €</span>
              <span>Precio piezas: {precioPiezas.toFixed(2)} €</span>
              <span className="font-semibold">Total: {total.toFixed(2)} €</span>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear presupuesto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
