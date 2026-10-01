"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorCaja, Kpi } from "@/components/agentes-v2/componentes";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { fechaHoraLarga, type DetalleDepartamento, type EstadoDepartamento, type Horario } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";
import { describirHorario } from "../seo-vision";
import { TipoBadge } from "./campos";
import { NOMBRE_TIPO, useAuto, type JobAuto, type PanelSocial } from "./use-social";

const TEXTO_ESTADO: Record<EstadoDepartamento, string> = {
  active: "Activo: genera carruseles según su horario.",
  paused: "En pausa: los horarios están guardados pero no se genera nada.",
  disabled: "Desactivado: no se genera nada.",
  draft: "Todavía sin activar: solo funciona lo que lances a mano.",
};

const nombreWorkflow = (d: DetalleDepartamento, id: string | null) => d.workflows.find((w) => String(w.id) === String(id))?.name ?? "Ejecución";

function Control({ d, recargar }: { d: DetalleDepartamento; recargar: () => void }) {
  const [guardando, setGuardando] = useState(false);
  const sistema = useV2<{ ok: boolean; scheduler: { active: boolean } }>("system");
  const activo = d.department.status === "active";
  const horarios = d.schedules.filter((h: Horario) => h.enabled);
  const apagado = sistema.datos ? !sistema.datos.scheduler.active : false;
  const cambiar = async (status: EstadoDepartamento) => {
    setGuardando(true);
    try {
      await enviarV2("PATCH", `departments/${d.department.key}`, { status });
      toast.success(status === "active" ? "Departamento activado: ya trabaja solo" : status === "paused" ? "Departamento en pausa" : "Departamento desactivado");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    } finally {
      setGuardando(false);
    }
  };
  return (
    <section className={cn("rounded-lg border p-3.5", activo ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5")}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{TEXTO_ESTADO[d.department.status]}</p>
          <p className="text-xs text-muted-foreground">
            {activo
              ? horarios.map((h) => `${nombreWorkflow(d, h.workflow_id)}: ${describirHorario(h).toLowerCase()}`).join(" · ")
              : `Al activarlo se ejecutará: ${horarios.map((h) => `${nombreWorkflow(d, h.workflow_id)} (${describirHorario(h).toLowerCase()})`).join(" y ") || "nada, no hay horarios"}.`}
          </p>
          {apagado && <p className="mt-1 text-xs text-amber-700">El programador del servidor está apagado: aunque lo actives no se lanzará nada solo.</p>}
        </div>
        {activo ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={guardando} onClick={() => cambiar("paused")}>Pausar</Button>
            <Button size="sm" variant="ghost" disabled={guardando} onClick={() => cambiar("disabled")}>Desactivar</Button>
          </div>
        ) : (
          <Button size="sm" disabled={guardando} onClick={() => cambiar("active")}>Activar</Button>
        )}
      </div>
    </section>
  );
}

/** Avisa cuando termina una tarea lanzada a mano (buscar temas / generar el siguiente). */
function useAvisoTarea(job: JobAuto | null | undefined, ok: (r: unknown) => string) {
  const vigilando = useRef(false);
  useEffect(() => {
    if (!job) return;
    if (job.state === "running") vigilando.current = true;
    else if (vigilando.current) {
      vigilando.current = false;
      if (job.state === "done") toast.success(ok(job.resultado));
      else toast.error(job.error || "La tarea ha fallado");
    }
  }, [job]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Resumen({ d, recargar, ir }: { d: DetalleDepartamento; recargar: () => void; ir: (v: "carruseles" | "temas" | "estrategia" | "horario") => void }) {
  const auto = useAuto();
  const panel = useV2<PanelSocial>("social/panel");
  const [lanzando, setLanzando] = useState<"descubrir" | "producir" | "producir_post" | null>(null);
  const a = auto.datos;

  useAvisoTarea(a?.jobs.descubrir, (r) => { const x = r as { propuestos?: number; duplicados?: number } | null; return x && typeof x.propuestos === "number" ? `${x.propuestos} temas nuevos (${x.duplicados ?? 0} duplicados descartados)` : "Búsqueda de temas terminada"; });
  useAvisoTarea(a?.jobs.producir, (r) => { const x = r as { creado?: boolean; motivo?: string; entrega?: string } | null; return x && x.creado === false ? x.motivo ?? "No se generó nada" : `Carrusel generado. ${x?.entrega ?? ""}`; });
  useAvisoTarea(a?.jobs.producir_diario, (r) => { const x = r as { creado?: boolean; motivo?: string; entrega?: string } | null; return x && x.creado === false ? x.motivo ?? "No se generó nada" : `Post generado. ${x?.entrega ?? ""}`; });

  const RUTA_LANZAR = { descubrir: "social/topics/discover", producir: "social/automation/run-now", producir_post: "social/automation/run-daily-now" } as const;
  const lanzar = async (que: "descubrir" | "producir" | "producir_post") => {
    setLanzando(que);
    try {
      await enviarV2("POST", RUTA_LANZAR[que], {});
      toast.success(que === "descubrir" ? "Buscando temas nuevos (unos 2 minutos)…" : que === "producir" ? "Generando el siguiente carrusel (3-5 minutos)…" : "Generando el siguiente post (3-5 minutos)…");
      await auto.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo lanzar la tarea");
    } finally {
      setLanzando(null);
    }
  };

  const enMarcha = (j?: JobAuto | null) => j?.state === "running";
  const cola = (a?.topics.aprobado ?? 0) + (a?.topics.propuesto ?? 0);
  const totalTipos = Object.values(a?.por_tipo ?? {}).reduce((x, y) => x + y, 0);

  return (
    <div className="space-y-5">
      <Control d={d} recargar={recargar} />
      {auto.error && <ErrorCaja mensaje={auto.error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Carruseles hoy" valor={a ? `${a.hoy} / ${a.limites.dia}` : "—"} sub="automáticos" cargando={!a} />
        <Kpi titulo="Carruseles 7 días" valor={a ? `${a.semana} / ${a.limites.semana}` : "—"} sub="automáticos" cargando={!a} />
        <Kpi titulo="Posts hoy" valor={a ? `${a.hoyPost} / ${a.limitesPost.dia}` : "—"} sub="automáticos" cargando={!a} />
        <Kpi titulo="Posts 7 días" valor={a ? `${a.semanaPost} / ${a.limitesPost.semana}` : "—"} sub="automáticos" cargando={!a} />
        <Kpi titulo="Temas en cola" valor={String(cola)} sub={`${a?.topics.aprobado ?? 0} aprobados · ${a?.topics.propuesto ?? 0} propuestos`} cargando={!a} />
        <Kpi titulo="Carruseles" valor={String(panel.datos?.carruseles.total ?? 0)} sub={`${panel.datos?.carruseles.review ?? 0} en revisión`} cargando={!panel.datos} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={!a || enMarcha(a.jobs.producir) || lanzando !== null} onClick={() => lanzar("producir")}>{enMarcha(a?.jobs.producir) ? "Generando…" : "Generar el siguiente carrusel ahora"}</Button>
        <Button size="sm" disabled={!a || enMarcha(a.jobs.producir_diario) || lanzando !== null} onClick={() => lanzar("producir_post")}>{enMarcha(a?.jobs.producir_diario) ? "Generando…" : "Generar el siguiente post ahora"}</Button>
        <Button size="sm" variant="outline" disabled={!a || enMarcha(a.jobs.descubrir) || lanzando !== null} onClick={() => lanzar("descubrir")}>{enMarcha(a?.jobs.descubrir) ? "Buscando temas…" : "Buscar temas ahora"}</Button>
        <span className="text-xs text-muted-foreground">Sirven para probar sin esperar al horario. Respetan la estrategia y no repiten temas ni tipos seguidos.</span>
      </div>
      {a?.jobs.producir?.state === "error" && <ErrorCaja mensaje={`El último carrusel automático falló: ${a.jobs.producir.error}`} />}
      {a?.jobs.producir_diario?.state === "error" && <ErrorCaja mensaje={`El último post automático falló: ${a.jobs.producir_diario.error}`} />}
      {a?.jobs.descubrir?.state === "error" && <ErrorCaja mensaje={`La última búsqueda de temas falló: ${a.jobs.descubrir.error}`} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Lo que viene</h3>
            <button className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => ir("temas")}>Ver la cola completa</button>
          </div>
          {a && a.proximos.length === 0 && <p className="text-sm text-muted-foreground">No hay temas en la cola. Pulsa «Buscar temas ahora» o añade uno a mano; con la búsqueda automática activada, el sistema los busca solo cada semana.</p>}
          <ol className="space-y-2">
            {a?.proximos.map((p, i) => (
              <li key={p.id} className="flex items-start gap-3 rounded-lg border p-2.5">
                <span className="mt-0.5 w-5 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm leading-snug">{p.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <TipoBadge id={p.tipo} />
                    {p.status === "aprobado" && <span className="text-[11px] text-green-700">Aprobado por ti</span>}
                    {p.fecha && <span className="text-[11px] text-muted-foreground">Previsto: {fechaHoraLarga(p.fecha)}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {a && a.proximos.length > 0 && <p className="text-[11px] text-muted-foreground">Es el orden en que los cogerá el sistema: primero los que apruebes, después los mejor puntuados, alternando siempre el tipo de carrusel.</p>}
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Cómo trabaja</h3>
          {d.workflows.filter((w) => w.key !== "carousel").map((w) => {
            const h = d.schedules.find((s) => String(s.workflow_id) === String(w.id));
            const agentes = d.agents.filter((x) => String(x.workflow_id) === String(w.id));
            return (
              <div key={w.id} className="space-y-1.5 rounded-lg border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{w.name}</p>
                  {h && <span className={cn("text-[11px]", h.enabled ? "text-muted-foreground" : "text-amber-700")}>{h.enabled ? describirHorario(h) : "Horario desactivado"}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{w.description}</p>
                <ul className="space-y-1 pt-0.5">
                  {agentes.map((x) => <li key={x.id} className="text-xs"><span className="font-medium">{x.agent_key.replace(/_/g, " ")}:</span> <span className="text-muted-foreground">{x.role}</span></li>)}
                </ul>
              </div>
            );
          })}
          <button className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => ir("horario")}>Cambiar horarios</button>
        </section>
      </div>

      <section className="space-y-2.5 rounded-lg border p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Tipos de carrusel generados</h3>
          <button className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => ir("estrategia")}>Activar o desactivar tipos</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(a?.tipos ?? []).map((t) => {
            const n = a?.por_tipo[t.id] ?? 0;
            const activo = a?.config.tipos.includes(t.id);
            return (
              <div key={t.id} className={cn("rounded-lg border p-2.5", !activo && "opacity-50")}>
                <p className="text-sm font-medium">{NOMBRE_TIPO[t.id] ?? t.nombre}</p>
                <p className="text-[11px] text-muted-foreground">{activo ? `${n} generado${n === 1 ? "" : "s"}` : "Desactivado"}</p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${totalTipos ? Math.round((n / totalTipos) * 100) : 0}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Estado del sistema</h3>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2"><span className={cn("size-2 rounded-full", panel.datos ? (panel.datos.render.ok ? "bg-green-500" : "bg-red-500") : "bg-muted")} />Dibujado de imágenes: {panel.datos ? (panel.datos.render.ok ? "disponible" : `no disponible (${panel.datos.render.motivo ?? "sin conexión"})`) : "comprobando…"}</li>
          <li className="flex items-center gap-2"><span className="size-2 rounded-full bg-green-500" />Formato: Instagram vertical 1080×1350</li>
          <li className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-muted-foreground/40" />Publicación en redes: la hará tu workflow de n8n con los carruseles aprobados (todavía no conectado)</li>
        </ul>
        <p className="pt-1 text-xs text-muted-foreground">La aprobación de los carruseles es {a?.config.aprobacion === "auto" ? "automática: quedan aprobados nada más generarse" : "manual: cada uno pasa por Aprobaciones antes de darse por bueno"}. Se cambia en Estrategia.</p>
      </section>
    </div>
  );
}
