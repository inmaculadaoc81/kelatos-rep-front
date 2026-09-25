"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import { fechaHoraLarga, type DetalleDepartamento } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

type EstadoTema = "propuesto" | "aprobado" | "en_curso" | "escrito" | "descartado";

export interface Tema {
  id: string;
  title: string;
  keyword: string;
  kind: "guia" | "noticia";
  angle: string | null;
  source_name: string | null;
  source_url: string | null;
  status: EstadoTema;
  score: number;
  article_slug: string | null;
  approval_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Tarea {
  state: "running" | "done" | "error";
  started_at: string;
  finished_at: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
}

interface Estado {
  ok: boolean;
  github: { configured: boolean; ok?: boolean; repository?: string; can_push?: boolean; branch?: string; error?: string };
  publish_mode: "auto" | "approval";
  counts: Record<string, number>;
  jobs: { discover?: Tarea; write?: Tarea };
}

const ETIQUETA: Record<EstadoTema, string> = { propuesto: "Propuesto", aprobado: "Priorizado", en_curso: "En curso", escrito: "Publicado", descartado: "Descartado" };
const COLOR: Record<EstadoTema, string> = {
  propuesto: "bg-slate-500/10 text-slate-600",
  aprobado: "bg-blue-500/10 text-blue-700",
  en_curso: "bg-amber-500/10 text-amber-700",
  escrito: "bg-green-500/10 text-green-700",
  descartado: "bg-slate-500/10 text-slate-400",
};
const FILTROS: ("" | EstadoTema)[] = ["", "propuesto", "aprobado", "en_curso", "escrito", "descartado"];

/** Fecha que acompaña al estado del tema: cuándo se publicó, se descartó o se movió por última vez. */
function fechaEstado(t: Tema): string | null {
  if (t.status === "escrito") return `Publicado ${fechaHoraLarga(t.updated_at)}`;
  if (t.status === "descartado") return `Descartado ${fechaHoraLarga(t.updated_at)}`;
  if (t.status === "en_curso") return `En curso desde ${fechaHoraLarga(t.updated_at)}`;
  if (t.status === "aprobado") return `Priorizado ${fechaHoraLarga(t.updated_at)}`;
  return null;
}

/** Temas del departamento SEO: lista de temas, lanzamiento manual y modo de publicación. */
export function PestanaSeo({ d, recargarDepartamento }: { d: DetalleDepartamento; recargarDepartamento: () => void }) {
  const [filtro, setFiltro] = useState<"" | EstadoTema>("");
  const temas = useV2<{ ok: boolean; topics: Tema[]; counts: Record<string, number> }>(`seo/topics${filtro ? `?status=${filtro}` : ""}`);
  const estado = useV2<Estado>("seo/status");
  const [cambiandoModo, setCambiandoModo] = useState(false);

  const trabajando = estado.datos?.jobs.discover?.state === "running" || estado.datos?.jobs.write?.state === "running";
  const recargarEstado = estado.recargar;
  const recargarTemas = temas.recargar;
  useEffect(() => {
    if (!trabajando) return;
    const t = setInterval(() => { recargarEstado(); recargarTemas(); }, 4000);
    return () => clearInterval(t);
  }, [trabajando, recargarEstado, recargarTemas]);

  // Avisa solo de las tareas que terminan mientras miras el panel. La primera carga solo memoriza las ya terminadas
  // (el servidor conserva el resultado de la última tarea y, si no, se volvería a anunciar cada vez que se abre la pestaña).
  const vistas = useRef<Record<string, string> | null>(null);
  useEffect(() => {
    const j = estado.datos?.jobs;
    if (!j) return;
    const previas = vistas.current;
    const actuales: Record<string, string> = {};
    for (const clave of ["discover", "write"] as const) {
      const t = j[clave];
      if (t && t.state !== "running" && t.finished_at) actuales[clave] = t.finished_at;
    }
    vistas.current = { ...(previas ?? {}), ...actuales };
    if (previas === null) return;
    for (const clave of ["discover", "write"] as const) {
      const t = j[clave];
      if (!t || !actuales[clave] || previas[clave] === actuales[clave]) continue;
      if (t.state === "error") toast.error(t.error || "La tarea falló");
      else if (clave === "discover") toast.success(`Búsqueda terminada: ${(t.result as { propuestos?: number })?.propuestos ?? 0} temas nuevos`);
      else toast.success((t.result as { mode?: string })?.mode === "auto" ? "Artículo escrito y publicado en el blog" : "Artículo escrito: espera tu aprobación");
      recargarTemas();
    }
  }, [estado.datos, recargarTemas]);

  const lanzar = async (ruta: "seo/discover" | "seo/write") => {
    try {
      await enviarV2("POST", ruta, {});
      toast.info(ruta === "seo/discover" ? "Buscando temas… puede tardar unos 3 minutos." : "Escribiendo el artículo… puede tardar varios minutos.");
      estado.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo lanzar la tarea");
    }
  };

  const cambiarTema = async (id: string, status: EstadoTema) => {
    try {
      await enviarV2("PATCH", `seo/topics/${id}`, { status });
      temas.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el tema");
    }
  };

  const auto = estado.datos?.publish_mode === "auto";
  const cambiarModo = async (nuevoAuto: boolean) => {
    setCambiandoModo(true);
    try {
      const conf = d.settings.configuration as Record<string, unknown>;
      const site = (conf.site as Record<string, unknown>) || {};
      await enviarV2("PUT", "departments/local_seo/settings", { configuration: { ...conf, site: { ...site, publishMode: nuevoAuto ? "auto" : "approval" } } });
      toast.success(nuevoAuto ? "Los artículos se publicarán solos, sin pedirte aprobación" : "Los artículos pasarán por Aprobaciones antes de publicarse");
      estado.recargar();
      recargarDepartamento();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el modo");
    } finally {
      setCambiandoModo(false);
    }
  };

  const counts = temas.datos?.counts ?? estado.datos?.counts ?? {};
  const gh = estado.datos?.github;
  const sinTemas = (counts.propuesto ?? 0) + (counts.aprobado ?? 0) === 0;

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-lg border p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Publicar sin pedir aprobación</p>
            <p className="text-xs text-muted-foreground">{auto ? "Sí: los artículos validados van directos al blog." : "No: cada artículo espera tu decisión en Aprobaciones."}</p>
          </div>
          <Switch checked={!!auto} disabled={cambiandoModo || !estado.datos} onCheckedChange={cambiarModo} aria-label="Publicar sin pedir aprobación" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={trabajando} onClick={() => lanzar("seo/discover")} title="Lee las fuentes y añade temas nuevos (unos 3 min)">
            {estado.datos?.jobs.discover?.state === "running" ? "Buscando temas…" : "Buscar temas ahora"}
          </Button>
          <Button size="sm" disabled={trabajando || sinTemas} onClick={() => lanzar("seo/write")} title="Toma el mejor tema y lo escribe (unos 5 min)">
            {estado.datos?.jobs.write?.state === "running" ? "Escribiendo…" : "Escribir un artículo ahora"}
          </Button>
          {trabajando && <Link href="/agentes-v2/en-vivo" className="text-xs text-primary underline underline-offset-2">Ver en vivo</Link>}
        </div>
        {estado.error && <ErrorCaja mensaje={estado.error} />}
        <p className={cn("text-xs", gh && !gh.ok ? "text-red-700" : "text-muted-foreground")}>
          {gh ? (gh.ok ? `Blog: ${gh.repository} (${gh.branch})${gh.can_push ? "" : " · SIN permiso de escritura"}` : gh.configured ? `GitHub no responde bien: ${gh.error ?? "error"}` : "Falta el token de GitHub en el servidor.") : "Comprobando la conexión con el blog…"}
        </p>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button key={f || "todos"} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)} className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", filtro === f ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
              {f ? `${ETIQUETA[f]} (${counts[f] ?? 0})` : "Todos"}
            </button>
          ))}
        </div>
        {temas.error && <ErrorCaja mensaje={temas.error} />}
        {temas.cargando && !temas.datos ? (
          <CargandoFilas />
        ) : !temas.datos || temas.datos.topics.length === 0 ? (
          <Vacio titulo="Todavía no hay temas" texto="Pulsa «Buscar temas ahora»: el departamento lee sus fuentes y propone temas nuevos del nicho, sin repetir lo ya publicado." />
        ) : (
          <ul className="divide-y rounded-lg border">
            {temas.datos.topics.map((t) => {
              const f = fechaEstado(t);
              return (
                <li key={t.id} className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-sm font-medium" title={t.angle ?? undefined}>{t.title}</p>
                    <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-medium", COLOR[t.status])}>{ETIQUETA[t.status]}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.kind === "noticia" ? "Noticia" : "Guía"} · {t.score} pts · {t.keyword}
                    {t.source_url ? <> · <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t.source_name || "fuente"}</a></> : null}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                    <span className="tabular-nums text-muted-foreground">Creado {fechaHoraLarga(t.created_at)}</span>
                    {f && <span className="tabular-nums text-muted-foreground">{f}</span>}
                    <span className="ml-auto flex items-center gap-3">
                      {t.article_slug && <a href={`https://automatizacionesn8n.com/blog/${t.article_slug}`} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Ver artículo</a>}
                      {t.status === "en_curso" && t.approval_id && <Link href="/agentes-v2/aprobaciones" className="text-primary underline underline-offset-2">Ver el artículo pendiente</Link>}
                      {t.status === "propuesto" && <button type="button" className="text-primary hover:underline" onClick={() => cambiarTema(t.id, "aprobado")} title="Se escribirá antes que el resto">Priorizar</button>}
                      {(t.status === "propuesto" || t.status === "aprobado") && <button type="button" className="text-muted-foreground hover:underline" onClick={() => cambiarTema(t.id, "descartado")} title="Lo saca de la cola">Descartar</button>}
                      {t.status === "aprobado" && <button type="button" className="text-muted-foreground hover:underline" onClick={() => cambiarTema(t.id, "propuesto")}>Quitar prioridad</button>}
                      {t.status === "descartado" && <button type="button" className="text-primary hover:underline" onClick={() => cambiarTema(t.id, "propuesto")}>Recuperar</button>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
