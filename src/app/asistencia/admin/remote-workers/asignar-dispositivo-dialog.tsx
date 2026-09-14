"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RemoteWorkerListItem } from "@/lib/remote-workers";

interface Empleado { id: number; nombre: string; activo: boolean; trabaja_remoto: boolean; }

/** Vincula manualmente un dispositivo a un empleado real de
    asistencia.empleados — mismo patrón (Dialog + Select + toast) que
    AprobarMarcacionDialog en admin/marcaciones-olvidadas. No hay
    auto-vinculación: el agente Python solo conoce hostname/usuario del
    SO, que no es fiable como identidad real. Sirve tanto para "Asignar"
    (dispositivo sin empleado) como para "Cambiar empleado" (ya
    asignado) — es la misma acción, solo cambia el texto según el caso. */
export function AsignarDispositivoDialog({
  dispositivo,
  onClose,
  onAsignado,
}: {
  dispositivo: RemoteWorkerListItem | null;
  onClose: () => void;
  onAsignado: () => void;
}) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [guardando, setGuardando] = useState(false);
  const yaAsignado = dispositivo?.employeeId != null;

  useEffect(() => {
    if (!dispositivo) return;
    setEmployeeId(dispositivo.employeeId != null ? String(dispositivo.employeeId) : "");
    fetch("/api/asistencia/admin/empleados")
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        // Solo empleados activos Y marcados como "trabaja en remoto" (ver
        // Empleados > Modalidad) -- antes salían TODOS los activos,
        // fichaje local incluido (petición del usuario, 2026-09-15). Si el
        // dispositivo ya estaba asignado a alguien que no tiene ese flag
        // marcado (asignaciones de antes de que existiera este campo), se
        // mantiene igual en la lista para no perder su nombre al editar.
        const todos = data.empleados as Empleado[];
        const filtrados = todos.filter((e) => e.activo && e.trabaja_remoto);
        const yaAsignadoFuera = dispositivo.employeeId != null && !filtrados.some((e) => e.id === dispositivo.employeeId)
          ? todos.find((e) => e.id === dispositivo.employeeId)
          : null;
        setEmpleados(yaAsignadoFuera ? [...filtrados, yaAsignadoFuera] : filtrados);
      })
      .catch(() => {});
  }, [dispositivo]);

  async function asignar() {
    if (!dispositivo) return;
    if (!employeeId) return toast.error("Elige un empleado");
    setGuardando(true);
    try {
      const res = await fetch(`/api/asistencia/admin/remote-workers/${dispositivo.deviceId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: Number(employeeId) }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo asignar el dispositivo");
      toast.success(yaAsignado ? "Empleado cambiado" : "Dispositivo asignado");
      onAsignado();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={dispositivo != null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{yaAsignado ? "Cambiar empleado" : "Asignar dispositivo"}</DialogTitle>
        </DialogHeader>

        {dispositivo && (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              {yaAsignado ? (
                <p><span className="font-medium text-foreground">{dispositivo.hostname}</span> está asignado a <span className="font-medium text-foreground">{dispositivo.empleadoNombre}</span>. Elige el nuevo empleado.</p>
              ) : (
                <p><span className="font-medium text-foreground">{dispositivo.hostname}</span> (usuario del sistema: {dispositivo.username}) todavía no está vinculado a ningún empleado.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Empleado</Label>
              <Select value={employeeId} onValueChange={(v) => v && setEmployeeId(v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Elige un empleado" /></SelectTrigger>
                <SelectContent>
                  {empleados.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={asignar} disabled={guardando}>{guardando ? "Guardando…" : yaAsignado ? "Cambiar" : "Asignar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
