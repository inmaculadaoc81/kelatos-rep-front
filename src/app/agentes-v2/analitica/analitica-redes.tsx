"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { CargandoFilas, ErrorCaja, Kpi, Vacio } from "@/components/agentes-v2/componentes";
import { fechaHora } from "@/lib/agentes-v2";

interface PublicacionTop {
  media_id: string;
  tipo: string;
  publicado_en: string;
  permalink: string | null;
  caption: string | null;
  origen: "kelatos" | "externo";
  likes: number;
  comentarios: number;
  alcance: number | null;
  guardados: number | null;
  compartidos: number | null;
  interacciones: number;
}

interface Resumen {
  ok: boolean;
  configurado: boolean;
  sincronizado: boolean;
  dias: number;
  actualizado_en?: string;
  usuario?: string | null;
  error?: string | null;
  insights_disponibles?: boolean;
  cuenta?: { seguidores: number | null; siguiendo: number | null; publicaciones_totales: number | null; cambio_seguidores: number | null; desde: string | null; serie: { fecha: string; seguidores: number }[] };
  periodo?: { publicaciones: number; likes: number; comentarios: number; guardados: number | null; compartidos: number | null; alcance: number | null; interacciones: number; tasa_interaccion: number | null; interacciones_por_publicacion: number | null };
  por_tipo?: { tipo: string; publicaciones: number; likes_medios: number; comentarios_medios: number; alcance_medio: number | null }[];
  por_dia?: { dia: string; publicaciones: number; interacciones_medias: number | null }[];
  por_origen?: { origen: "kelatos" | "externo"; publicaciones: number; interacciones_medias: number | null }[];
  mejores?: PublicacionTop[];
}

const NOMBRE_TIPO: Record<string, string> = { reel: "Reels", carrusel: "Carruseles", imagen: "Imágenes", video: "Vídeos" };
const n = (v: number | null | undefined, dec = 0) => (v === null || v === undefined ? "—" : v.toLocaleString("es-ES", { maximumFractionDigits: dec }));
const CONFIG_SEGUIDORES = { seguidores: { label: "Seguidores", color: "#2a6df4" } } satisfies ChartConfig;
const CONFIG_DIAS = { interacciones_medias: { label: "Interacciones medias", color: "#2a9d6f" } } satisfies ChartConfig;

/** Analítica de Instagram de la organización activa (sección de Analítica): seguidores, interacciones, qué tipo de contenido y qué día funcionan mejor. Solo lectura. */
export function AnaliticaRedes({ dias }: { dias: number }) {
  const [actualizando, setActualizando] = useState(false);
  const { datos, error, cargando, recargar } = useV2<Resumen>(`social/analytics/resumen?dias=${dias}`);

  async function actualizar() {
    setActualizando(true);
    try {
      await enviarV2("POST", "social/analytics/sincronizar");
      toast.success("Datos de Instagram actualizados");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setActualizando(false);
    }
  }

  const serie = (datos?.cuenta?.serie ?? []).map((p) => ({ ...p, etiqueta: p.fecha.slice(5).split("-").reverse().join("/") }));
  const dia = (datos?.por_dia ?? []).map((d) => ({ ...d, etiqueta: d.dia.slice(0, 3), interacciones_medias: d.interacciones_medias ?? 0 }));
  const cambio = datos?.cuenta?.cambio_seguidores;

  return (
    <div className="mt-8">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Instagram{datos?.usuario ? ` · @${datos.usuario}` : ""}</h2>
        <Button size="sm" variant="outline" onClick={actualizar} disabled={actualizando || (datos ? !datos.configurado : false)}>{actualizando ? "Actualizando…" : "Actualizar ahora"}</Button>
      </div>

      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas n={3} />
      ) : datos && !datos.configurado ? (
        <Vacio titulo="Instagram no está configurado para esta organización" texto="Añade la cuenta y el token en Integraciones para ver aquí sus métricas." />
      ) : datos && !datos.sincronizado ? (
        <Vacio titulo="Todavía no hay datos" texto="Los datos se leen una vez al día. Pulsa «Actualizar ahora» para traerlos ya." />
      ) : datos && datos.cuenta && datos.periodo ? (
        <>
          {datos.error && <div className="mb-3"><ErrorCaja mensaje={`La última lectura de Instagram falló: ${datos.error}`} /></div>}
          {datos.insights_disponibles === false && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Sin alcance ni guardados</p>
              <p className="mt-0.5">Meta no los entrega con el token actual: le falta el permiso <code>instagram_manage_insights</code>. Por ahora se muestran me gusta y comentarios; cuando se genere el token con ese permiso aparecerán también el alcance, los guardados, los compartidos y la tasa de interacción.</p>
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Seguidores" valor={n(datos.cuenta.seguidores)} sub={cambio === null || cambio === undefined ? "el histórico se irá llenando cada día" : `${cambio > 0 ? "+" : ""}${cambio} desde el ${datos.cuenta.desde?.split("-").reverse().join("/")}`} />
            <Kpi titulo="Publicaciones" valor={n(datos.periodo.publicaciones)} sub={`en los últimos ${datos.dias} días`} />
            <Kpi titulo="Interacciones" valor={n(datos.periodo.interacciones)} sub={`${n(datos.periodo.interacciones_por_publicacion, 1)} por publicación · ${n(datos.periodo.likes)} ♥ · ${n(datos.periodo.comentarios)} 💬`} />
            <Kpi titulo={datos.insights_disponibles ? "Alcance" : "Alcance / tasa"} valor={datos.insights_disponibles ? n(datos.periodo.alcance) : "—"} sub={datos.insights_disponibles ? `tasa de interacción ${n(datos.periodo.tasa_interaccion, 1)} %` : "requiere el permiso de insights"} />
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Seguidores</p>
              {serie.length > 1 ? (
                <ChartContainer config={CONFIG_SEGUIDORES} className="h-44 w-full">
                  <LineChart data={serie} margin={{ left: -10, right: 8, top: 4 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} fontSize={11} />
                    <YAxis allowDecimals={false} domain={["dataMin - 2", "dataMax + 2"]} tickLine={false} axisLine={false} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line dataKey="seguidores" type="monotone" stroke="var(--color-seguidores)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">La gráfica aparecerá cuando haya al menos dos días de datos: se guarda una foto de la cuenta cada día.</p>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Interacciones medias por día de publicación</p>
              <ChartContainer config={CONFIG_DIAS} className="h-44 w-full">
                <BarChart data={dia} margin={{ left: -10, right: 4, top: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis allowDecimals tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="interacciones_medias" fill="var(--color-interacciones_medias)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
              <p className="mt-1 text-[11px] text-muted-foreground">{(datos.por_dia ?? []).map((d) => `${d.dia.slice(0, 3)} ${d.publicaciones}`).join(" · ")} publicaciones</p>
            </div>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-lg border">
              <p className="px-3 pt-3 text-xs font-medium text-muted-foreground">Qué tipo de contenido funciona mejor</p>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-3 py-2 font-medium">Tipo</th><th className="px-3 py-2 text-right font-medium">Publ.</th><th className="px-3 py-2 text-right font-medium">♥ medios</th><th className="px-3 py-2 text-right font-medium">💬 medios</th><th className="px-3 py-2 text-right font-medium">Alcance medio</th></tr></thead>
                <tbody className="divide-y">
                  {(datos.por_tipo ?? []).map((t) => (
                    <tr key={t.tipo}><td className="px-3 py-2">{NOMBRE_TIPO[t.tipo] ?? t.tipo}</td><td className="px-3 py-2 text-right tabular-nums">{t.publicaciones}</td><td className="px-3 py-2 text-right tabular-nums">{n(t.likes_medios, 1)}</td><td className="px-3 py-2 text-right tabular-nums">{n(t.comentarios_medios, 1)}</td><td className="px-3 py-2 text-right tabular-nums">{n(t.alcance_medio)}</td></tr>
                  ))}
                  {(datos.por_tipo ?? []).length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sin publicaciones en este periodo</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <p className="px-3 pt-3 text-xs font-medium text-muted-foreground">Lo publicado por el sistema frente al resto</p>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-3 py-2 font-medium">Origen</th><th className="px-3 py-2 text-right font-medium">Publicaciones</th><th className="px-3 py-2 text-right font-medium">Interacciones medias</th></tr></thead>
                <tbody className="divide-y">
                  {(datos.por_origen ?? []).map((o) => (
                    <tr key={o.origen}><td className="px-3 py-2">{o.origen === "kelatos" ? "Agentes V2 (este sistema)" : "Publicado por otros medios"}</td><td className="px-3 py-2 text-right tabular-nums">{o.publicaciones}</td><td className="px-3 py-2 text-right tabular-nums">{n(o.interacciones_medias, 1)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border">
            <p className="px-3 pt-3 text-xs font-medium text-muted-foreground">Mejores publicaciones del periodo</p>
            <ul className="divide-y">
              {(datos.mejores ?? []).map((p) => (
                <li key={p.media_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{p.caption || "(sin texto)"}</p>
                    <p className="text-xs text-muted-foreground">{NOMBRE_TIPO[p.tipo] ?? p.tipo} · {fechaHora(p.publicado_en)}{p.origen === "kelatos" ? " · Agentes V2" : ""}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                    <span>♥ {p.likes}</span><span>💬 {p.comentarios}</span>{p.alcance !== null && <span>alcance {n(p.alcance)}</span>}{p.guardados !== null && <span>guardados {n(p.guardados)}</span>}
                    {p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="text-primary hover:underline">Ver</a>}
                  </div>
                </li>
              ))}
              {(datos.mejores ?? []).length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Sin publicaciones en este periodo</li>}
            </ul>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Última lectura de Instagram: {datos.actualizado_en ? fechaHora(datos.actualizado_en) : "—"}. Se actualiza sola una vez al día.</p>
        </>
      ) : null}
    </div>
  );
}
