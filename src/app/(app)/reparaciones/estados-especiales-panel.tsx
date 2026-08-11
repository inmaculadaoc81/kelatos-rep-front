"use client";

import { useEffect, useState } from "react";
import { BoxRemove, ArrowRotateLeft, RotateLeft, Warning2, CloseCircle, TickCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { DatosSinReparacionPieza } from "@/lib/reparacion-estados-especiales";
import { Empleado } from "@/app/api/empleados/route";

const ESTADOS_ORIGEN_SIN_PIEZA = ["Presupuesto Pendiente", "Presupuesto Enviado"];

const VACIO: DatosSinReparacionPieza = {
  tecnico: "",
  fecha: new Date().toISOString().slice(0, 10),
  motivoAdicional: "",
  marcarPresupuestosObsoletos: true,
};

export function EstadosEspecialesPanel({
  detalle,
  onActualizado,
}: {
  detalle: ReparacionDetalle;
  onActualizado: () => void;
}) {
  const [sinPiezaAbierto, setSinPiezaAbierto] = useState(false);
  const [datos, setDatos] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const confirmar = useConfirm();

  const puedeSinPieza = ESTADOS_ORIGEN_SIN_PIEZA.includes(detalle.estado);
  const puedeDeshacer = detalle.estado === "No tiene Reparación" && detalle.motivoSinReparacion.startsWith("NO_HAY_PIEZA");
  const puedeRevertirAbandono = detalle.estado === "Abandonado";

  useEffect(() => {
    if (!sinPiezaAbierto) return;
    fetch("/api/empleados")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setEmpleados(d.empleados); });
  }, [sinPiezaAbierto]);

  if (!puedeSinPieza && !puedeDeshacer && !puedeRevertirAbandono) return null;

  async function ejecutar(accion: string, datosAccion: Record<string, unknown>, mensajeExito: string) {
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/estados-especiales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, datos: datosAccion }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(mensajeExito);
      setSinPiezaAbierto(false);
      setDatos(VACIO);
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  function guardarSinPieza() {
    // Mismos mensajes que marcarSinPieza() del original.
    if (!datos.tecnico) return toast.error("Selecciona el técnico responsable.");
    if (!datos.motivoAdicional.trim()) return toast.error("Indica el motivo para el cliente (por qué no hay pieza disponible).");
    ejecutar("sin_reparacion_pieza", { ...datos }, 'Marcado como "Sin Reparación - No hay pieza"');
  }

  return (
    <div className="flex flex-wrap gap-2">
      {puedeSinPieza && (
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => setSinPiezaAbierto(true)}>
          <BoxRemove className="size-3.5" /> Sin reparación por pieza
        </Button>
      )}
      {puedeDeshacer && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={enviando}
          onClick={async () => {
            const ok = await confirmar(
              '¿Deshacer "Sin Reparación"?\n\n' +
              "Esto restaurará el estado anterior de la reparación.\n" +
              "Los presupuestos marcados como obsoletos NO se modificarán automáticamente."
            );
            if (ok) ejecutar("deshacer_sin_reparacion", {}, "Estado anterior restaurado");
          }}
        >
          <ArrowRotateLeft className="size-3.5" /> Deshacer sin reparación
        </Button>
      )}
      {puedeRevertirAbandono && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={enviando}
          onClick={async () => {
            const ok = await confirmar("¿Revertir estado Abandonado?");
            if (ok) ejecutar("revertir_abandonado", {}, "Abandono revertido");
          }}
        >
          <RotateLeft className="size-3.5" /> Revertir abandonado
        </Button>
      )}

      {/* Reproduce el modal dinámico #modalSinPieza del original: cabecera
          bg-warning, alerta de atención, lista de "esto hará lo siguiente",
          técnico/fecha/checkbox/motivo. */}
      <Dialog open={sinPiezaAbierto} onOpenChange={(o) => !enviando && setSinPiezaAbierto(o)}>
        <DialogContent className="gap-0 p-0 sm:max-w-md" showCloseButton={false}>
          <header className="flex items-center gap-2 rounded-t-xl bg-amber-400 px-4 py-3 text-amber-950">
            <BoxRemove className="size-4.5 shrink-0" />
            <DialogTitle className="text-sm font-semibold text-amber-950">Marcar como &quot;Sin Pieza Disponible&quot;</DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto text-amber-950 hover:bg-black/10"
              onClick={() => setSinPiezaAbierto(false)}
              disabled={enviando}
            >
              <CloseCircle className="size-4" />
            </Button>
          </header>

          <div className="space-y-3 p-4">
            <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-400">
              <Warning2 className="mt-0.5 size-4 shrink-0" />
              <p>
                <strong>Atención:</strong> Esta acción marcará la reparación como &quot;No tiene Reparación&quot; porque no se
                encontró la pieza necesaria.
              </p>
            </div>

            <div className="text-sm">
              <p className="font-medium">Esto hará lo siguiente:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                <li>Cambiará el estado a &quot;No tiene Reparación&quot;</li>
                <li>Marcará la razón como &quot;Pieza no disponible&quot;</li>
                <li>Los presupuestos existentes se marcarán como obsoletos</li>
                <li>El equipo quedará listo para ser entregado al cliente</li>
              </ul>
            </div>

            <hr />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Técnico Responsable *</Label>
                <Select value={datos.tecnico} onValueChange={(v) => setDatos((p) => ({ ...p, tecnico: v || "" }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {empleados.map((e) => <SelectItem key={e.empleadoId} value={e.nombre}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fechaSinPieza">Fecha</Label>
                <Input id="fechaSinPieza" type="date" value={datos.fecha} disabled className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">Fecha actual (no editable)</p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={datos.marcarPresupuestosObsoletos}
                onCheckedChange={(v) => setDatos((p) => ({ ...p, marcarPresupuestosObsoletos: v === true }))}
              />
              Marcar presupuestos existentes como obsoletos
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="motivoSinPieza">Motivo para el cliente *</Label>
              <Textarea
                id="motivoSinPieza"
                rows={2}
                value={datos.motivoAdicional}
                onChange={(e) => setDatos((p) => ({ ...p, motivoAdicional: e.target.value }))}
                placeholder="Ej: No se encontró la pieza necesaria en el mercado, el proveedor descontinuó el modelo"
              />
              <p className="text-xs text-muted-foreground">Esta información se incluirá en el correo al cliente</p>
            </div>
          </div>

          <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
            <Button variant="outline" onClick={() => setSinPiezaAbierto(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600" onClick={guardarSinPieza} disabled={enviando}>
              <TickCircle className="size-3.5" /> {enviando ? "Guardando..." : "Confirmar"}
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
    </div>
  );
}
