"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ClipboardTick, CloseCircle, Send2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ETIQUETA_ESTADO, type EstadoTarea, type Tarea } from "@/lib/tareas";

const COLOR_ESTADO: Record<EstadoTarea, string> = {
  pendiente: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  en_progreso: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  finalizada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

function fmt(f: string) {
  return new Date(f + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

/** Detalle de una tarea propia (no diaria) dentro del kiosco — cambiar
    estado y apuntar avances de progreso, mismo mecanismo que usa el admin
    en tarea-detalle-dialog.tsx pero simplificado (sin reasignar ni editar
    título/etiquetas: eso se gestiona desde /tareas). Petición del usuario,
    2026-10-03: "en cada tarea que se pueda poner mensajes sobre el
    progreso así como en la vista de administrador". */
export function TareaDetalleKioskDialog({
  tareaId, open, onOpenChange, onCambiada,
}: {
  tareaId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCambiada: (tarea: Tarea) => void;
}) {
  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [nuevaNota, setNuevaNota] = useState("");
  const [enviandoNota, setEnviandoNota] = useState(false);

  useEffect(() => {
    if (!open || !tareaId) return;
    setCargando(true);
    setNuevaNota("");
    fetch(`/api/asistencia/kiosk/tareas/${tareaId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setTarea(d.tarea as Tarea);
        else toast.error(d.error || "Error desconocido");
      })
      .catch(() => toast.error("Error desconocido"))
      .finally(() => setCargando(false));
  }, [open, tareaId]);

  async function cambiarEstado(estado: EstadoTarea) {
    if (!tareaId) return;
    setCambiandoEstado(true);
    try {
      const res = await fetch(`/api/asistencia/kiosk/tareas/${tareaId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setTarea(data.tarea as Tarea);
      onCambiada(data.tarea as Tarea);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCambiandoEstado(false);
    }
  }

  async function agregarNota() {
    if (!nuevaNota.trim() || !tareaId) return toast.error("Escribe algo antes de guardar");
    setEnviandoNota(true);
    try {
      const res = await fetch(`/api/asistencia/kiosk/tareas/${tareaId}/notas`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: nuevaNota.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setTarea(data.tarea as Tarea);
      onCambiada(data.tarea as Tarea);
      setNuevaNota("");
      toast.success("Avance guardado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviandoNota(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 p-0 sm:max-w-md" showCloseButton={false}>
        {cargando || !tarea ? (
          <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
              <DialogTitle className="flex items-start gap-2 text-sm font-semibold">
                <ClipboardTick className="mt-0.5 size-4 shrink-0" />
                {tarea.titulo}
              </DialogTitle>
              <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => onOpenChange(false)}>
                <CloseCircle className="size-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {tarea.descripcion && <p className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground">{tarea.descripcion}</p>}

              <div className="mb-4 flex items-center gap-2">
                <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium", COLOR_ESTADO[tarea.estado])}>
                  {ETIQUETA_ESTADO[tarea.estado]}
                </span>
                <Select value={tarea.estado} onValueChange={(v) => v && cambiarEstado(v as EstadoTarea)} disabled={cambiandoEstado}>
                  <SelectTrigger className="h-8 w-auto min-w-36 text-xs"><SelectValue>{() => "Cambiar estado"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En progreso</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground">Avances ({tarea.notas?.length ?? tarea.numNotas})</p>
                <div className="flex items-start gap-2">
                  <Textarea rows={2} value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)} placeholder="¿Qué has hecho?" className="flex-1" />
                  <Button size="icon" className="mt-0.5 shrink-0" onClick={agregarNota} disabled={enviandoNota || !nuevaNota.trim()} title="Añadir avance">
                    <Send2 className="size-4" />
                  </Button>
                </div>
                {tarea.notas && tarea.notas.length > 0 ? (
                  <div className="space-y-2 border-l-2 border-dashed pl-3">
                    {tarea.notas.map((n) => (
                      <div key={n.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                        <p className="mb-0.5 text-xs font-medium text-muted-foreground">{fmt(n.fecha)}</p>
                        <p className="whitespace-pre-wrap">{n.texto}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Todavía no hay ningún avance apuntado.</p>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
