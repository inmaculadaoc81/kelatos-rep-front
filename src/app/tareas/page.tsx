"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AddCircle, SearchNormal1, Clock, TickCircle, Calendar, Refresh2, CloseCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ETIQUETA_ESTADO, type EstadoTarea, type Tarea } from "@/lib/tareas";
import type { Empleado } from "@/app/api/empleados/route";
import { NuevaTareaDialog } from "./nueva-tarea-dialog";
import { TareaDetalleDialog } from "./tarea-detalle-dialog";

const COLUMNAS: { estado: EstadoTarea; icono: typeof Clock; clase: string }[] = [
  { estado: "pendiente", icono: Clock, clase: "border-t-amber-400" },
  { estado: "en_progreso", icono: Refresh2, clase: "border-t-sky-400" },
  { estado: "finalizada", icono: TickCircle, clase: "border-t-emerald-400" },
];

function fmt(f: string | null) {
  if (!f) return "";
  return new Date(f + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function TarjetaTarea({ tarea, nombreAsignado, onClick }: { tarea: Tarea; nombreAsignado: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full space-y-2 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <p className="text-sm font-medium leading-snug">{tarea.titulo}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3" />
          {fmt(tarea.fechaInicio)}{tarea.fechaFin ? ` → ${fmt(tarea.fechaFin)}` : ""}
        </div>
        {tarea.numNotas > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tarea.numNotas} nota{tarea.numNotas !== 1 ? "s" : ""}</span>
        )}
      </div>
      {nombreAsignado && (
        <div className="flex items-center gap-1.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
            {iniciales(nombreAsignado)}
          </span>
          <span className="truncate text-xs text-muted-foreground">{nombreAsignado}</span>
        </div>
      )}
    </button>
  );
}

export default function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroAsignado, setFiltroAsignado] = useState("");
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [tareaAbiertaId, setTareaAbiertaId] = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/tareas");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setTareas(data.tareas as Tarea[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    fetch("/api/empleados").then((r) => r.json()).then((d) => { if (d.ok) setEmpleados(d.empleados as Empleado[]); }).catch(() => {});
  }, []);

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

  function actualizarEnLista(tarea: Tarea) {
    setTareas((prev) => {
      const existe = prev.some((t) => t.id === tarea.id);
      return existe ? prev.map((t) => (t.id === tarea.id ? tarea : t)) : [tarea, ...prev];
    });
  }
  function quitarDeLista(id: number) {
    setTareas((prev) => prev.filter((t) => t.id !== id));
  }

  const hayFiltros = !!(busqueda || filtroAsignado);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Tareas</h1>
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
