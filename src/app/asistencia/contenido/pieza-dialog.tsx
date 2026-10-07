"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CloseCircle, Trash, Add, Video } from "@/lib/icons";
import { colorDeRed, ESTADOS, REDES, TIPOS, aInputFechaHora, etiquetaDe, type Empleado, type EstadoPieza, type Necesidad, type Pieza, type RedSocial, type Subtarea, type TipoPieza } from "@/lib/contenido";

const SIN_VALOR = "__ninguno__";

interface Borrador {
  titulo: string;
  estado: EstadoPieza;
  fechaLimite: string;
  tipo: TipoPieza | "";
  redSocial: RedSocial | "";
  descripcion: string;
  enlaceSubida: string;
  programadaPara: string;
}

function aBorrador(p: Pieza): Borrador {
  return {
    titulo: p.titulo,
    estado: p.estado,
    fechaLimite: p.fechaLimite ?? "",
    tipo: p.tipo ?? "",
    redSocial: p.redSocial ?? "",
    descripcion: p.descripcion ?? "",
    enlaceSubida: p.enlaceSubida ?? "",
    programadaPara: aInputFechaHora(p.programadaPara),
  };
}

/** Detalle y edición de una pieza de contenido, con sus subtareas. */
export function PiezaDialog({
  piezaId, open, onOpenChange, onCambiada,
}: {
  piezaId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCambiada: () => void;
}) {
  const [pieza, setPieza] = useState<Pieza | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [subtareas, setSubtareas] = useState<Subtarea[]>([]);
  const [necesidades, setNecesidades] = useState<Necesidad[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [nuevaNecesidad, setNuevaNecesidad] = useState("");
  const [responsableNecesidad, setResponsableNecesidad] = useState("");
  const [nuevaSubtarea, setNuevaSubtarea] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open || !piezaId) return;
    let activo = true;
    fetch(`/api/asistencia/kiosk/contenido/${piezaId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!activo) return;
        if (!d.ok) return toast.error(d.error || "Error desconocido");
        const p = d.pieza as Pieza;
        setPieza(p);
        setBorrador(aBorrador(p));
        setSubtareas(p.subtareas ?? []);
        setNecesidades(p.necesidades ?? []);
      })
      .catch(() => toast.error("Error desconocido"));
    return () => {
      activo = false;
    };
  }, [open, piezaId]);

  useEffect(() => {
    if (!open) return;
    let activo = true;
    fetch("/api/asistencia/kiosk/contenido/empleados")
      .then((r) => r.json())
      .then((d) => { if (activo && d.ok) setEmpleados(d.empleados as Empleado[]); })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [open]);

  function cambiar<K extends keyof Borrador>(clave: K, valor: Borrador[K]) {
    setBorrador((b) => (b ? { ...b, [clave]: valor } : b));
  }

  async function guardar() {
    if (!piezaId || !borrador) return;
    if (!borrador.titulo.trim()) return toast.error("El título es obligatorio");
    setGuardando(true);
    try {
      const res = await fetch(`/api/asistencia/kiosk/contenido/${piezaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: borrador.titulo.trim(),
          estado: borrador.estado,
          fecha_limite: borrador.fechaLimite || null,
          tipo: borrador.tipo || null,
          red_social: borrador.redSocial || null,
          descripcion: borrador.descripcion.trim() || null,
          enlace_subida: borrador.enlaceSubida.trim() || null,
          programada_para: borrador.programadaPara ? new Date(borrador.programadaPara).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Cambios guardados");
      onCambiada();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!piezaId || !window.confirm("¿Eliminar esta pieza y sus subtareas?")) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/asistencia/kiosk/contenido/${piezaId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pieza eliminada");
      onCambiada();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  async function marcarSubtarea(sub: Subtarea, hecha: boolean) {
    setSubtareas((lista) => lista.map((s) => (s.id === sub.id ? { ...s, hecha } : s)));
    try {
      const res = await fetch(`/api/asistencia/kiosk/contenido/subtareas/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hecha }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      onCambiada();
    } catch (e) {
      setSubtareas((lista) => lista.map((s) => (s.id === sub.id ? { ...s, hecha: !hecha } : s)));
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function quitarSubtarea(sub: Subtarea) {
    try {
      const res = await fetch(`/api/asistencia/kiosk/contenido/subtareas/${sub.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setSubtareas((lista) => lista.filter((s) => s.id !== sub.id));
      onCambiada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function agregarSubtarea() {
    if (!piezaId || !nuevaSubtarea.trim()) return;
    try {
      const res = await fetch(`/api/asistencia/kiosk/contenido/${piezaId}/subtareas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: nuevaSubtarea.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setSubtareas((lista) => [...lista, data.subtarea as Subtarea]);
      setNuevaSubtarea("");
      onCambiada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function pedirNecesidad() {
    if (!piezaId) return;
    if (!nuevaNecesidad.trim() || !responsableNecesidad) return toast.error("Describe el recurso y elige a quién se lo pides");
    try {
      const res = await fetch(`/api/asistencia/kiosk/contenido/${piezaId}/necesidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion: nuevaNecesidad.trim(), responsableId: Number(responsableNecesidad) }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setNecesidades((data.pieza as Pieza).necesidades ?? []);
      setNuevaNecesidad("");
      toast.success("Pedido enviado: aparece en sus Mis tareas");
      onCambiada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function quitarNecesidad(n: Necesidad) {
    try {
      const res = await fetch(`/api/asistencia/kiosk/contenido/necesidades/${n.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setNecesidades((data.pieza as Pieza).necesidades ?? []);
      onCambiada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        {!pieza || !borrador ? (
          <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
                <Video className="size-4 text-primary" /> Pieza de contenido
              </DialogTitle>
              <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => onOpenChange(false)}>
                <CloseCircle className="size-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {(() => {
                  const estadoActual = ESTADOS.find((e) => e.valor === borrador.estado);
                  return estadoActual && (
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", estadoActual.color)}>{estadoActual.etiqueta}</span>
                  );
                })()}
                {borrador.redSocial && (
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", colorDeRed(borrador.redSocial as RedSocial))}>
                    {REDES.find((r) => r.valor === borrador.redSocial)?.etiqueta}
                  </span>
                )}
                {borrador.tipo && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {TIPOS.find((t) => t.valor === borrador.tipo)?.etiqueta}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pzTitulo">Título *</Label>
                <Input id="pzTitulo" value={borrador.titulo} onChange={(e) => cambiar("titulo", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pzEstado">Estado</Label>
                  <Select value={borrador.estado} onValueChange={(v) => v && cambiar("estado", v as EstadoPieza)}>
                    <SelectTrigger id="pzEstado" className="w-full">
                      <SelectValue>{(v: string) => etiquetaDe(ESTADOS, v as EstadoPieza)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((x) => <SelectItem key={x.valor} value={x.valor}>{x.etiqueta}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pzFecha">Fecha límite</Label>
                  <Input id="pzFecha" type="date" value={borrador.fechaLimite} onChange={(e) => cambiar("fechaLimite", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pzTipo">Tipo</Label>
                  <Select value={borrador.tipo || SIN_VALOR} onValueChange={(v) => cambiar("tipo", (v && v !== SIN_VALOR ? v : "") as TipoPieza | "")}>
                    <SelectTrigger id="pzTipo" className="w-full">
                      <SelectValue>{(v: string) => (v === SIN_VALOR ? "—" : etiquetaDe(TIPOS, v as TipoPieza))}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SIN_VALOR}>—</SelectItem>
                      {TIPOS.map((x) => <SelectItem key={x.valor} value={x.valor}>{x.etiqueta}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pzRed">Red social</Label>
                  <Select value={borrador.redSocial || SIN_VALOR} onValueChange={(v) => cambiar("redSocial", (v && v !== SIN_VALOR ? v : "") as RedSocial | "")}>
                    <SelectTrigger id="pzRed" className="w-full">
                      <SelectValue>{(v: string) => (v === SIN_VALOR ? "—" : etiquetaDe(REDES, v as RedSocial))}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SIN_VALOR}>—</SelectItem>
                      {REDES.map((x) => <SelectItem key={x.valor} value={x.valor}>{x.etiqueta}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pzDescripcion">Motivo</Label>
                <Textarea id="pzDescripcion" rows={4} value={borrador.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pzSubida">Enlace para subir la pieza</Label>
                <Input id="pzSubida" value={borrador.enlaceSubida} onChange={(e) => cambiar("enlaceSubida", e.target.value)} placeholder="https://…" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pzProgramada">Fecha y hora de programación</Label>
                <Input id="pzProgramada" type="datetime-local" value={borrador.programadaPara} onChange={(e) => cambiar("programadaPara", e.target.value)} />
              </div>

              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Subtareas</p>
                  {subtareas.length > 0 && (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {subtareas.filter((s) => s.hecha).length}/{subtareas.length}
                    </span>
                  )}
                </div>
                {subtareas.length === 0 && <p className="text-xs text-muted-foreground">Sin subtareas todavía.</p>}
                {subtareas.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-sm shadow-sm">
                    <Checkbox checked={s.hecha} onCheckedChange={(c) => marcarSubtarea(s, c === true)} />
                    <span className={s.hecha ? "min-w-0 flex-1 truncate text-muted-foreground line-through" : "min-w-0 flex-1 truncate"}>{s.titulo}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => quitarSubtarea(s)} title="Quitar subtarea">
                      <Trash className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input value={nuevaSubtarea} onChange={(e) => setNuevaSubtarea(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarSubtarea(); } }} placeholder="Nueva subtarea" />
                  <Button variant="outline" size="icon" onClick={agregarSubtarea} title="Añadir subtarea">
                    <Add className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground">Recursos que necesito de otros</p>
                {necesidades.length === 0 && <p className="text-xs text-muted-foreground">Nada pedido todavía.</p>}
                {necesidades.map((n) => (
                  <div key={n.id} className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-sm shadow-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{n.descripcion}</span>
                      <span className="block text-[11px] text-muted-foreground">{n.responsableNombre ?? "Sin asignar"}</span>
                    </span>
                    <span className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                      n.recibido ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    )}>
                      {n.recibido ? "Recibido" : "Pendiente"}
                    </span>
                    <Button variant="ghost" size="icon-sm" onClick={() => quitarNecesidad(n)} title="Quitar recurso">
                      <Trash className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="space-y-2 rounded-lg border bg-muted/40 p-2.5">
                  <Input value={nuevaNecesidad} onChange={(e) => setNuevaNecesidad(e.target.value)} placeholder="Qué necesitas (p. ej. el vídeo del cliente)" />
                  <div className="flex items-center gap-2">
                    <Select value={responsableNecesidad || SIN_VALOR} onValueChange={(v) => setResponsableNecesidad(v && v !== SIN_VALOR ? v : "")}>
                      <SelectTrigger className="min-w-0 flex-1">
                        <SelectValue>{(v: string) => (v === SIN_VALOR ? "¿Quién lo tiene?" : empleados.find((e) => String(e.id) === v)?.nombre ?? v)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SIN_VALOR} disabled>¿Quién lo tiene?</SelectItem>
                        {[...empleados].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((x) => (
                          <SelectItem key={x.id} value={String(x.id)}>{x.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={pedirNecesidad}>Pedir</Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
              <Button variant="ghost" className="text-destructive" onClick={eliminar} disabled={guardando}>Eliminar</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>Cancelar</Button>
                <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
