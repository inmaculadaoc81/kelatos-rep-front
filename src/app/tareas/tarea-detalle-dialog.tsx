"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ClipboardTick, TickCircle, Clock, Trash, CloseCircle, Send2, Calendar } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { EmpleadoTareas } from "@/app/api/tareas/empleados/route";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, type EstadoTarea, type PrioridadTarea, type Tarea } from "@/lib/tareas";
import { EtiquetasInput } from "./etiquetas-input";

function fmt(f: string | null) {
  if (!f) return "-";
  return new Date(f + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

const COLOR_ESTADO: Record<EstadoTarea, string> = {
  pendiente: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  en_progreso: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  finalizada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export function TareaDetalleDialog({
  tareaId, open, onOpenChange, empleados, onCambiada, onEliminada,
}: {
  tareaId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleados: EmpleadoTareas[];
  onCambiada: (tarea: Tarea) => void;
  onEliminada: (id: number) => void;
}) {
  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [asignadoA, setAsignadoA] = useState("");
  const [etiquetas, setEtiquetas] = useState<string[]>([]);

  const [nuevaNota, setNuevaNota] = useState("");
  const [fechaNota, setFechaNota] = useState(new Date().toISOString().slice(0, 10));
  const [enviandoNota, setEnviandoNota] = useState(false);

  const [finalizarAbierto, setFinalizarAbierto] = useState(false);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().slice(0, 10));
  const [notaCierre, setNotaCierre] = useState("");

  async function cargar() {
    if (!tareaId) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/tareas/${tareaId}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      const t = data.tarea as Tarea;
      setTarea(t);
      setTitulo(t.titulo);
      setDescripcion(t.descripcion || "");
      setAsignadoA(t.asignadoA || "");
      setEtiquetas(t.etiquetas);
      setFechaFin(t.fechaFin || new Date().toISOString().slice(0, 10));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (open && tareaId) { cargar(); setFinalizarAbierto(false); setNotaCierre(""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tareaId]);

  async function guardarCampos(cambios: Record<string, unknown>) {
    if (!tareaId) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/tareas/${tareaId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cambios),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setTarea(data.tarea as Tarea);
      onCambiada(data.tarea as Tarea);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  function cambiarEstado(nuevo: EstadoTarea) {
    if (nuevo === "finalizada") { setFinalizarAbierto(true); return; }
    guardarCampos({ estado: nuevo });
  }

  async function confirmarFinalizar() {
    await guardarCampos({ estado: "finalizada", fechaFin, notaCierre: notaCierre.trim() || undefined });
    setFinalizarAbierto(false);
    setNotaCierre("");
  }

  async function agregarNota() {
    if (!nuevaNota.trim() || !tareaId) return toast.error("Escribe algo antes de guardar la nota");
    setEnviandoNota(true);
    try {
      const res = await fetch(`/api/tareas/${tareaId}/notas`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: nuevaNota.trim(), fecha: fechaNota }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setTarea(data.tarea as Tarea);
      onCambiada(data.tarea as Tarea);
      setNuevaNota("");
      toast.success("Nota añadida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviandoNota(false);
    }
  }

  async function eliminar() {
    if (!tareaId) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/tareas/${tareaId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Tarea eliminada");
      onEliminada(tareaId);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEliminando(false);
      setEliminarAbierto(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !guardando && onOpenChange(o)}>
        <DialogContent className="flex max-h-[88vh] w-full flex-col gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
          {cargando || !tarea ? (
            <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 border-b px-5 py-3.5">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <ClipboardTick className="size-4.5 shrink-0" />
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    onBlur={() => titulo.trim() && titulo !== tarea.titulo && guardarCampos({ titulo: titulo.trim() })}
                    className="h-8 border-transparent px-1.5 text-base font-semibold shadow-none hover:border-input focus-visible:border-input"
                  />
                </DialogTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}><CloseCircle className="size-4" /></Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium", COLOR_ESTADO[tarea.estado])}>
                    {tarea.estado === "finalizada" ? <TickCircle className="size-3.5" /> : <Clock className="size-3.5" />}
                    {ETIQUETA_ESTADO[tarea.estado]}
                  </span>
                  <Select value={tarea.estado} onValueChange={(v) => v && cambiarEstado(v as EstadoTarea)}>
                    <SelectTrigger className="h-8 w-auto min-w-40"><SelectValue>{() => "Cambiar estado"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_progreso">En progreso</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={tarea.prioridad} onValueChange={(v) => v && guardarCampos({ prioridad: v })}>
                    <SelectTrigger className="h-8 w-auto min-w-28"><SelectValue>{(v: string) => `Prioridad: ${ETIQUETA_PRIORIDAD[v as PrioridadTarea] || v}`}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" /> Inicio {fmt(tarea.fechaInicio)}
                    {tarea.fechaFin && <> · Fin {fmt(tarea.fechaFin)}</>}
                  </span>
                </div>

                {finalizarAbierto && (
                  <div className="mb-4 space-y-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Marcar como finalizada</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="tFechaFin" className="text-xs">Fecha de fin</Label>
                        <Input id="tFechaFin" type="date" className="h-8" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="tNotaCierre" className="text-xs">Nota de cierre (opcional)</Label>
                      <Textarea id="tNotaCierre" rows={2} value={notaCierre} onChange={(e) => setNotaCierre(e.target.value)} placeholder="¿Qué se hizo al terminar?" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setFinalizarAbierto(false)} disabled={guardando}>Cancelar</Button>
                      <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={confirmarFinalizar} disabled={guardando}>Confirmar</Button>
                    </div>
                  </div>
                )}

                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Asignado a</Label>
                    <Select value={asignadoA || "nadie"} onValueChange={(v) => { const val = !v || v === "nadie" ? "" : v; setAsignadoA(val); guardarCampos({ asignadoA: val || undefined }); }}>
                      <SelectTrigger className="h-9 w-full"><SelectValue>{(v: string) => (v && v !== "nadie" ? empleados.find((e) => e.email === v)?.nombre || v : "Sin asignar")}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nadie">Sin asignar</SelectItem>
                        {empleados.map((e) => (<SelectItem key={e.id} value={e.email || e.nombre}>{e.nombre}{e.trabajaRemoto ? " · Remoto" : ""}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Creada por</Label>
                    <p className="flex h-9 items-center truncate rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">{tarea.creadoPor}</p>
                  </div>
                </div>

                <div className="mb-4 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <Textarea
                    rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                    onBlur={() => descripcion !== (tarea.descripcion || "") && guardarCampos({ descripcion: descripcion.trim() })}
                    placeholder="Sin descripción"
                  />
                </div>

                <div className="mb-5 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Etiquetas</Label>
                  <EtiquetasInput valor={etiquetas} onChange={(v) => { setEtiquetas(v); guardarCampos({ etiquetas: v }); }} sugerenciasUrl="/api/tareas/etiquetas" />
                </div>

                <div className="mb-5 space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={tarea.esDiaria} onCheckedChange={(c) => guardarCampos({ esDiaria: c === true })} />
                    Tarea diaria (se repite cada día, se marca "hecha" desde "Mis tareas" en el kiosco)
                  </label>
                  {tarea.esDiaria && (
                    <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      {tarea.historialDiaria && tarea.historialDiaria.length > 0 ? (
                        <>
                          <p className="mb-1.5 font-medium text-foreground">Últimos días completados</p>
                          <div className="space-y-1">
                            {tarea.historialDiaria.map((d) => (
                              <div key={d.fecha}>
                                <span className="font-medium text-foreground">{fmt(d.fecha)}</span>
                                {d.nota && <span> — {d.nota}</span>}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p>Todavía no se ha marcado hecha ningún día.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Avances ({tarea.notas?.length ?? tarea.numNotas})</Label>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Textarea rows={2} value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)} placeholder="¿Qué se ha hecho hoy?" />
                      <Input type="date" className="h-8 w-40" value={fechaNota} onChange={(e) => setFechaNota(e.target.value)} />
                    </div>
                    <Button size="icon" className="mt-0.5 shrink-0" onClick={agregarNota} disabled={enviandoNota || !nuevaNota.trim()} title="Añadir nota">
                      <Send2 className="size-4" />
                    </Button>
                  </div>

                  {tarea.notas && tarea.notas.length > 0 ? (
                    <div className="space-y-2 border-l-2 border-dashed pl-3">
                      {tarea.notas.map((n) => (
                        <div key={n.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                          <div className="mb-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{fmt(n.fecha)}</span> · {n.creadoPor}
                          </div>
                          <p className="whitespace-pre-wrap">{n.texto}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Todavía no hay ningún avance apuntado.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t bg-muted/50 px-5 py-3">
                <Button variant="ghost" className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setEliminarAbierto(true)}>
                  <Trash className="size-3.5" /> Eliminar tarea
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={eliminarAbierto} onOpenChange={(o) => !eliminando && setEliminarAbierto(o)}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>¿Eliminar esta tarea?</DialogTitle>
          <p className="text-sm text-muted-foreground">Se borrará junto con todos sus avances. No se puede deshacer.</p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEliminarAbierto(false)} disabled={eliminando}>Cancelar</Button>
            <Button variant="destructive" onClick={eliminar} disabled={eliminando}>{eliminando ? "Eliminando..." : "Eliminar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
