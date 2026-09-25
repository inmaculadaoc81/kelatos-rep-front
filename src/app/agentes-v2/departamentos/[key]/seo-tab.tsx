"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { CargandoFilas, ErrorCaja, Kpi, Vacio } from "@/components/agentes-v2/componentes";
import type { DetalleDepartamento } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

type EstadoTema = "propuesto" | "aprobado" | "en_curso" | "escrito" | "descartado";

interface Tema {
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

/** Temas y artículos del departamento SEO: backlog de temas, búsqueda y redacción bajo demanda y modo de publicación. */
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

  // Avisa cuando una tarea en segundo plano termina
  const [vistas, setVistas] = useState<Record<string, string>>({});
  useEffect(() => {
    const j = estado.datos?.jobs;
    if (!j) return;
    for (const clave of ["discover", "write"] as const) {
      const t = j[clave];
      if (!t || t.state === "running" || !t.finished_at || vistas[clave] === t.finished_at) continue;
      setVistas((v) => ({ ...v, [clave]: t.finished_at as string }));
      if (t.state === "error") toast.error(t.error || "La tarea falló");
      else if (clave === "discover") toast.success(`Búsqueda terminada: ${(t.result as { propuestos?: number })?.propuestos ?? 0} temas nuevos`);
      else toast.success((t.result as { mode?: string })?.mode === "auto" ? "Artículo escrito y publicado en el blog" : "Artículo escrito: espera tu aprobación");
      recargarTemas();
    }
  }, [estado.datos, vistas, recargarTemas]);

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Temas propuestos" valor={String(counts.propuesto ?? 0)} sub="esperan turno" cargando={temas.cargando && !temas.datos} />
        <Kpi titulo="Priorizados" valor={String(counts.aprobado ?? 0)} sub="se escriben primero" cargando={temas.cargando && !temas.datos} />
        <Kpi titulo="En curso" valor={String(counts.en_curso ?? 0)} sub="redactándose ahora" cargando={temas.cargando && !temas.datos} />
        <Kpi titulo="Publicados" valor={String(counts.escrito ?? 0)} sub="artículos en el blog" cargando={temas.cargando && !temas.datos} />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Publicar automáticamente</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {auto
                  ? "Cada artículo que supere el validador se guarda directamente en el blog, sin pasar por Aprobaciones."
                  : "Cada artículo espera tu decisión en Aprobaciones antes de publicarse."}
              </p>
            </div>
            <Switch checked={!!auto} disabled={cambiandoModo || !estado.datos} onCheckedChange={cambiarModo} />
          </div>
          <p className="text-xs text-muted-foreground">
            Antes de publicar, el validador comprueba título, descripción, estructura, palabra clave, enlaces, que esté en español y que no repita ningún artículo existente.
          </p>
        </div>
        <div className="space-y-2 rounded-lg border p-4 text-sm">
          <p className="font-medium">Conexión con el blog</p>
          {estado.error && <ErrorCaja mensaje={estado.error} />}
          {gh ? (
            gh.ok ? (
              <p className="text-muted-foreground">
                Conectado a <span className="font-medium text-foreground">{gh.repository}</span> (rama {gh.branch}){gh.can_push ? ", con permiso de escritura." : ", pero SIN permiso de escritura."}
              </p>
            ) : (
              <p className="text-red-700">{gh.configured ? `GitHub no responde bien: ${gh.error ?? "error"}` : "Falta el token de GitHub en el servidor."}</p>
            )
          ) : (
            <p className="text-muted-foreground">Comprobando…</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" disabled={trabajando} onClick={() => lanzar("seo/discover")}>
              {estado.datos?.jobs.discover?.state === "running" ? "Buscando temas…" : "Buscar temas ahora"}
            </Button>
            <Button size="sm" disabled={trabajando || (counts.propuesto ?? 0) + (counts.aprobado ?? 0) === 0} onClick={() => lanzar("seo/write")}>
              {estado.datos?.jobs.write?.state === "running" ? "Escribiendo…" : "Escribir un artículo ahora"}
            </Button>
          </div>
          {trabajando && (
            <p className="text-xs text-muted-foreground">
              Trabajando en segundo plano: puedes seguir usando el panel. <Link href="/agentes-v2/en-vivo" className="text-primary underline underline-offset-2">Ver cómo trabaja la IA en vivo</Link>
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Temas</h2>
          <div className="flex flex-wrap gap-1.5">
            {FILTROS.map((f) => (
              <button key={f || "todos"} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", filtro === f ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
                {f ? `${ETIQUETA[f]} (${counts[f] ?? 0})` : "Todos"}
              </button>
            ))}
          </div>
        </div>
        {temas.error && <ErrorCaja mensaje={temas.error} />}
        {temas.cargando && !temas.datos ? (
          <CargandoFilas />
        ) : !temas.datos || temas.datos.topics.length === 0 ? (
          <Vacio titulo="Todavía no hay temas" texto="Pulsa «Buscar temas ahora»: el departamento lee sus fuentes y propone temas nuevos del nicho, sin repetir lo ya publicado." />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tema</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {temas.datos.topics.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="max-w-[28rem]">
                      <p className="truncate text-sm font-medium" title={t.title}>{t.title}</p>
                      <p className="truncate text-xs text-muted-foreground" title={t.angle ?? undefined}>{t.keyword}{t.source_url ? <> · <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t.source_name || "fuente"}</a></> : null}</p>
                    </TableCell>
                    <TableCell className="text-sm">{t.kind === "noticia" ? "Noticia" : "Guía"}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{t.score}</TableCell>
                    <TableCell>
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", COLOR[t.status])}>{ETIQUETA[t.status]}</span>
                      {t.article_slug ? <a href={`https://automatizacionesn8n.com/blog/${t.article_slug}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-primary underline underline-offset-2">ver</a> : null}
                      {t.status === "en_curso" && t.approval_id ? <Link href="/agentes-v2/aprobaciones" className="ml-2 text-xs text-primary underline underline-offset-2">Ver el artículo pendiente</Link> : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {t.status === "propuesto" && <button type="button" className="mr-3 text-xs text-primary hover:underline" onClick={() => cambiarTema(t.id, "aprobado")}>Priorizar</button>}
                      {(t.status === "propuesto" || t.status === "aprobado") && <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => cambiarTema(t.id, "descartado")}>Descartar</button>}
                      {t.status === "aprobado" && <button type="button" className="ml-3 text-xs text-muted-foreground hover:underline" onClick={() => cambiarTema(t.id, "propuesto")}>Quitar prioridad</button>}
                      {t.status === "descartado" && <button type="button" className="text-xs text-primary hover:underline" onClick={() => cambiarTema(t.id, "propuesto")}>Recuperar</button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
