"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AddCircle, SearchNormal1, Clock, TickCircle, Refresh2, CloseCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ETIQUETA_ESTADO, type EstadoTarea, type Tarea } from "@/lib/tareas";
import { useTareas } from "./use-tareas";
import { TarjetaTarea } from "./tarjeta-tarea";
import { NuevaTareaDialog } from "./nueva-tarea-dialog";
import { TareaDetalleDialog } from "./tarea-detalle-dialog";

const COLUMNAS: { estado: EstadoTarea; icono: typeof Clock; clase: string }[] = [
  { estado: "pendiente", icono: Clock, clase: "border-t-amber-400" },
  { estado: "en_progreso", icono: Refresh2, clase: "border-t-sky-400" },
  { estado: "finalizada", icono: TickCircle, clase: "border-t-emerald-400" },
];

export default function TareasPage() {
  const { tareas, empleados, cargando, error, cargar, actualizarEnLista, quitarDeLista } = useTareas();
  const [busqueda, setBusqueda] = useState("");
  const [filtroAsignado, setFiltroAsignado] = useState("");
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [tareaAbiertaId, setTareaAbiertaId] = useState<number | null>(null);

  const nombrePorEmail = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of empleados) if (e.email) m.set(e.email, e.nombre);
    return m;
  }, [empleados]);

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return tareas.filter((tarea) => {
      const textoOk = !t || tarea.titulo.toLowerCase().includes(t) || (tarea.descripcion || "").toLowerCase().includes(t);
      const asignadoOk = !filtroAsignado || tarea.asignadoA === filtroAsignado;
      return textoOk && asignadoOk;
    });
  }, [tareas, busqueda, filtroAsignado]);

  const porEstado = useMemo(() => {
    const m: Record<EstadoTarea, Tarea[]> = { pendiente: [], en_progreso: [], finalizada: [] };
    for (const t of filtradas) m[t.estado].push(t);
    return m;
  }, [filtradas]);

  const hayFiltros = !!(busqueda || filtroAsignado);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Tablero</h1>
          <p className="text-sm text-muted-foreground">Qué se ha asignado, a quién, y en qué va.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={cargar} disabled={cargando}>
            <Refresh2 className={cn("size-3.5", cargando && "animate-spin")} /> Actualizar
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setNuevaAbierta(true)}>
            <AddCircle className="size-4" /> Nueva tarea
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <div className="relative min-w-48 flex-1">
          <SearchNormal1 className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por título o descripción..." className="pl-8" />
        </div>
        <Select value={filtroAsignado || "todos"} onValueChange={(v) => setFiltroAsignado(!v || v === "todos" ? "" : v)}>
          <SelectTrigger className="w-auto min-w-40"><SelectValue>{(v: string) => (v && v !== "todos" ? nombrePorEmail.get(v) || v : "Asignado: Todos")}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Asignado: Todos</SelectItem>
            {empleados.map((e) => (<SelectItem key={e.empleadoId} value={e.email || e.nombre}>{e.nombre}</SelectItem>))}
          </SelectContent>
        </Select>
        {hayFiltros && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => { setBusqueda(""); setFiltroAsignado(""); }}>
            <CloseCircle className="size-3.5" /> Limpiar
          </Button>
        )}
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error: {error}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNAS.map(({ estado, icono: Icono, clase }) => (
          <div key={estado} className={cn("flex flex-col gap-3 rounded-xl border-t-4 bg-muted/20 p-3", clase)}>
            <div className="flex items-center gap-1.5 px-1 text-sm font-semibold">
              <Icono className="size-4" /> {ETIQUETA_ESTADO[estado]}
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{porEstado[estado].length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {cargando ? (
                <><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></>
              ) : porEstado[estado].length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">Sin tareas aquí.</p>
              ) : (
                porEstado[estado].map((tarea) => (
                  <TarjetaTarea
                    key={tarea.id}
                    tarea={tarea}
                    nombreAsignado={tarea.asignadoA ? (nombrePorEmail.get(tarea.asignadoA) || tarea.asignadoA) : null}
                    onClick={() => setTareaAbiertaId(tarea.id)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <NuevaTareaDialog open={nuevaAbierta} onOpenChange={setNuevaAbierta} empleados={empleados} onCreada={actualizarEnLista} />
      <TareaDetalleDialog
        tareaId={tareaAbiertaId}
        open={tareaAbiertaId !== null}
        onOpenChange={(o) => !o && setTareaAbiertaId(null)}
        empleados={empleados}
        onCambiada={actualizarEnLista}
        onEliminada={quitarDeLista}
      />
    </div>
  );
}
