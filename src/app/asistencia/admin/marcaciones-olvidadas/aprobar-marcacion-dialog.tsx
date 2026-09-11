"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Marcacion {
  id: number;
  employee_id: number;
  empleado: string;
  fecha_marcacion: string;
  tipo_fichaje: string;
  hora_solicitada: string;
  motivo: string;
  state: string;
}

const TIPOS_FICHAJE = [
  { valor: "entrada", label: "Entrada" },
  { valor: "salida_comida", label: "Salida comida" },
  { valor: "vuelta_comida", label: "Vuelta comida" },
  { valor: "salida", label: "Salida" },
  { valor: "ausencia", label: "Ausencia" },
  { valor: "regreso_ausencia", label: "Regreso ausencia" },
];

function horaFloatAHHMM(horaFloat: string): string {
  const n = Number(horaFloat);
  const h = Math.trunc(n);
  const m = Math.round((n - h) * 100);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Reemplaza a "Aprobar" (aprobar-auto, quitado el 2026-09-11 — "no puede
 * haber autoaprobados", tras el incidente de Romer Ramírez: una
 * heurística encontró el último fichaje abierto de hace DOS DÍAS y lo
 * cerró como si fuera de ese momento). Ahora la persona admin escribe a
 * mano la entrada/salida real antes de aprobar — nada se adivina.
 *
 * Se precarga check_in con la fecha+hora que pidió el empleado (el punto
 * de partida más probable), pero el tipo de marcación puede ser el que
 * cierra un turno (p.ej. "Salida") — revisa los fichajes de ese día
 * (Asistencia → Fichajes) antes de decidir si esa hora va en la entrada
 * o en la salida del fichaje que crees.
 */
export function AprobarMarcacionDialog({
  marcacion,
  onClose,
  onAprobado,
}: {
  marcacion: Marcacion | null;
  onClose: () => void;
  onAprobado: () => void;
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [tipoFichaje, setTipoFichaje] = useState("entrada");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!marcacion) return;
    const fecha = marcacion.fecha_marcacion.slice(0, 10);
    const hora = horaFloatAHHMM(marcacion.hora_solicitada);
    setCheckIn(`${fecha}T${hora}`);
    setCheckOut("");
    setTipoFichaje(marcacion.tipo_fichaje);
    setObservaciones(`Marcación olvidada #${marcacion.id} — ${marcacion.motivo || "sin motivo indicado"}`);
  }, [marcacion]);

  async function aprobar() {
    if (!marcacion) return;
    if (!checkIn) return toast.error("La entrada es obligatoria");
    setGuardando(true);
    try {
      const resCrear = await fetch("/api/asistencia/admin/fichajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: marcacion.employee_id,
          checkIn: new Date(checkIn).toISOString(),
          checkOut: checkOut ? new Date(checkOut).toISOString() : null,
          tipoFichaje,
          observaciones,
        }),
      });
      const dataCrear = await resCrear.json();
      if (!dataCrear.ok) throw new Error(dataCrear.error || "No se pudo crear el fichaje");

      const resAprobar = await fetch(`/api/asistencia/admin/marcaciones-olvidadas/${marcacion.id}/aprobar-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fichajeCreadoId: dataCrear.fichaje.id }),
      });
      const dataAprobar = await resAprobar.json();
      if (!dataAprobar.ok) throw new Error(dataAprobar.error || "El fichaje se creó, pero no se pudo marcar la solicitud como aprobada");

      toast.success(`Fichaje #${dataCrear.fichaje.id} creado y solicitud aprobada`);
      onAprobado();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={marcacion != null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aprobar marcación olvidada</DialogTitle>
        </DialogHeader>

        {marcacion && (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">{marcacion.empleado}</span> pidió registrar <span className="font-medium text-foreground">{TIPOS_FICHAJE.find((t) => t.valor === marcacion.tipo_fichaje)?.label ?? marcacion.tipo_fichaje}</span> el {new Date(marcacion.fecha_marcacion).toLocaleDateString("es-ES")} a las {horaFloatAHHMM(marcacion.hora_solicitada)}.</p>
              {marcacion.motivo && <p className="mt-1">Motivo: {marcacion.motivo}</p>}
              <p className="mt-1">Revisa los fichajes de ese día antes de confirmar — la entrada/salida de abajo se crea tal cual las dejes.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="am-checkin">Entrada</Label>
                <input id="am-checkin" type="datetime-local" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-checkout">Salida (opcional)</Label>
                <input id="am-checkout" type="datetime-local" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                <p className="text-xs text-muted-foreground">Vacío = el fichaje queda abierto.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de fichaje</Label>
              <Select value={tipoFichaje} onValueChange={(v) => v && setTipoFichaje(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_FICHAJE.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="am-obs">Observaciones</Label>
              <Textarea id="am-obs" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={aprobar} disabled={guardando}>{guardando ? "Creando…" : "Crear fichaje y aprobar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
