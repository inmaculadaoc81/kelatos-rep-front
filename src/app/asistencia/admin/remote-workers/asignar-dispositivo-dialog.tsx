"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RemoteWorkerListItem } from "@/lib/remote-workers";

interface Empleado { id: number; nombre: string; activo: boolean; }

/** Vincula manualmente un dispositivo "sin asignar" a un empleado real de
    asistencia.empleados — mismo patrón (Dialog + Select + toast) que
    AprobarMarcacionDialog en admin/marcaciones-olvidadas. No hay
    auto-vinculación: el agente Python solo conoce hostname/usuario del
    SO, que no es fiable como identidad real. */
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

  useEffect(() => {
    if (!dispositivo) return;
    setEmployeeId("");
    fetch("/api/asistencia/admin/empleados")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setEmpleados((data.empleados as Empleado[]).filter((e) => e.activo)); })
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
      toast.success("Dispositivo asignado");
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
          <DialogTitle>Asignar dispositivo</DialogTitle>
        </DialogHeader>

        {dispositivo && (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">{dispositivo.hostname}</span> (usuario del sistema: {dispositivo.username}) todavía no está vinculado a ningún empleado.</p>
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
          <Button onClick={asignar} disabled={guardando}>{guardando ? "Asignando…" : "Asignar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
