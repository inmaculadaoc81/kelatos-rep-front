"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import type { DetalleDepartamento } from "@/lib/agentes-v2";

export type EstadoTema = "propuesto" | "aprobado" | "en_curso" | "escrito" | "descartado";

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

export interface EstadoSeo {
  ok: boolean;
  github: { configured: boolean; ok?: boolean; repository?: string; can_push?: boolean; branch?: string; error?: string };
  publish_mode: "auto" | "approval";
  counts: Record<string, number>;
  jobs: { discover?: Tarea; write?: Tarea };
}

export interface Sistema { ok: boolean; scheduler: { active: boolean } }

/**
 * Todo lo que necesita la vista del departamento SEO en un solo sitio: temas, estado de la conexión con el blog,
 * tareas manuales en marcha y el modo de publicación.
 */
export function useSeo(d: DetalleDepartamento, recargarDepartamento: () => void) {
  const temas = useV2<{ ok: boolean; topics: Tema[]; counts: Record<string, number> }>("seo/topics");
  const estado = useV2<EstadoSeo>("seo/status");
  const sistema = useV2<Sistema>("system");
  const [cambiandoModo, setCambiandoModo] = useState(false);

  const buscando = estado.datos?.jobs.discover?.state === "running";
  const escribiendo = estado.datos?.jobs.write?.state === "running";
  const trabajando = buscando || escribiendo;
  const recargarEstado = estado.recargar;
  const recargarTemas = temas.recargar;

  useEffect(() => {
    if (!trabajando) return;
    const t = setInterval(() => { recargarEstado(); recargarTemas(); }, 4000);
    return () => clearInterval(t);
  }, [trabajando, recargarEstado, recargarTemas]);

  // Avisa solo de las tareas que terminan mientras miras el panel. La primera carga solo memoriza las ya terminadas
  // (el servidor conserva el resultado de la última tarea y, si no, se volvería a anunciar cada vez que se abre la vista).
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

  const auto = estado.datos ? estado.datos.publish_mode === "auto" : null;
  const cambiarModo = async (nuevoAuto: boolean) => {
    if (auto === nuevoAuto) return;
    setCambiandoModo(true);
    try {
      const conf = d.settings.configuration as Record<string, unknown>;
      const site = (conf.site as Record<string, unknown>) || {};
      await enviarV2("PUT", "departments/local_seo/settings", { configuration: { ...conf, site: { ...site, publishMode: nuevoAuto ? "auto" : "approval" } } });
      toast.success(nuevoAuto ? "Los artículos se publicarán solos, sin pedirte aprobación" : "Cada artículo esperará tu aprobación antes de publicarse");
      estado.recargar();
      recargarDepartamento();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el modo");
    } finally {
      setCambiandoModo(false);
    }
  };

  return {
    temas: temas.datos?.topics ?? [],
    cargandoTemas: temas.cargando && !temas.datos,
    errorTemas: temas.error,
    counts: temas.datos?.counts ?? estado.datos?.counts ?? {},
    estado: estado.datos,
    errorEstado: estado.error,
    sistema: sistema.datos,
    buscando,
    escribiendo,
    trabajando,
    auto,
    cambiandoModo,
    lanzar,
    cambiarTema,
    cambiarModo,
    recargar: () => { temas.recargar(); estado.recargar(); sistema.recargar(); },
  };
}
