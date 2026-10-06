"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CloseCircle, Send2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TickCircle } from "@/lib/icons";
import type { InformeDiario } from "@/lib/informes";
import type { Tarea } from "@/lib/tareas";

/** Informe de texto libre del día — antes era una tarjeta siempre abierta
    al fondo de la página (demasiado sitio para algo que se usa una vez al
    día); ahora vive detrás de un botón corto ("+ Informe de hoy" / "✓
    Informe de hoy" si ya está guardado) — petición del usuario, 2026-10-03.
    Arriba lista las tareas diarias completadas hoy (petición del usuario,
    2026-10-06). */
export function InformeDialog({
  open, onOpenChange, informe, mios, diariasHechasHoy, onGuardado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  informe: InformeDiario | null;
  mios: InformeDiario[];
  diariasHechasHoy: Tarea[];
  onGuardado: (informe: InformeDiario) => void;
}) {
  const [texto, setTexto] = useState(informe?.texto || "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!texto.trim()) return toast.error("Escribe algo antes de guardar");
    setGuardando(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/informe", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: texto.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      onGuardado(data.informe as InformeDiario);
      toast.success("Informe guardado");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) setTexto(informe?.texto || ""); onOpenChange(o); }}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 p-0 sm:max-w-md" showCloseButton={false}>
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <DialogTitle className="text-sm font-semibold">Informe de hoy</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => onOpenChange(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-4 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Diarias completadas hoy</p>
            {diariasHechasHoy.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ninguna todavía.</p>
            ) : (
              diariasHechasHoy.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-1.5 text-sm">
                  <TickCircle className="size-4 shrink-0 text-emerald-600" />
                  <span className="min-w-0 truncate">{t.titulo}</span>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2">
            <Textarea rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Qué has hecho hoy?" autoFocus />
            <Button className="w-full gap-1.5" onClick={guardar} disabled={guardando}>
              <Send2 className="size-3.5" /> {guardando ? "Guardando…" : informe ? "Actualizar" : "Guardar"}
            </Button>
          </div>
          {mios.length > 1 && (
            <div className="mt-4 space-y-2 border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground">Informes anteriores</p>
              {mios.slice(1).map((m) => (
                <div key={m.id} className="rounded-md bg-muted/40 px-3 py-2 text-xs">
                  <p className="mb-0.5 font-medium text-foreground">{new Date(m.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{m.texto}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
