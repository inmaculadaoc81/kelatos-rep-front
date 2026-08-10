"use client";

import { useState } from "react";
import { TimerStart, BoxTick } from "@/lib/icons";
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
import { Equipo, DatosNuevoAlquiler, DatosDevolucion } from "@/lib/equipos";

const VACIO_ALQUILER: DatosNuevoAlquiler = {
  clienteNombre: "",
  clienteTelefono: "",
  clienteDNI: "",
  clienteEmail: "",
  clienteDireccion: "",
  fechaInicio: new Date().toISOString().slice(0, 10),
  fechaFinPrevista: new Date().toISOString().slice(0, 10),
  meses: 0,
  semanas: 0,
  dias: 1,
  metodoPago: "",
  observaciones: "",
};

export function NuevoAlquilerDialog({
  equipo,
  open,
  onOpenChange,
  onCreado,
}: {
  equipo: Equipo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreado: () => void;
}) {
  const [datos, setDatos] = useState<DatosNuevoAlquiler>(VACIO_ALQUILER);
  const [enviando, setEnviando] = useState(false);

  function actualizar<K extends keyof DatosNuevoAlquiler>(campo: K, valor: DatosNuevoAlquiler[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  const subtotal = equipo ? datos.meses * equipo.precioMes + datos.semanas * equipo.precioSemana + datos.dias * equipo.precioDia : 0;
  const iva = +(subtotal * 0.21).toFixed(2);
  const total = +(subtotal + iva).toFixed(2);

  async function guardar() {
    if (!equipo) return;
    if (!datos.clienteNombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!datos.clienteTelefono.trim()) return toast.error("El teléfono es obligatorio");
    if (!datos.clienteDNI.trim()) return toast.error("El DNI es obligatorio");
    if (datos.meses + datos.semanas + datos.dias <= 0) return toast.error("Indica al menos 1 día, semana o mes");

    setEnviando(true);
    try {
      const res = await fetch("/api/alquileres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipoId: equipo.id, datos }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Alquiler creado — total ${data.total.toFixed(2)} €`);
      setDatos(VACIO_ALQUILER);
      onOpenChange(false);
      onCreado();
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
            <TimerStart className="size-5" /> Nuevo alquiler — {equipo?.marca} {equipo?.modelo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="clienteNombreAlq">Nombre *</Label>
              <Input id="clienteNombreAlq" value={datos.clienteNombre} onChange={(e) => actualizar("clienteNombre", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clienteDNIAlq">DNI *</Label>
              <Input id="clienteDNIAlq" value={datos.clienteDNI} onChange={(e) => actualizar("clienteDNI", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clienteTelefonoAlq">Teléfono *</Label>
              <Input id="clienteTelefonoAlq" value={datos.clienteTelefono} onChange={(e) => actualizar("clienteTelefono", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clienteEmailAlq">Email</Label>
              <Input id="clienteEmailAlq" type="email" value={datos.clienteEmail} onChange={(e) => actualizar("clienteEmail", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clienteDireccionAlq">Dirección</Label>
            <Input id="clienteDireccionAlq" value={datos.clienteDireccion} onChange={(e) => actualizar("clienteDireccion", e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fechaInicioAlq">Fecha inicio</Label>
              <Input id="fechaInicioAlq" type="date" value={datos.fechaInicio} onChange={(e) => actualizar("fechaInicio", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaFinAlq">Fecha fin prevista</Label>
              <Input id="fechaFinAlq" type="date" value={datos.fechaFinPrevista} onChange={(e) => actualizar("fechaFinPrevista", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="mesesAlq">Meses</Label>
              <Input id="mesesAlq" type="number" min={0} value={datos.meses} onChange={(e) => actualizar("meses", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="semanasAlq">Semanas</Label>
              <Input id="semanasAlq" type="number" min={0} value={datos.semanas} onChange={(e) => actualizar("semanas", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="diasAlq">Días</Label>
              <Input id="diasAlq" type="number" min={0} value={datos.dias} onChange={(e) => actualizar("dias", parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacionesAlq">Observaciones</Label>
            <Textarea id="observacionesAlq" rows={2} value={datos.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/30 p-2.5 text-sm">
            <span>Subtotal: {subtotal.toFixed(2)} €</span>
            <span>IVA (21%): {iva.toFixed(2)} €</span>
            <span className="font-semibold">Total: {total.toFixed(2)} €</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : "Crear alquiler"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const VACIO_DEVOLUCION: DatosDevolucion = {
  fechaDevolucion: new Date().toISOString().slice(0, 10),
  totalCobrado: 0,
  fianzaDevuelta: 0,
  estadoDevolucion: "BUENO",
  descuentoDanos: 0,
};

export function DevolverAlquilerDialog({
  equipo,
  open,
  onOpenChange,
  onDevuelto,
}: {
  equipo: Equipo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDevuelto: () => void;
}) {
  const [datos, setDatos] = useState<DatosDevolucion>(VACIO_DEVOLUCION);
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    if (!equipo?.alquilerActivo) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/alquileres/${equipo.alquilerActivo.alquilerId}/devolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipoId: equipo.id, datos }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Alquiler devuelto — equipo disponible de nuevo");
      setDatos(VACIO_DEVOLUCION);
      onOpenChange(false);
      onDevuelto();
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
            <BoxTick className="size-5" /> Devolver — {equipo?.marca} {equipo?.modelo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fechaDevolucion">Fecha de devolución</Label>
            <Input
              id="fechaDevolucion"
              type="date"
              value={datos.fechaDevolucion}
              onChange={(e) => setDatos((p) => ({ ...p, fechaDevolucion: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="totalCobrado">Total cobrado (€)</Label>
              <Input
                id="totalCobrado"
                type="number"
                step="0.01"
                value={datos.totalCobrado}
                onChange={(e) => setDatos((p) => ({ ...p, totalCobrado: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fianzaDevuelta">Fianza devuelta (€)</Label>
              <Input
                id="fianzaDevuelta"
                type="number"
                step="0.01"
                value={datos.fianzaDevuelta}
                onChange={(e) => setDatos((p) => ({ ...p, fianzaDevuelta: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Estado de devolución</Label>
            <Select value={datos.estadoDevolucion} onValueChange={(v) => setDatos((p) => ({ ...p, estadoDevolucion: v || "BUENO" }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUENO">Buen estado</SelectItem>
                <SelectItem value="DAÑADO">Con daños</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {datos.estadoDevolucion === "DAÑADO" && (
            <div className="space-y-1.5">
              <Label htmlFor="descuentoDanos">Descuento por daños de la fianza (€)</Label>
              <Input
                id="descuentoDanos"
                type="number"
                step="0.01"
                value={datos.descuentoDanos}
                onChange={(e) => setDatos((p) => ({ ...p, descuentoDanos: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : "Confirmar devolución"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
