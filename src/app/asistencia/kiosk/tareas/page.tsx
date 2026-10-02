"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Add, ClipboardTick, Send2, TickCircle } from "@/lib/icons";
import { COLOR_PRIORIDAD, ETIQUETA_ESTADO, type EstadoTarea, type Tarea } from "@/lib/tareas";
import type { InformeDiario } from "@/lib/informes";
import { cn } from "@/lib/utils";

const POLL_MS = 30000;

/** Pestaña "Mis tareas" del kiosco: solo lo propio (asignado a mí +
    autoasignado), separado en Diarias (checklist que se reinicia solo cada
    día) y Tareas normales (mismo flujo de 3 estados que /tareas) — más el
    informe de texto libre del día. Petición del usuario, 2026-10-03. */
export default function MisTareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);

  const [informe, setInforme] = useState<InformeDiario | null>(null);
  const [mios, setMios] = useState<InformeDiario[]>([]);
  const [texto, setTexto] = useState("");
  const [guardandoInforme, setGuardandoInforme] = useState(false);

  const [nuevaAbierta, setNuevaAbierta] = useState(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const [rT, rI] = await Promise.all([fetch("/api/asistencia/kiosk/tareas"), fetch("/api/asistencia/kiosk/informe")]);
      const [dT, dI] = await Promise.all([rT.json(), rI.json()]);
      if (dT.ok) setTareas(dT.tareas as Tarea[]);
      if (dI.ok) {
        setInforme(dI.informe as InformeDiario | null);
        setMios(dI.mios as InformeDiario[]);
        if (dI.informe) setTexto((dI.informe as InformeDiario).texto);
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

  async function alternarDiaria(t: Tarea) {
    try {
      const res = await fetch(`/api/asistencia/kiosk/tareas/${t.id}/diaria`, { method: t.hechaHoy ? "DELETE" : "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setTareas((prev) => prev.map((x) => (x.id === t.id ? (data.tarea as Tarea) : x)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function cambiarEstado(t: Tarea, estado: EstadoTarea) {
    try {
      const res = await fetch(`/api/asistencia/kiosk/tareas/${t.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setTareas((prev) => prev.map((x) => (x.id === t.id ? (data.tarea as Tarea) : x)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function guardarInforme() {
    if (!texto.trim()) return toast.error("Escribe algo antes de guardar");
    setGuardandoInforme(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/informe", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: texto.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setInforme(data.informe as InformeDiario);
      toast.success("Informe guardado");
      cargar(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardandoInforme(false);
    }
  }

  if (cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const diarias = tareas.filter((t) => t.esDiaria);
  const normales = tareas.filter((t) => !t.esDiaria);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ClipboardTick className="size-4" /> Mis tareas
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNuevaAbierta(true)}>
          <Add className="size-4" /> Nueva
        </Button>
      </div>

      {diarias.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Diarias</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {diarias.map((t) => (
              <label key={t.id} className="flex items-start gap-2.5 rounded-md border px-3 py-2 text-sm">
                <Checkbox checked={t.hechaHoy} onCheckedChange={() => alternarDiaria(t)} className="mt-0.5" />
                <span className={cn(t.hechaHoy && "text-muted-foreground line-through")}>{t.titulo}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Tareas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {normales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tienes ninguna tarea asignada.</p>
          ) : (
            normales.map((t) => (
              <div key={t.id} className="space-y-1.5 rounded-md border px-3 py-2">
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", COLOR_PRIORIDAD[t.prioridad])} />
                  <p className="flex-1 text-sm font-medium">{t.titulo}</p>
                </div>
                {t.descripcion && <p className="pl-3.5 text-xs text-muted-foreground">{t.descripcion}</p>}
                <div className="pl-3.5">
                  <Select value={t.estado} onValueChange={(v) => v && cambiarEstado(t, v as EstadoTarea)}>
                    <SelectTrigger className="h-7 w-auto min-w-36 text-xs"><SelectValue>{(v: string) => ETIQUETA_ESTADO[v as EstadoTarea] || v}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_progreso">En progreso</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Informe de hoy</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Qué has hecho hoy?" />
          <Button size="sm" className="gap-1.5" onClick={guardarInforme} disabled={guardandoInforme}>
            <Send2 className="size-3.5" /> {guardandoInforme ? "Guardando…" : informe ? "Actualizar" : "Guardar"}
          </Button>
          {mios.length > 1 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">Ver informes anteriores ({mios.length - 1})</summary>
              <div className="mt-2 space-y-2">
                {mios.slice(1).map((m) => (
                  <div key={m.id} className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="mb-0.5 font-medium text-foreground">{new Date(m.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</p>
                    <p className="whitespace-pre-wrap">{m.texto}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      <NuevaTareaKioskDialog open={nuevaAbierta} onOpenChange={setNuevaAbierta} onCreada={() => { setNuevaAbierta(false); cargar(true); }} />
    </div>
  );
}

function NuevaTareaKioskDialog({ open, onOpenChange, onCreada }: { open: boolean; onOpenChange: (o: boolean) => void; onCreada: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [esDiaria, setEsDiaria] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function limpiar() {
    setTitulo(""); setDescripcion(""); setEsDiaria(false);
  }

  async function crear() {
    if (!titulo.trim()) return toast.error("El título es obligatorio");
    setEnviando(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/tareas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: titulo.trim(), descripcion: descripcion.trim() || undefined, esDiaria }),
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
        <DialogTitle className="flex items-center gap-2"><TickCircle className="size-4.5" /> Nueva tarea</DialogTitle>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ktTitulo">Título *</Label>
            <Input id="ktTitulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ktDescripcion">Descripción</Label>
            <Textarea id="ktDescripcion" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional" />
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
