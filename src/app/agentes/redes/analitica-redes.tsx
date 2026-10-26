"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts";
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
  miniatura: string | null;
  caption: string | null;
  origen: "kelatos" | "externo";
  likes: number;
  comentarios: number;
  alcance: number | null;
  vistas: number | null;
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
  periodo?: { publicaciones: number; likes: number; comentarios: number; guardados: number | null; compartidos: number | null; alcance: number | null; vistas: number | null; interacciones: number; tasa_interaccion: number | null; interacciones_por_publicacion: number | null; interacciones_mediana: number | null };
  por_tipo?: { tipo: string; publicaciones: number; likes_medios: number; comentarios_medios: number; alcance_medio: number | null; interacciones_mediana: number | null }[];
  por_dia?: { dia: string; publicaciones: number; interacciones_medias: number | null; interacciones_mediana: number | null }[];
  por_origen?: { origen: "kelatos" | "externo"; publicaciones: number; interacciones_medias: number | null; interacciones_mediana: number | null }[];
  mejores?: PublicacionTop[];
}

const NOMBRE_TIPO: Record<string, string> = { reel: "Reels", carrusel: "Carruseles", imagen: "Imágenes", video: "Vídeos" };
const NOMBRE_TIPO_1: Record<string, string> = { reel: "reel", carrusel: "carrusel", imagen: "imagen", video: "vídeo" };
const n = (v: number | null | undefined, dec = 0) => (v === null || v === undefined ? "—" : v.toLocaleString("es-ES", { maximumFractionDigits: dec }));
const CONFIG_SEGUIDORES = { seguidores: { label: "Seguidores", color: "#2a6df4" } } satisfies ChartConfig;
const CONFIG_DIAS = { interacciones_mediana: { label: "Interacciones típicas", color: "#2a9d6f" } } satisfies ChartConfig;

/** Frases que resumen lo que dicen los datos (solo con muestra suficiente: no se afirma nada con 1 publicación). */
function conclusiones(d: Resumen): string[] {
  const c: string[] = [];
  const tipos = (d.por_tipo ?? []).filter((t) => t.publicaciones >= 2 && t.interacciones_mediana !== null);
  if (tipos.length >= 2) {
    const o = [...tipos].sort((a, b) => (b.interacciones_mediana ?? 0) - (a.interacciones_mediana ?? 0));
    const mejor = o[0], peor = o[o.length - 1];
    if ((mejor.interacciones_mediana ?? 0) > (peor.interacciones_mediana ?? 0)) {
      c.push(`Los ${NOMBRE_TIPO[mejor.tipo]?.toLowerCase() ?? mejor.tipo} funcionan mejor: una publicación típica recibe ${n(mejor.interacciones_mediana, 1)} interacciones, frente a ${n(peor.interacciones_mediana, 1)} de los ${NOMBRE_TIPO[peor.tipo]?.toLowerCase() ?? peor.tipo}.`);
    }
  }
  const dias = (d.por_dia ?? []).filter((x) => x.publicaciones >= 2 && x.interacciones_mediana !== null);
  if (dias.length >= 2) {
    const mejor = [...dias].sort((a, b) => (b.interacciones_mediana ?? 0) - (a.interacciones_mediana ?? 0))[0];
    if ((mejor.interacciones_mediana ?? 0) > 0) c.push(`El mejor día para publicar es el ${mejor.dia.toLowerCase()} (${n(mejor.interacciones_mediana, 1)} interacciones típicas, ${mejor.publicaciones} publicaciones).`);
  }
  const k = d.por_origen?.find((o) => o.origen === "kelatos");
  const x = d.por_origen?.find((o) => o.origen === "externo");
  if (k && x && k.publicaciones >= 2 && x.publicaciones >= 2 && k.interacciones_mediana !== null && x.interacciones_mediana !== null && x.interacciones_mediana > k.interacciones_mediana * 2) {
    c.push(`Lo publicado desde Agentes V2 (${k.publicaciones}) recibe ${n(k.interacciones_mediana, 1)} interacciones típicas; lo publicado por otros medios (${x.publicaciones}), ${n(x.interacciones_mediana, 1)}. Merece revisar qué hace distinto el segundo grupo.`);
  }
  const top = d.mejores?.[0];
  if (top && d.periodo && d.periodo.interacciones > 0 && top.interacciones / d.periodo.interacciones >= 0.4 && d.periodo.publicaciones >= 5) {
    c.push(`Una sola publicación concentra el ${n((top.interacciones / d.periodo.interacciones) * 100)} % de las interacciones del periodo: las medias se inclinan hacia ella, por eso aquí se usa la cifra típica.`);
  }
  const cs = d.cuenta?.cambio_seguidores;
  if (cs !== null && cs !== undefined) c.push(`${cs > 0 ? "Has ganado" : cs < 0 ? "Has perdido" : "Sin cambios en"} ${cs === 0 ? "seguidores" : `${Math.abs(cs)} seguidores`} desde el ${d.cuenta?.desde?.split("-").reverse().join("/")}.`);
  return c;
}

/** Analítica de Instagram de la organización activa: seguidores, interacciones, qué tipo de contenido y qué día funcionan mejor. Solo lectura. */
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
  const dia = (datos?.por_dia ?? []).map((d) => ({ ...d, etiqueta: d.dia.slice(0, 3), interacciones_mediana: d.interacciones_mediana ?? 0 }));
  const maxDia = Math.max(...dia.map((d) => d.interacciones_mediana), 0);
  const tipos = datos?.por_tipo ?? [];
  const maxTipo = Math.max(...tipos.map((t) => t.interacciones_mediana ?? 0), 1);
  const cambio = datos?.cuenta?.cambio_seguidores;
  const frases = datos && datos.cuenta && datos.periodo ? conclusiones(datos) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {datos?.usuario ? <span className="font-medium text-foreground">@{datos.usuario}</span> : "Instagram"}
          {datos?.actualizado_en ? ` · última lectura ${fechaHora(datos.actualizado_en)} (se actualiza sola cada día)` : ""}
        </p>
        <Button size="sm" variant="outline" onClick={actualizar} disabled={actualizando || (datos ? !datos.configurado : false)}>{actualizando ? "Actualizando…" : "Actualizar ahora"}</Button>
      </div>

      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas n={3} />
      ) : datos && !datos.configurado ? (
        <Vacio titulo="Instagram no está configurado para esta organización" texto="Añade la cuenta y el token en Integraciones para ver aquí sus métricas." />
      ) : datos && !datos.sincronizado ? (
        <Vacio titulo="Todavía no hay datos" texto="Los datos se leen una vez al día. Pulsa «Actualizar ahora» para traerlos ya." />
      ) : datos && datos.error && datos.cuenta?.seguidores === null ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">No se pudo leer el Instagram de esta organización</p>
          <p className="mt-0.5">La cuenta que está configurada no existe o el token no tiene acceso a ella. Revisa la cuenta y el token en Integraciones (la cuenta debe ser profesional y estar vinculada a la página de Facebook del token).</p>
          <p className="mt-1 text-xs text-red-800/80">Detalle de Meta: {datos.error.slice(0, 160)}</p>
        </div>
      ) : datos && datos.cuenta && datos.periodo ? (
        <>
          {datos.error && <ErrorCaja mensaje={`La última lectura de Instagram falló: ${datos.error}`} />}
          {datos.insights_disponibles === false && (
            <details className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              <summary className="cursor-pointer font-medium">Faltan alcance y guardados <span className="font-normal text-amber-800">· por qué</span></summary>
              <p className="mt-1.5">Meta no los entrega con el token actual: le falta el permiso <code>instagram_manage_insights</code>. Hasta que se genere el token con ese permiso se muestran me gusta, comentarios y seguidores; después aparecerán también el alcance, los guardados, los compartidos y la tasa de interacción.</p>
            </details>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Seguidores" valor={n(datos.cuenta.seguidores)} sub={cambio === null || cambio === undefined ? "el histórico empieza hoy" : `${cambio > 0 ? "+" : ""}${cambio} desde el ${datos.cuenta.desde?.split("-").reverse().join("/")}`} />
            <Kpi titulo="Publicaciones" valor={n(datos.periodo.publicaciones)} sub={`${n(datos.periodo.publicaciones / (datos.dias / 7), 1)} por semana · últimos ${datos.dias} días`} />
            <Kpi titulo="Interacciones" valor={n(datos.periodo.interacciones)} sub={`${n(datos.periodo.likes)} me gusta · ${n(datos.periodo.comentarios)} comentarios`} />
            {datos.insights_disponibles ? (
              <Kpi titulo="Vistas" valor={n(datos.periodo.vistas)} sub={`alcance ${n(datos.periodo.alcance)} · tasa de interacción ${n(datos.periodo.tasa_interaccion, 1)} %`} />
            ) : (
              <Kpi titulo="Publicación típica" valor={n(datos.periodo.interacciones_mediana, 1)} sub={`interacciones (la mediana; la media es ${n(datos.periodo.interacciones_por_publicacion, 1)})`} />
            )}
          </div>

          {frases.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm">
              <p className="mb-1.5 font-medium text-blue-950">Lo que dicen los datos</p>
              <ul className="list-disc space-y-1 pl-5 text-blue-950/90">{frases.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Qué contenido funciona mejor</p>
              <p className="mb-3 text-xs text-muted-foreground">Interacciones de una publicación típica, por tipo.</p>
              <div className="space-y-3">
                {tipos.map((t) => (
                  <div key={t.tipo}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>{NOMBRE_TIPO[t.tipo] ?? t.tipo} <span className="text-xs text-muted-foreground">· {t.publicaciones} publicaciones</span></span>
                      <span className="tabular-nums"><strong>{n(t.interacciones_mediana, 1)}</strong> <span className="text-xs text-muted-foreground">típico · {n(t.likes_medios, 1)} ♥ y {n(t.comentarios_medios, 1)} 💬 de media</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.max(2, ((t.interacciones_mediana ?? 0) / maxTipo) * 100)}%` }} /></div>
                  </div>
                ))}
                {tipos.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Sin publicaciones en este periodo</p>}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Mejor día para publicar</p>
              <p className="mb-2 text-xs text-muted-foreground">Interacciones de una publicación típica según el día en que se publicó.</p>
              <ChartContainer config={CONFIG_DIAS} className="h-40 w-full">
                <BarChart data={dia} margin={{ left: -18, right: 4, top: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="interacciones_mediana" radius={[3, 3, 0, 0]}>
                    {dia.map((d) => <Cell key={d.dia} fill={d.interacciones_mediana === maxDia && maxDia > 0 ? "#2a9d6f" : "#9bd3bb"} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
              <p className="mt-1 text-[11px] text-muted-foreground">Publicaciones: {(datos.por_dia ?? []).map((d) => `${d.dia.slice(0, 3)} ${d.publicaciones}`).join(" · ")}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Agentes V2 frente al resto</p>
              <p className="mb-3 text-xs text-muted-foreground">Lo que publica este sistema frente a lo que se publica por otros medios.</p>
              <div className="grid grid-cols-2 gap-3">
                {(datos.por_origen ?? []).map((o) => (
                  <div key={o.origen} className="rounded-md bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{o.origen === "kelatos" ? "Agentes V2" : "Otros medios"}</p>
                    <p className="text-xl font-semibold tabular-nums">{n(o.interacciones_mediana, 1)}</p>
                    <p className="text-[11px] text-muted-foreground">interacciones típicas · {o.publicaciones} publicaciones</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Seguidores</p>
              {serie.length > 1 ? (
                <ChartContainer config={CONFIG_SEGUIDORES} className="mt-2 h-36 w-full">
                  <LineChart data={serie} margin={{ left: -10, right: 8, top: 4 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} fontSize={11} />
                    <YAxis allowDecimals={false} domain={["dataMin - 2", "dataMax + 2"]} tickLine={false} axisLine={false} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line dataKey="seguidores" type="monotone" stroke="var(--color-seguidores)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="mt-2 flex h-[5.5rem] items-center rounded-md bg-muted/40 px-4 text-sm text-muted-foreground">
                  Hoy son {n(datos.cuenta.seguidores)}. Se guarda una foto cada día, así que la evolución aparecerá a partir de mañana.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border">
            <p className="px-4 pt-3 text-sm font-medium">Mejores publicaciones del periodo</p>
            <ul className="divide-y">
              {(datos.mejores ?? []).map((p, i) => (
                <li key={p.media_id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                  {p.miniatura ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.miniatura} alt="" referrerPolicy="no-referrer" loading="lazy" className="size-12 shrink-0 rounded-md bg-muted object-cover" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                  ) : <div className="size-12 shrink-0 rounded-md bg-muted" />}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2">{p.caption || "(sin texto)"}</p>
                    <p className="text-xs text-muted-foreground">{NOMBRE_TIPO_1[p.tipo] ?? p.tipo} · {fechaHora(p.publicado_en)}{p.origen === "kelatos" ? " · Agentes V2" : ""}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs tabular-nums text-muted-foreground">
                    <span><strong className="text-sm text-foreground">{n(p.interacciones)}</strong> interacciones</span>
                    <span>♥ {n(p.likes)} · 💬 {n(p.comentarios)}{p.vistas !== null ? ` · ${n(p.vistas)} vistas` : ""}{p.alcance !== null ? ` · alcance ${n(p.alcance)}` : ""}{p.guardados !== null ? ` · ${n(p.guardados)} guardados` : ""}</span>
                    {p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="text-primary hover:underline">Ver en Instagram</a>}
                  </div>
                </li>
              ))}
              {(datos.mejores ?? []).length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Sin publicaciones en este periodo</li>}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
