"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Add, ClipboardTick, Message } from "@/lib/icons";
import { COLOR_PRIORIDAD, ETIQUETA_ESTADO, type EstadoTarea, type Tarea } from "@/lib/tareas";
import type { InformeDiario } from "@/lib/informes";
import { EtiquetasInput } from "@/app/tareas/etiquetas-input";
import { TareaDetalleKioskDialog } from "./tarea-detalle-kiosk-dialog";
import { DiariaDetalleKioskDialog } from "./diaria-detalle-kiosk-dialog";
import { InformeDialog } from "./informe-dialog";

const POLL_MS = 30000;

const COLOR_ESTADO: Record<EstadoTarea, string> = {
  pendiente: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  en_progreso: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  finalizada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

/** Pestaña "Mis tareas" del kiosco: solo lo propio (asignado a mí +
    autoasignado), separado en Diarias (checklist que se reinicia solo cada
    día) y Tareas normales — más el informe de texto libre del día.

    Rediseño 2026-10-03 (feedback real sobre la primera versión, que se
    quedaba larga con muchas tareas): la lista de "Tareas" oculta las
    finalizadas por defecto (con un filtro para verlas si hace falta), cada
    fila es compacta (sin descripción ni selector de estado inline — se
    abren en un diálogo al tocar la fila) y el informe del día vive detrás
    de un botón corto en vez de una tarjeta siempre abierta. */
export default function MisTareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [soloActivas, setSoloActivas] = useState(true);

  const [informe, setInforme] = useState<InformeDiario | null>(null);
  const [mios, setMios] = useState<InformeDiario[]>([]);
  const [informeAbierto, setInformeAbierto] = useState(false);

  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [diariaId, setDiariaId] = useState<number | null>(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const [rT, rI] = await Promise.all([fetch("/api/asistencia/kiosk/tareas"), fetch("/api/asistencia/kiosk/informe")]);
      const [dT, dI] = await Promise.all([rT.json(), rI.json()]);
      if (dT.ok) setTareas(dT.tareas as Tarea[]);
      if (dI.ok) {
        setInforme(dI.informe as InformeDiario | null);
        setMios(dI.mios as InformeDiario[]);
      }
    } catch {
      // silencioso — se reintenta en el siguiente poll
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(() => cargar(true), POLL_MS);
    return () => clearInterval(t);
  }, [cargar]);

  function actualizarTareaLocal(t: Tarea) {
    setTareas((prev) => prev.map((x) => (x.id === t.id ? t : x)));
  }

  if (cargando) {
    return (
      <div className="space-y-3">
        <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const diarias = tareas.filter((t) => t.esDiaria);
  const normales = tareas.filter((t) => !t.esDiaria && (!soloActivas || t.estado !== "finalizada"));
  const hayFinalizadas = tareas.some((t) => !t.esDiaria && t.estado === "finalizada");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ClipboardTick className="size-4" /> Mis tareas
        </h2>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setInformeAbierto(true)}>
            <Message className="size-3.5" /> {informe ? "Informe ✓" : "Informe de hoy"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNuevaAbierta(true)}>
            <Add className="size-4" /> Nueva
          </Button>
        </div>
      </div>

      {diarias.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Diarias</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {diarias.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => setDiariaId(t.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDiariaId(t.id); } }}
                className="flex items-start gap-2.5 rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
              >
                <Checkbox checked={t.hechaHoy} className="pointer-events-none mt-0.5" tabIndex={-1} />
                <span className={cn("line-clamp-1 min-w-0 flex-1", t.hechaHoy && "text-muted-foreground line-through")}>{t.titulo}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Tareas</CardTitle>
          {hayFinalizadas && (
            <div className="flex items-center gap-0.5 rounded-full border p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSoloActivas(true)}
                className={cn("rounded-full px-2 py-0.5 font-medium", soloActivas ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                Activas
              </button>
              <button
                type="button"
                onClick={() => setSoloActivas(false)}
                className={cn("rounded-full px-2 py-0.5 font-medium", !soloActivas ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                Todas
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-1.5">
          {normales.length === 0 ? (
            <p className="text-sm text-muted-foreground">{soloActivas ? "No tienes ninguna tarea activa." : "No tienes ninguna tarea asignada."}</p>
          ) : (
            normales.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDetalleId(t.id)}
                className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/40"
              >
                <span className={cn("size-1.5 shrink-0 rounded-full", COLOR_PRIORIDAD[t.prioridad])} />
                <span className="min-w-0 flex-1 truncate font-medium">{t.titulo}</span>
                {t.numNotas > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground">
                    <Message className="size-3" /> {t.numNotas}
                  </span>
                )}
                <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium", COLOR_ESTADO[t.estado])}>
                  {ETIQUETA_ESTADO[t.estado]}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <NuevaTareaKioskDialog open={nuevaAbierta} onOpenChange={setNuevaAbierta} onCreada={() => { setNuevaAbierta(false); cargar(true); }} />
      <TareaDetalleKioskDialog tareaId={detalleId} open={detalleId !== null} onOpenChange={(o) => !o && setDetalleId(null)} onCambiada={actualizarTareaLocal} />
      <DiariaDetalleKioskDialog tareaId={diariaId} open={diariaId !== null} onOpenChange={(o) => !o && setDiariaId(null)} onCambiada={actualizarTareaLocal} />
      <InformeDialog
        open={informeAbierto}
        onOpenChange={setInformeAbierto}
        informe={informe}
        mios={mios}
        onGuardado={(nuevo) => { setInforme(nuevo); cargar(true); }}
      />
    </div>
  );
}

function NuevaTareaKioskDialog({ open, onOpenChange, onCreada }: { open: boolean; onOpenChange: (o: boolean) => void; onCreada: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [esDiaria, setEsDiaria] = useState(false);
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  function limpiar() {
    setTitulo(""); setDescripcion(""); setEsDiaria(false); setEtiquetas([]);
  }

  async function crear() {
    if (!titulo.trim()) return toast.error("El título es obligatorio");
    setEnviando(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/tareas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: titulo.trim(), descripcion: descripcion.trim() || undefined, esDiaria, etiquetas }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Tarea creada");
      limpiar();
      onCreada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle className="flex items-center gap-2"><ClipboardTick className="size-4.5" /> Nueva tarea</DialogTitle>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ktTitulo">Título *</Label>
            <Input id="ktTitulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ktDescripcion">Descripción</Label>
            <Textarea id="ktDescripcion" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-1.5">
            <Label>Etiquetas</Label>
            <EtiquetasInput valor={etiquetas} onChange={setEtiquetas} sugerenciasUrl="/api/asistencia/kiosk/tareas/etiquetas" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={esDiaria} onCheckedChange={(c) => setEsDiaria(c === true)} />
            Es diaria (se repite cada día)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={crear} disabled={enviando}>{enviando ? "Creando..." : "Crear"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
