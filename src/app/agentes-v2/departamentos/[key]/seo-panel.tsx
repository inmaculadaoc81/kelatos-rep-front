"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enviarV2 } from "@/components/agentes-v2/use-v2";
import { TablaRuns } from "@/components/agentes-v2/componentes";
import { fechaHoraLarga, type DetalleDepartamento, type EstadoDepartamento, type Horario } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";
import { PestanaAnalitica, PestanaEstrategia, PestanaHorario } from "./bloques-departamento";
import { Actividad } from "./seo-actividad";
import { ListaTemas } from "./seo-tab";
import { SeoAgentes, describirHorario, proximaOcurrencia } from "./seo-vision";
import { useSeo, type Tema } from "./use-seo";

type Seo = ReturnType<typeof useSeo>;

const TEXTO_ESTADO: Record<EstadoDepartamento, string> = {
  active: "Activo: trabaja según su horario.",
  paused: "En pausa: los horarios están guardados pero no se lanza nada.",
  disabled: "Desactivado: no se lanza nada.",
  draft: "Todavía sin activar.",
};

const nombreWorkflow = (d: DetalleDepartamento, id: string | null) => d.workflows.find((w) => String(w.id) === String(id))?.name ?? "Ejecución";
const horariosDe = (d: DetalleDepartamento, clave: string): Horario[] => {
  const wf = d.workflows.find((w) => w.key === clave);
  return d.schedules.filter((s) => s.enabled && wf && String(s.workflow_id) === String(wf.id));
};

/** Barra de control: estado del departamento, botón para activarlo (diciendo qué se activa) y lo que falta para que trabaje solo. */
function ControlDepartamento({ d, seo, recargar }: { d: DetalleDepartamento; seo: Seo; recargar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const activo = d.department.status === "active";
  const horarios = d.schedules.filter((s) => s.enabled);
  const site = ((d.settings.configuration as Record<string, unknown>).site as Record<string, unknown> | undefined) ?? {};
  const maxDia = Number(site.maxPerDay) || 2;
  const maxSemana = Number(site.maxPerWeek) || 5;
  const schedulerApagado = seo.sistema ? !seo.sistema.scheduler.active : false;
  const gh = seo.estado?.github;
  const sinBlog = !!gh && !(gh.ok && gh.can_push);

  const faltas: string[] = [];
  if (schedulerApagado) faltas.push("el programador del servidor está apagado, así que no se lanzará nada solo");
  if (sinBlog) faltas.push("no hay permiso de escritura en el blog");

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
    <section className={cn("rounded-lg border p-3.5", activo ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5")}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{TEXTO_ESTADO[d.department.status]}</p>
          <p className="text-xs text-muted-foreground">
            {activo
              ? horarios.map((h) => `${nombreWorkflow(d, h.workflow_id)}: ${describirHorario(h).toLowerCase()}`).join(" · ")
              : `Al activarlo se ejecutará: ${horarios.map((h) => `${nombreWorkflow(d, h.workflow_id)} (${describirHorario(h).toLowerCase()})`).join(" y ") || "nada, no hay horarios"}.`}
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
      </div>
      {faltas.length > 0 && (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
          <span className="font-medium">Ojo:</span> {faltas.join("; ")}.
        </p>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activar SEO local</DialogTitle>
            <DialogDescription>Esto es lo que pasará al activarlo.</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {horarios.map((h) => (
              <li key={h.id ?? h.name}><span className="font-medium">{nombreWorkflow(d, h.workflow_id)}:</span> {describirHorario(h).toLowerCase()} (hora de Madrid).</li>
            ))}
            <li>Máximo {maxDia} artículos al día y {maxSemana} por semana.</li>
            <li>{seo.auto ? "Cada artículo que supere el validador se publica directamente en el blog, sin pedirte aprobación." : "Cada artículo esperará tu decisión en Aprobaciones antes de publicarse."}</li>
          </ul>
          {schedulerApagado && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs">
              Ojo: el programador del servidor está apagado. El departamento quedará activo, pero no se ejecutará nada por sí solo hasta que se encienda en el servidor. Mientras tanto puedes lanzar cada etapa a mano.
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

function Etapa({ n, titulo, agente, tipo, numero, unidad, lineas, ocupada, children }: {
  n: number; titulo: string; agente: string; tipo: "IA" | "Código"; numero: number; unidad: string; lineas: string[]; ocupada?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-3", ocupada && "border-primary/40")}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{n}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{titulo}</p>
            <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", tipo === "IA" ? "bg-violet-500/10 text-violet-700" : "bg-slate-500/10 text-slate-600")}>{tipo}</span>
            <span className="ml-auto text-xs text-muted-foreground">{agente}</span>
          </div>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl leading-none font-semibold tabular-nums">{numero}</span>
            <span className="text-sm text-muted-foreground">{unidad}</span>
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
            {lineas.map((l) => <li key={l}>{l}</li>)}
          </ul>
          <div className="mt-2.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Flecha() {
  return <span aria-hidden className="flex items-center justify-center text-base leading-none text-muted-foreground">↓</span>;
}

/** El recorrido de un artículo en tres etapas, con el número de elementos de cada una, su próxima ejecución y su botón. */
function Recorrido({ d, seo }: { d: DetalleDepartamento; seo: Seo }) {
  const activo = d.department.status === "active";
  const prox = (clave: string): string => {
    const h = horariosDe(d, clave)[0];
    const t = h ? proximaOcurrencia(h) : null;
    return t ? `Próxima automática: ${t}${activo ? "" : " (cuando se active)"}` : "Sin ejecución programada";
  };
  const enCola = (seo.counts.propuesto ?? 0) + (seo.counts.aprobado ?? 0);
  const ultimaBusqueda = seo.temas.reduce<string | null>((m, t) => (!m || t.created_at > m ? t.created_at : m), null);
  const publicados = seo.temas.filter((t: Tema) => t.status === "escrito");
  const ultimoPublicado = publicados.reduce<string | null>((m, t) => (!m || t.updated_at > m ? t.updated_at : m), null);

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Así trabaja: de la idea al artículo publicado</h2>
      <div className="flex flex-col gap-1">
        <Etapa n={1} titulo="Buscar temas" agente="Investigador de temas" tipo="IA" numero={enCola} unidad="ideas en cola" ocupada={seo.buscando}
          lineas={[`Última búsqueda: ${fechaHoraLarga(ultimaBusqueda)}`, prox("descubrimiento_temas")]}>
          <Button size="sm" variant="outline" disabled={seo.trabajando} onClick={() => seo.lanzar("seo/discover")} title="Lee las fuentes y añade temas nuevos (unos 3 min)">
            {seo.buscando ? "Buscando temas…" : "Buscar temas ahora"}
          </Button>
        </Etapa>
        <Flecha />
        <Etapa n={2} titulo="Escribir el artículo" agente="Redactor SEO" tipo="IA" numero={seo.counts.en_curso ?? 0} unidad="escribiéndose o por aprobar" ocupada={seo.escribiendo}
          lineas={["Tarda unos 5 minutos por artículo", prox("contenido_seo")]}>
          <Button size="sm" disabled={seo.trabajando || enCola === 0} onClick={() => seo.lanzar("seo/write")} title="Toma el mejor tema y lo escribe (unos 5 min)">
            {seo.escribiendo ? "Escribiendo…" : "Escribir un artículo ahora"}
          </Button>
        </Etapa>
        <Flecha />
        <Etapa n={3} titulo="Publicar en la web" agente="Publicador del blog" tipo="Código" numero={publicados.length} unidad="artículos publicados"
          lineas={[`Último: ${fechaHoraLarga(ultimoPublicado)}`, seo.auto ? "Se publican solos, sin pedirte aprobación" : "Cada artículo espera tu aprobación"]}>
          <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Aprobación de artículos">
            {[{ v: false, t: "Los apruebo yo" }, { v: true, t: "Publicar solo" }].map((o) => (
              <button
                key={o.t}
                type="button"
                aria-pressed={seo.auto === o.v}
                disabled={seo.cambiandoModo || seo.auto === null}
                onClick={() => seo.cambiarModo(o.v)}
                className={cn("rounded px-2.5 py-1 text-xs transition-colors", seo.auto === o.v ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {o.t}
              </button>
            ))}
          </div>
        </Etapa>
      </div>
      {seo.trabajando && (
        <p className="mt-2 text-xs text-muted-foreground">
          Trabajando en segundo plano; puedes seguir usando el panel. <Link href="/agentes-v2/en-vivo" className="text-primary underline underline-offset-2">Ver cómo trabaja la IA en vivo</Link>
        </p>
      )}
      {seo.errorEstado && <p className="mt-2 text-xs text-red-700">{seo.errorEstado}</p>}
    </section>
  );
}

/** Artículos ya publicados, con la fecha y hora de publicación. */
function ArticulosPublicados({ temas }: { temas: Tema[] }) {
  const lista = temas.filter((t) => t.status === "escrito").sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return (
    <section>
      <h3 className="mb-1.5 text-sm font-medium">Artículos publicados ({lista.length})</h3>
      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Todavía no hay artículos publicados.</p>
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

/** Vista del departamento SEO: arriba el estado y el recorrido de un artículo; debajo, en dos columnas, la lista y ajustes a la izquierda y la actividad y los agentes a la derecha. */
export function SeoPanel({ d, recargar, cabecera }: { d: DetalleDepartamento; recargar: () => void; cabecera: React.ReactNode }) {
  const [izquierda, setIzquierda] = useState("temas");
  const [derecha, setDerecha] = useState("actividad");
  const seo = useSeo(d, recargar);

  return (
    <div className="-m-6 grid items-stretch lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-2">
      <div className="min-w-0 space-y-5 p-6">
        {cabecera}
        <ControlDepartamento d={d} seo={seo} recargar={recargar} />
        <Tabs value={izquierda} onValueChange={(v) => setIzquierda(String(v))}>
          <TabsList variant="line" className="mb-3">
            <TabsTrigger value="temas">Temas</TabsTrigger>
            <TabsTrigger value="horario">Horario</TabsTrigger>
            <TabsTrigger value="estrategia">Estrategia</TabsTrigger>
          </TabsList>
            <TabsContent value="temas">
              <ListaTemas temas={seo.temas} counts={seo.counts} cargando={seo.cargandoTemas} error={seo.errorTemas} onCambiar={seo.cambiarTema} />
            </TabsContent>
            <TabsContent value="horario"><PestanaHorario d={d} recargar={recargar} /></TabsContent>
            <TabsContent value="estrategia"><PestanaEstrategia key={d.settings.version} d={d} recargar={recargar} modo="seo" /></TabsContent>
          </Tabs>
        </div>
        <div className="min-w-0 space-y-5 border-t p-6 lg:border-t-0 lg:border-l">
          <Recorrido d={d} seo={seo} />
          <Tabs value={derecha} onValueChange={(v) => setDerecha(String(v))}>
            <TabsList variant="line" className="mb-3">
              <TabsTrigger value="actividad">Actividad</TabsTrigger>
              <TabsTrigger value="agentes">Agentes</TabsTrigger>
              <TabsTrigger value="ejecuciones">Ejecuciones</TabsTrigger>
              <TabsTrigger value="analitica">Analítica</TabsTrigger>
            </TabsList>
            <TabsContent value="actividad"><Actividad temas={seo.temas} d={d} /></TabsContent>
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
                Aquí salen las ejecuciones lanzadas por el horario. Lo que lances a mano se sigue en <Link href="/agentes-v2/en-vivo" className="text-primary underline underline-offset-2">En vivo</Link>.
              </p>
            </TabsContent>
            <TabsContent value="analitica" className="space-y-5">
              <ArticulosPublicados temas={seo.temas} />
              <PestanaAnalitica d={d} />
            </TabsContent>
          </Tabs>
        </div>
    </div>
  );
}
