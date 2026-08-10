"use client";

import { useState } from "react";
import { DocumentText } from "@/lib/icons";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SeguimientoFactura, DatosSeguimientoForm, EstadoFacturaRecibida } from "@/lib/seguimiento-facturas";

function vacio(): DatosSeguimientoForm {
  return { fecha: new Date().toISOString().slice(0, 10), plataforma: "", proveedor: "", numeroPedido: "", modelo: "", importe: 0, moneda: "EUR", numeroFactura: "", facturaRecibida: "PENDIENTE", observaciones: "" };
}

function desdeExistente(s: SeguimientoFactura): DatosSeguimientoForm {
  return {
    fecha: s.fecha ? s.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
    plataforma: s.plataforma,
    proveedor: s.proveedor,
    numeroPedido: s.numeroPedido,
    modelo: s.modelo,
    importe: s.importe,
    moneda: s.moneda,
    numeroFactura: s.numeroFactura,
    facturaRecibida: s.facturaRecibida,
    observaciones: s.observaciones,
  };
}

export function SeguimientoFormDialog({
  entradaExistente,
  open,
  onOpenChange,
  onGuardado,
}: {
  entradaExistente: SeguimientoFactura | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosSeguimientoForm>(() => (entradaExistente ? desdeExistente(entradaExistente) : vacio()));
  const [enviando, setEnviando] = useState(false);
  const esEdicion = entradaExistente !== null;

  function actualizar<K extends keyof DatosSeguimientoForm>(campo: K, valor: DatosSeguimientoForm[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    if (!datos.plataforma.trim() && !datos.proveedor.trim()) return toast.error("Indica al menos plataforma o proveedor");

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/seguimiento-facturas/${entradaExistente!.seguimientoId}` : "/api/seguimiento-facturas";
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEdicion ? "Entrada actualizada" : "Entrada creada");
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
        if (!o) setDatos(entradaExistente ? desdeExistente(entradaExistente) : vacio());
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentText className="size-5" /> {esEdicion ? "Editar entrada" : "Nueva entrada"} de seguimiento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fechaSeg">Fecha</Label>
              <Input id="fechaSeg" type="date" value={datos.fecha} onChange={(e) => actualizar("fecha", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plataformaSeg">Plataforma</Label>
              <Input id="plataformaSeg" placeholder="eBay, AliExpress..." value={datos.plataforma} onChange={(e) => actualizar("plataforma", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proveedorSeg">Proveedor</Label>
              <Input id="proveedorSeg" value={datos.proveedor} onChange={(e) => actualizar("proveedor", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numeroPedidoSeg">Nº pedido</Label>
              <Input id="numeroPedidoSeg" value={datos.numeroPedido} onChange={(e) => actualizar("numeroPedido", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modeloSeg">Modelo / pieza</Label>
              <Input id="modeloSeg" value={datos.modelo} onChange={(e) => actualizar("modelo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numeroFacturaSeg">Nº factura</Label>
              <Input id="numeroFacturaSeg" value={datos.numeroFactura} onChange={(e) => actualizar("numeroFactura", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="importeSeg">Importe</Label>
              <Input id="importeSeg" type="number" step="0.01" value={datos.importe} onChange={(e) => actualizar("importe", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monedaSeg">Moneda</Label>
              <Input id="monedaSeg" value={datos.moneda} onChange={(e) => actualizar("moneda", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Estado de la factura</Label>
            <Select value={datos.facturaRecibida} onValueChange={(v) => actualizar("facturaRecibida", (v || datos.facturaRecibida) as EstadoFacturaRecibida)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
                <SelectItem value="NO DISPONIBLE">No disponible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacionesSeg">Observaciones</Label>
            <Textarea id="observacionesSeg" rows={2} value={datos.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear entrada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
