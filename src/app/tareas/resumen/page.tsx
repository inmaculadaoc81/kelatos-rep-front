"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Chart, Clock, Refresh2, TickCircle, Profile2User, Send2 } from "@/lib/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useTareas } from "../use-tareas";
import { TareaDetalleDialog } from "../tarea-detalle-dialog";
import type { ActividadTarea } from "@/app/api/tareas/actividad/route";

function fmtFechaHora(f: string) {
  return new Date(f).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

/** Cuántas tareas tiene cada persona, por estado — petición del usuario,
    2026-09-29. Se calcula aquí mismo con la lista ya cargada (sin endpoint
    propio: son los mismos datos que ya usa el Tablero, solo agrupados distinto). */
function TarjetaPersona({ nombre, remoto, pendientes, enProgreso, finalizadas }: { nombre: string; remoto: boolean; pendientes: number; enProgreso: number; finalizadas: number }) {
  const total = pendientes + enProgreso + finalizadas;
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{iniciales(nombre)}</span>
        <span className="truncate text-sm font-medium">{nombre}</span>
        {remoto && <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-700 dark:text-violet-400">Remoto</span>}
        <span className="ml-auto text-xs text-muted-foreground">{total} en total</span>
      </div>
      <div className="flex gap-1.5">
        {pendientes > 0 && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">{pendientes} pendiente{pendientes !== 1 ? "s" : ""}</span>}
        {enProgreso > 0 && <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-400">{enProgreso} en progreso</span>}
        {finalizadas > 0 && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">{finalizadas} finalizada{finalizadas !== 1 ? "s" : ""}</span>}
        {total === 0 && <span className="text-xs text-muted-foreground">Sin tareas</span>}
      </div>
    </div>
  );
}

export default function ResumenTareasPage() {
  const { tareas, empleados, cargando, actualizarEnLista, quitarDeLista } = useTareas();
  const [actividad, setActividad] = useState<ActividadTarea[]>([]);
  const [cargandoActividad, setCargandoActividad] = useState(true);
  const [tareaAbiertaId, setTareaAbiertaId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/tareas/actividad")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setActividad(d.actividad as ActividadTarea[]); })
      .catch(() => {})
      .finally(() => setCargandoActividad(false));
  }, []);

  const empleadoPorEmail = useMemo(() => {
    const m = new Map<string, (typeof empleados)[number]>();
    for (const e of empleados) if (e.email) m.set(e.email, e);
    return m;
  }, [empleados]);

  // Una fila por persona con al menos una tarea, más "Sin asignar" si aplica —
  // no se listan empleados sin ninguna tarea todavía, para no llenar la vista
  // de tarjetas vacías.
  const porPersona = useMemo(() => {
    const grupos = new Map<string, { nombre: string; remoto: boolean; pendientes: number; enProgreso: number; finalizadas: number }>();
    for (const t of tareas) {
      const clave = t.asignadoA || "__sin_asignar__";
      const emp = t.asignadoA ? empleadoPorEmail.get(t.asignadoA) : undefined;
      const nombre = emp?.nombre || t.asignadoA || "Sin asignar";
      if (!grupos.has(clave)) grupos.set(clave, { nombre, remoto: emp?.trabajaRemoto === true, pendientes: 0, enProgreso: 0, finalizadas: 0 });
      const g = grupos.get(clave)!;
      if (t.estado === "pendiente") g.pendientes++;
      else if (t.estado === "en_progreso") g.enProgreso++;
      else g.finalizadas++;
    }
    return [...grupos.values()].sort((a, b) => (b.pendientes + b.enProgreso + b.finalizadas) - (a.pendientes + a.enProgreso + a.finalizadas));
  }, [tareas, empleadoPorEmail]);

  const totales = useMemo(() => ({
    pendiente: tareas.filter((t) => t.estado === "pendiente").length,
    en_progreso: tareas.filter((t) => t.estado === "en_progreso").length,
    finalizada: tareas.filter((t) => t.estado === "finalizada").length,
  }), [tareas]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Resumen</h1>
        <p className="text-sm text-muted-foreground">De un vistazo: quién tiene qué, y qué ha pasado últimamente.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600"><Clock className="size-5" /></span>
          <div><p className="text-lg font-bold">{totales.pendiente}</p><p className="text-xs text-muted-foreground">Pendientes</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600"><Refresh2 className="size-5" /></span>
          <div><p className="text-lg font-bold">{totales.en_progreso}</p><p className="text-xs text-muted-foreground">En progreso</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600"><TickCircle className="size-5" /></span>
          <div><p className="text-lg font-bold">{totales.finalizada}</p><p className="text-xs text-muted-foreground">Finalizadas</p></div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Profile2User className="size-4" /> Carga por persona</h2>
          {cargando ? (
            <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : porPersona.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay ninguna tarea creada.</p>
          ) : (
            <div className="space-y-2">
              {porPersona.map((p) => (<TarjetaPersona key={p.nombre} {...p} />))}
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Chart className="size-4" /> Actividad reciente</h2>
          {cargandoActividad ? (
            <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          ) : actividad.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay ningún avance ni tarea finalizada.</p>
          ) : (
            <div className="space-y-2">
              {actividad.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTareaAbiertaId(a.tareaId)}
                  className="flex w-full items-start gap-2.5 rounded-lg border bg-card p-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <span className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    a.tipo === "finalizada" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
                  )}>
                    {a.tipo === "finalizada" ? <TickCircle className="size-3.5" /> : <Send2 className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.tipo === "finalizada" ? "Marcada como finalizada" : a.detalle}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70">{fmtFechaHora(a.momento)}{a.creadoPor ? ` · ${a.creadoPor}` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

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
