"use client";

import { useEffect, useState } from "react";
import { ClipboardTick, CloseCircle } from "@/lib/icons";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Reparacion } from "@/lib/reparaciones";
import { EstadoInicialSimple, TipoRecepcion } from "@/lib/reparacion-alta";
import { DatosConfirmarFormulario } from "@/lib/reparacion-confirmar";

type Modo = "confirmar" | "rechazar";

function datosIniciales(rep: Reparacion): DatosConfirmarFormulario {
  return {
    clienteNombre: rep.cliente.nombre,
    clienteTelefono: rep.cliente.telefono,
    clienteEmail: rep.cliente.email,
    direccionEnvio: rep.cliente.direccion,
    equipoModelo: rep.equipo.modelo,
    sintoma: rep.equipo.sintoma,
    estado: "Presupuesto Pendiente",
    tipoRecepcion: (rep.tipoRecepcion as TipoRecepcion) || "LOCAL",
    entregaMensajeria: rep.entregaMensajeria === "SI",
    revisionPagada: false,
  };
}

export function FormularioPendienteDialog({
  reparacion,
  modo,
  onOpenChange,
  onResuelto,
}: {
  reparacion: Reparacion | null;
  modo: Modo;
  onOpenChange: (open: boolean) => void;
  onResuelto: () => void;
}) {
  const [datos, setDatos] = useState<DatosConfirmarFormulario | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (reparacion) {
      setDatos(datosIniciales(reparacion));
      setMotivo("");
    }
  }, [reparacion]);

  function actualizar<K extends keyof DatosConfirmarFormulario>(campo: K, valor: DatosConfirmarFormulario[K]) {
    setDatos((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  async function confirmar() {
    if (!reparacion || !datos) return;
    if (!datos.clienteNombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!datos.equipoModelo.trim()) return toast.error("El modelo del equipo es obligatorio");

    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${reparacion.resguardo}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Recepción ${reparacion.resguardo} confirmada — ${data.nuevoEstado}`);
      onOpenChange(false);
      onResuelto();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function rechazar() {
    if (!reparacion) return;
    if (!motivo.trim()) return toast.error("El motivo del rechazo es obligatorio");

    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${reparacion.resguardo}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Formulario ${reparacion.resguardo} rechazado`);
      onOpenChange(false);
      onResuelto();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={reparacion !== null} onOpenChange={(open) => !enviando && onOpenChange(open)}>
      <DialogContent className="max-w-2xl sm:max-w-2xl" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {modo === "confirmar" ? <ClipboardTick className="size-5" /> : <CloseCircle className="size-5" />}
            {modo === "confirmar" ? "Confirmar" : "Rechazar"} formulario #{reparacion?.resguardo}
          </DialogTitle>
        </DialogHeader>

        {modo === "rechazar" && (
          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo del rechazo *</Label>
            <Textarea id="motivo" rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Explica por qué se rechaza esta solicitud..." />
          </div>
        )}

        {modo === "confirmar" && datos && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-5 pr-3">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Datos del cliente</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="clienteNombre">Nombre completo *</Label>
                    <Input id="clienteNombre" value={datos.clienteNombre} onChange={(e) => actualizar("clienteNombre", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="clienteTelefono">Teléfono</Label>
                    <Input id="clienteTelefono" value={datos.clienteTelefono} onChange={(e) => actualizar("clienteTelefono", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="clienteEmail">Email</Label>
                    <Input id="clienteEmail" type="email" value={datos.clienteEmail} onChange={(e) => actualizar("clienteEmail", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="direccionEnvio">Dirección</Label>
                    <Input id="direccionEnvio" value={datos.direccionEnvio} onChange={(e) => actualizar("direccionEnvio", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Datos del equipo</p>
                <div className="space-y-1.5">
                  <Label htmlFor="equipoModelo">Modelo / Marca *</Label>
                  <Input id="equipoModelo" value={datos.equipoModelo} onChange={(e) => actualizar("equipoModelo", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sintoma">Síntoma / Avería</Label>
                  <Textarea id="sintoma" rows={3} value={datos.sintoma} onChange={(e) => actualizar("sintoma", e.target.value)} />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Tipo de recepción</p>
                <RadioGroup value={datos.tipoRecepcion} onValueChange={(v) => actualizar("tipoRecepcion", v as TipoRecepcion)} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="LOCAL" /> Cliente trajo al local
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="ENVIO" /> Recibido por envío
                  </label>
                </RadioGroup>
                {datos.tipoRecepcion === "ENVIO" && (
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={datos.entregaMensajeria} onCheckedChange={(v) => actualizar("entregaMensajeria", v)} />
                    Devolución por mensajería
                  </label>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Estado inicial</p>
                <RadioGroup value={datos.estado} onValueChange={(v) => actualizar("estado", v as EstadoInicialSimple)} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="Presupuesto Pendiente" /> Presupuesto Pendiente
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="Garantía" /> Garantía
                  </label>
                </RadioGroup>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={datos.revisionPagada} onCheckedChange={(v) => actualizar("revisionPagada", v)} />
                  Revisión pagada (20€)
                </label>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          {modo === "confirmar" ? (
            <Button onClick={confirmar} disabled={enviando} className="gap-1.5 bg-amber-500 hover:bg-amber-600">
              <ClipboardTick className="size-4" /> {enviando ? "Confirmando..." : "Confirmar recepción"}
            </Button>
          ) : (
            <Button onClick={rechazar} disabled={enviando} variant="destructive" className="gap-1.5">
              <CloseCircle className="size-4" /> {enviando ? "Rechazando..." : "Rechazar formulario"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
