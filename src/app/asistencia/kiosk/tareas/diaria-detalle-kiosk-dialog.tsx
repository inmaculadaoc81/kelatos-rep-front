"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CloseCircle, TickCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Tarea } from "@/lib/tareas";

function fmt(f: string) {
  return new Date(f + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

/** Detalle de una tarea diaria — "es como una tarea normal pero dentro se
    puede marcar como cumplido y escribir opcionalmente lo que se hizo en
    esa tarea" (petición del usuario, 2026-10-03). Toda la fila de la lista
    abre este diálogo (no hay marcado rápido sin pasar por aquí) — el admin
    ve la nota con su fecha en el detalle de la tarea. */
export function DiariaDetalleKioskDialog({
  tareaId, open, onOpenChange, onCambiada,
}: {
  tareaId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCambiada: (tarea: Tarea) => void;
}) {
  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [cargando, setCargando] = useState(true);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open || !tareaId) return;
    setCargando(true);
    fetch(`/api/asistencia/kiosk/tareas/${tareaId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const t = d.tarea as Tarea;
          setTarea(t);
          const deHoy = t.historialDiaria?.find((h) => h.fecha === new Date().toISOString().slice(0, 10));
          setNota(deHoy?.nota || "");
        } else toast.error(d.error || "Error desconocido");
      })
      .catch(() => toast.error("Error desconocido"))
      .finally(() => setCargando(false));
  }, [open, tareaId]);

  async function marcar(hecha: boolean) {
    if (!tareaId) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/asistencia/kiosk/tareas/${tareaId}/diaria`, {
        method: hecha ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hecha ? { nota: nota.trim() || undefined } : {}),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setTarea(data.tarea as Tarea);
      onCambiada(data.tarea as Tarea);
      toast.success(hecha ? "Marcada como hecha hoy" : "Desmarcada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
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
                <TickCircle className="mt-0.5 size-4 shrink-0" />
                {tarea.titulo}
              </DialogTitle>
              <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => onOpenChange(false)}>
                <CloseCircle className="size-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {tarea.descripcion && <p className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground">{tarea.descripcion}</p>}

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">¿Qué has hecho hoy? (opcional)</p>
                <Textarea rows={3} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Opcional" />
                <Button className="w-full gap-1.5" onClick={() => marcar(true)} disabled={guardando}>
                  <TickCircle className="size-4" />
                  {tarea.hechaHoy ? "Guardar nota" : "Marcar hecho hoy"}
                </Button>
                {tarea.hechaHoy && (
                  <button type="button" onClick={() => marcar(false)} disabled={guardando} className="w-full text-center text-xs text-muted-foreground hover:text-destructive">
                    Desmarcar hoy
                  </button>
                )}
              </div>

              {tarea.historialDiaria && tarea.historialDiaria.length > 1 && (
                <div className="mt-4 space-y-1.5 border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">Días anteriores</p>
                  {tarea.historialDiaria.filter((h) => h.fecha !== new Date().toISOString().slice(0, 10)).slice(0, 10).map((h) => (
                    <div key={h.fecha} className={cn("rounded-md bg-muted/40 px-3 py-1.5 text-xs")}>
                      <span className="font-medium text-foreground">{fmt(h.fecha)}</span>
                      {h.nota && <span className="text-muted-foreground"> — {h.nota}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
