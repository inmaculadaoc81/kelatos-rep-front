"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { TablaRuns } from "@/components/agentes-v2/componentes";
import { fechaHoraLarga, type DetalleDepartamento, type EstadoDepartamento } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";
import { PestanaAnalitica, PestanaEstrategia, PestanaHorario } from "./bloques-departamento";
import { PestanaSeo, type Tema } from "./seo-tab";
import { SeoAgentes, SeoEstado, describirHorario, type EstadoSeo, type Sistema } from "./seo-vision";

const TEXTO_ESTADO: Record<EstadoDepartamento, string> = {
  active: "Activo: sigue sus horarios.",
  paused: "En pausa: los horarios están guardados pero no se lanzan.",
  disabled: "Desactivado: no se lanza nada.",
  draft: "En preparación: aún no se ha activado.",
};

/** Barra de control: estado del departamento y botón para activarlo, diciendo exactamente qué se activa. */
function ControlDepartamento({ d, sistema, estado, recargar }: { d: DetalleDepartamento; sistema: Sistema | null; estado: EstadoSeo | null; recargar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const activo = d.department.status === "active";
  const horarios = d.schedules.filter((s) => s.enabled);
  const site = ((d.settings.configuration as Record<string, unknown>).site as Record<string, unknown> | undefined) ?? {};
  const maxDia = Number(site.maxPerDay) || 2;
  const maxSemana = Number(site.maxPerWeek) || 5;
  const auto = estado?.publish_mode === "auto";
  const schedulerApagado = sistema ? !sistema.scheduler.active : false;
  const nombreWorkflow = (id: string | null) => d.workflows.find((w) => String(w.id) === String(id))?.name ?? "Ejecución";

  const cambiar = async (status: EstadoDepartamento) => {
    setGuardando(true);
    try {
      await enviarV2("PATCH", `departments/${d.department.key}`, { status });
      toast.success(status === "active" ? "Departamento activado" : status === "paused" ? "Departamento en pausa" : "Departamento desactivado");
      setAbierto(false);
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className={cn("flex flex-wrap items-center gap-3 rounded-lg border p-3.5", activo ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5")}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{TEXTO_ESTADO[d.department.status]}</p>
        <p className="text-xs text-muted-foreground">
          {activo
            ? `Trabaja según su horario: ${horarios.map(describirHorario).join(" · ") || "sin horarios"}.`
            : `Al activarlo se ejecutará: ${horarios.map((h) => `${nombreWorkflow(h.workflow_id)} (${describirHorario(h).toLowerCase()})`).join(" y ") || "nada, no hay horarios"}.`}
        </p>
      </div>
      {activo ? (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={guardando} onClick={() => cambiar("paused")}>Pausar</Button>
          <Button size="sm" variant="ghost" disabled={guardando} onClick={() => cambiar("disabled")}>Desactivar</Button>
        </div>
      ) : (
        <Button size="sm" disabled={guardando} onClick={() => setAbierto(true)}>Activar departamento</Button>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activar SEO local</DialogTitle>
            <DialogDescription>Esto es lo que pasará al activarlo.</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {horarios.map((h) => (
              <li key={h.id ?? h.name}><span className="font-medium">{nombreWorkflow(h.workflow_id)}:</span> {describirHorario(h).toLowerCase()} (hora de Madrid).</li>
            ))}
            <li>Máximo {maxDia} artículos al día y {maxSemana} por semana.</li>
            <li>{auto ? "Cada artículo que supere el validador se publica directamente en el blog, sin pedirte aprobación." : "Cada artículo esperará tu decisión en Aprobaciones antes de publicarse."}</li>
          </ul>
          {schedulerApagado && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs">
              Ojo: el programador del servidor está apagado. El departamento quedará activo, pero no se ejecutará nada por sí solo hasta que se encienda en el servidor. Mientras tanto puedes lanzar tareas a mano desde «Temas».
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)} disabled={guardando}>Cancelar</Button>
            <Button onClick={() => cambiar("active")} disabled={guardando}>{guardando ? "Activando…" : "Activar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Artículos ya publicados, con la fecha y hora de publicación. */
function ArticulosPublicados() {
  const r = useV2<{ ok: boolean; topics: Tema[] }>("seo/topics?status=escrito");
  const lista = r.datos?.topics ?? [];
  return (
    <section>
      <h3 className="mb-1.5 text-sm font-medium">Artículos publicados ({lista.length})</h3>
      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{r.cargando ? "Cargando…" : "Todavía no hay artículos publicados."}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {lista.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 font-medium">{t.title}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{fechaHoraLarga(t.updated_at)}</span>
              {t.article_slug && <a href={`https://automatizacionesn8n.com/blog/${t.article_slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline underline-offset-2">Ver</a>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Vista del departamento SEO en dos columnas: a la izquierda su configuración y contenido, a la derecha los agentes y su actividad. */
export function SeoPanel({ d, recargar }: { d: DetalleDepartamento; recargar: () => void }) {
  const [izquierda, setIzquierda] = useState("estado");
  const [derecha, setDerecha] = useState("agentes");
  const sistema = useV2<Sistema>("system");
  const estado = useV2<EstadoSeo>("seo/status");

  return (
    <div className="space-y-4">
      <ControlDepartamento d={d} sistema={sistema.datos} estado={estado.datos} recargar={recargar} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <Tabs value={izquierda} onValueChange={(v) => setIzquierda(String(v))}>
            <TabsList variant="line" className="mb-3">
              <TabsTrigger value="estado">Estado</TabsTrigger>
              <TabsTrigger value="temas">Temas</TabsTrigger>
              <TabsTrigger value="horario">Horario</TabsTrigger>
              <TabsTrigger value="estrategia">Estrategia</TabsTrigger>
            </TabsList>
            <TabsContent value="estado"><SeoEstado d={d} sistema={sistema.datos} estado={estado.datos} /></TabsContent>
            <TabsContent value="temas"><PestanaSeo d={d} recargarDepartamento={() => { recargar(); estado.recargar(); }} /></TabsContent>
            <TabsContent value="horario"><PestanaHorario d={d} recargar={recargar} /></TabsContent>
            <TabsContent value="estrategia"><PestanaEstrategia key={d.settings.version} d={d} recargar={recargar} /></TabsContent>
          </Tabs>
        </div>
        <div className="min-w-0">
          <Tabs value={derecha} onValueChange={(v) => setDerecha(String(v))}>
            <TabsList variant="line" className="mb-3">
              <TabsTrigger value="agentes">Agentes</TabsTrigger>
              <TabsTrigger value="ejecuciones">Ejecuciones</TabsTrigger>
              <TabsTrigger value="analitica">Analítica</TabsTrigger>
            </TabsList>
            <TabsContent value="agentes"><SeoAgentes d={d} irA={setIzquierda} /></TabsContent>
            <TabsContent value="ejecuciones">
              <TablaRuns
                runs={d.runs}
                onAccion={async (id, a) => {
                  try {
                    await enviarV2("POST", `runs/${id}/${a}`, {});
                    toast.success(a === "cancel" ? "Cancelación solicitada" : "Ejecución reencolada");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
                  }
                  recargar();
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Aquí salen las ejecuciones lanzadas por el horario. Lo que lances a mano con «Buscar temas» o «Escribir un artículo» se sigue en <Link href="/agentes-v2/en-vivo" className="text-primary underline underline-offset-2">En vivo</Link>.
              </p>
            </TabsContent>
            <TabsContent value="analitica" className="space-y-5">
              <ArticulosPublicados />
              <PestanaAnalitica d={d} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
