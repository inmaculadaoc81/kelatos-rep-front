"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PillBadge } from "@/components/pill-badge";
import { Severidad } from "./seguridad-componentes";

const ESTILO_SEVERIDAD: Record<Severidad, { bg: string; color: string; texto: string }> = {
  ok: { bg: "#dcfce7", color: "#166534", texto: "Bien" },
  aviso: { bg: "#fef3c7", color: "#92400e", texto: "Revisar" },
  critico: { bg: "#fee2e2", color: "#991b1b", texto: "Atención" },
  sindato: { bg: "#e5e7eb", color: "#374151", texto: "Sin datos" },
};

const num = (n: number) => Math.round(n).toLocaleString("es-ES");

function duracionFmt(seg: number | null) {
  if (seg === null) return "—";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fechaFmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export interface VideoYoutube {
  id: string;
  titulo: string;
  descripcionLongitud: number;
  numTags: number;
  duracionSeg: number | null;
  esShort: boolean;
  vistas: number;
  likes: number;
  comentarios: number;
}

export interface ResumenYoutube {
  configurado?: boolean;
  mensaje?: string;
  canal?: { nombre: string; suscriptores: number; vistasTotales: number; numVideos: number };
  videos?: VideoYoutube[];
}

export interface PublicacionInstagram {
  tipo: string;
  captionLongitud: number;
  tieneHashtags: boolean;
  likes: number;
  comentarios: number;
  fecha: string | null;
}

export interface ResumenInstagram {
  configurado?: boolean;
  mensaje?: string;
  seguidores?: number;
  numPublicaciones?: number;
  publicaciones?: PublicacionInstagram[];
}

export interface ResumenTikTokSnapchat {
  tiktok?: { configurado: boolean; motivo?: string };
  snapchat?: { configurado: boolean; motivo?: string };
}

export interface Recomendaciones {
  youtube: string[];
  instagram: string[];
  tiktok: string[];
  snapchat: string[];
}

// ── Base estadística: terciles sobre un valor para clasificar Alto/Medio/Bajo
// (petición del usuario, 2026-10-06) — se recalculan en cada ejecución a
// partir de las propias piezas analizadas, no hay un umbral fijo "bueno"
// universal, cada cuenta se compara contra sí misma. ─────────────────────

type Nivel = "alto" | "medio" | "bajo";

const ESTILO_NIVEL: Record<Nivel, { bg: string; color: string; texto: string }> = {
  alto: { bg: "#dcfce7", color: "#166534", texto: "Alto" },
  medio: { bg: "#fef3c7", color: "#92400e", texto: "Medio" },
  bajo: { bg: "#fee2e2", color: "#991b1b", texto: "Bajo" },
};

function tercilesDe(valores: number[]) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const en = (p: number) => (ordenados.length ? ordenados[Math.min(ordenados.length - 1, Math.floor(p * ordenados.length))] : 0);
  return { p33: en(0.33), p66: en(0.66) };
}

function nivelDe(valor: number, p33: number, p66: number): Nivel {
  if (valor <= p33) return "bajo";
  if (valor <= p66) return "medio";
  return "alto";
}

function NivelBadge({ nivel }: { nivel: Nivel }) {
  const e = ESTILO_NIVEL[nivel];
  return <PillBadge bg={e.bg} color={e.color} className="text-[11px]">{e.texto}</PillBadge>;
}

function EstadisticaTile({ etiqueta, valor, sub }: { etiqueta: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="text-lg font-semibold tabular-nums">{valor}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Barra comparativa simple entre grupos (Shorts vs vídeos normales, o por
    tipo de publicación de Instagram) — "qué tipo de contenido genera más",
    petición del usuario. */
function ComparacionGrupos({ titulo, grupos, etiquetaValor }: { titulo: string; grupos: { etiqueta: string; promedio: number; n: number }[]; etiquetaValor: string }) {
  const conDatos = grupos.filter((g) => g.n > 0);
  if (conDatos.length < 2) return null;
  const max = Math.max(...conDatos.map((g) => g.promedio), 1);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">{titulo}</p>
      <div className="space-y-2">
        {conDatos.map((g) => (
          <div key={g.etiqueta}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span>{g.etiqueta} <span className="text-muted-foreground">({g.n})</span></span>
              <span className="font-medium tabular-nums">{num(g.promedio)} {etiquetaValor} de media</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(4, (g.promedio / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CabeceraSeccion({ titulo, severidad, derecha }: { titulo: string; severidad: Severidad; derecha?: React.ReactNode }) {
  const e = ESTILO_SEVERIDAD[severidad];
  return (
    <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <PillBadge bg={e.bg} color={e.color}>{e.texto}</PillBadge>
      </div>
      {derecha}
    </div>
  );
}

function SeccionVaciaOSinDatos({ titulo, mensaje }: { titulo: string; mensaje?: string }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <CabeceraSeccion titulo={titulo} severidad="sindato" />
      <div className="p-4 text-sm text-muted-foreground">{mensaje || "Todavía sin ejecutar."}</div>
    </section>
  );
}

function ListaRecomendaciones({ items, esGenerico }: { items?: string[]; esGenerico?: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">
        Recomendaciones{esGenerico && <span className="ml-1.5 font-normal">(buenas prácticas generales, no un análisis real)</span>}
      </p>
      {items?.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Sin recomendaciones.</p>
      )}
    </div>
  );
}

// ── Sección YouTube ───────────────────────────────────────────────────────

export function SeccionYoutube({ r, recomendaciones }: { r?: ResumenYoutube; recomendaciones?: string[] }) {
  if (!r) return <SeccionVaciaOSinDatos titulo="YouTube" />;
  if (r.configurado === false) return <SeccionVaciaOSinDatos titulo="YouTube" mensaje={r.mensaje} />;

  const videos = r.videos || [];
  const sinEtiquetas = videos.filter((v) => v.numTags === 0).length;
  const severidad: Severidad = sinEtiquetas > 0 ? "aviso" : "ok";

  const vistas = videos.map((v) => v.vistas);
  const totalVistas = vistas.reduce((a, b) => a + b, 0);
  const promedioVistas = videos.length ? totalVistas / videos.length : 0;
  const totalLikes = videos.reduce((a, v) => a + v.likes, 0);
  const totalComentarios = videos.reduce((a, v) => a + v.comentarios, 0);
  const engagement = totalVistas > 0 ? ((totalLikes + totalComentarios) / totalVistas) * 100 : 0;
  const { p33, p66 } = tercilesDe(vistas);
  const ordenados = [...videos].sort((a, b) => b.vistas - a.vistas);
  const mejor = ordenados[0];
  const peor = ordenados[ordenados.length - 1];

  const shorts = videos.filter((v) => v.esShort);
  const normales = videos.filter((v) => !v.esShort);
  const promedioDe = (arr: VideoYoutube[]) => (arr.length ? arr.reduce((a, v) => a + v.vistas, 0) / arr.length : 0);

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <CabeceraSeccion
        titulo="YouTube"
        severidad={severidad}
        derecha={<p className="text-xs text-muted-foreground">{r.canal?.suscriptores ?? 0} suscriptores · {r.canal?.numVideos ?? 0} vídeos en el canal</p>}
      />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <EstadisticaTile etiqueta="Vistas totales (analizadas)" valor={num(totalVistas)} sub={`${videos.length} vídeos`} />
          <EstadisticaTile etiqueta="Media de vistas/vídeo" valor={num(promedioVistas)} />
          <EstadisticaTile etiqueta="Interacción (likes+coment. / vistas)" valor={`${engagement.toFixed(1)}%`} />
          <EstadisticaTile etiqueta="Sin etiquetas" valor={String(sinEtiquetas)} sub={sinEtiquetas > 0 ? "afecta al SEO" : "todo etiquetado"} />
        </div>

        {mejor && peor && mejor.id !== peor.id && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="font-medium text-emerald-800 dark:text-emerald-300">Mejor vídeo</p>
              <p className="truncate text-emerald-900 dark:text-emerald-200" title={mejor.titulo}>{mejor.titulo}</p>
              <p className="text-emerald-700 dark:text-emerald-400">{num(mejor.vistas)} vistas</p>
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs dark:border-red-900 dark:bg-red-950/30">
              <p className="font-medium text-red-800 dark:text-red-300">Peor vídeo</p>
              <p className="truncate text-red-900 dark:text-red-200" title={peor.titulo}>{peor.titulo}</p>
              <p className="text-red-700 dark:text-red-400">{num(peor.vistas)} vistas</p>
            </div>
          </div>
        )}

        <ComparacionGrupos
          titulo="Qué tipo de vídeo genera más vistas"
          etiquetaValor="vistas"
          grupos={[
            { etiqueta: "Shorts", promedio: promedioDe(shorts), n: shorts.length },
            { etiqueta: "Vídeos normales", promedio: promedioDe(normales), n: normales.length },
          ]}
        />

        {videos.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead className="text-right">Vistas</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Comentarios</TableHead>
                  <TableHead className="text-right">Duración</TableHead>
                  <TableHead className="text-right">Etiquetas</TableHead>
                  <TableHead>Nivel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenados.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="max-w-xs truncate text-sm" title={v.titulo}>
                      {v.titulo}
                      {v.esShort && <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Short</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{num(v.vistas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(v.likes)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(v.comentarios)}</TableCell>
                    <TableCell className="text-right tabular-nums">{duracionFmt(v.duracionSeg)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${v.numTags === 0 ? "text-amber-700" : ""}`}>{v.numTags}</TableCell>
                    <TableCell><NivelBadge nivel={nivelDe(v.vistas, p33, p66)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <ListaRecomendaciones items={recomendaciones} />
      </div>
    </section>
  );
}

// ── Sección Instagram ────────────────────────────────────────────────────

export function SeccionInstagram({ r, recomendaciones }: { r?: ResumenInstagram; recomendaciones?: string[] }) {
  if (!r) return <SeccionVaciaOSinDatos titulo="Instagram" />;
  if (r.configurado === false) return <SeccionVaciaOSinDatos titulo="Instagram" mensaje={r.mensaje} />;

  const publicaciones = r.publicaciones || [];
  const sinHashtags = publicaciones.filter((p) => !p.tieneHashtags).length;
  const severidad: Severidad = sinHashtags > 0 ? "aviso" : "ok";

  const likes = publicaciones.map((p) => p.likes);
  const totalLikes = likes.reduce((a, b) => a + b, 0);
  const promedioLikes = publicaciones.length ? totalLikes / publicaciones.length : 0;
  const totalComentarios = publicaciones.reduce((a, p) => a + p.comentarios, 0);
  const { p33, p66 } = tercilesDe(likes);
  const ordenados = [...publicaciones].sort((a, b) => b.likes - a.likes);
  const mejor = ordenados[0];
  const peor = ordenados[ordenados.length - 1];

  const conHashtags = publicaciones.filter((p) => p.tieneHashtags);
  const sinHashtagsArr = publicaciones.filter((p) => !p.tieneHashtags);
  const promedioDe = (arr: PublicacionInstagram[]) => (arr.length ? arr.reduce((a, p) => a + p.likes, 0) / arr.length : 0);

  const tipos = Array.from(new Set(publicaciones.map((p) => p.tipo || "Otro")));
  const grupoPorTipo = tipos.map((t) => {
    const arr = publicaciones.filter((p) => (p.tipo || "Otro") === t);
    return { etiqueta: t, promedio: promedioDe(arr), n: arr.length };
  });

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <CabeceraSeccion
        titulo="Instagram"
        severidad={severidad}
        derecha={<p className="text-xs text-muted-foreground">{r.seguidores ?? 0} seguidores · {r.numPublicaciones ?? 0} publicaciones en la cuenta</p>}
      />
      <div className="space-y-4 p-4">
        <p className="text-xs text-muted-foreground">Instagram no da el número de reproducciones por esta vía — el ranking de abajo se basa en <strong>likes</strong>, no en vistas.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <EstadisticaTile etiqueta="Likes totales (analizadas)" valor={num(totalLikes)} sub={`${publicaciones.length} publicaciones`} />
          <EstadisticaTile etiqueta="Media de likes/publicación" valor={num(promedioLikes)} />
          <EstadisticaTile etiqueta="Comentarios totales" valor={num(totalComentarios)} />
          <EstadisticaTile etiqueta="Sin hashtags" valor={String(sinHashtags)} sub={sinHashtags > 0 ? "menos alcance" : "todo con hashtags"} />
        </div>

        {mejor && peor && mejor !== peor && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="font-medium text-emerald-800 dark:text-emerald-300">Mejor publicación</p>
              <p className="text-emerald-900 dark:text-emerald-200">{mejor.tipo} · {fechaFmt(mejor.fecha)}</p>
              <p className="text-emerald-700 dark:text-emerald-400">{num(mejor.likes)} likes</p>
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs dark:border-red-900 dark:bg-red-950/30">
              <p className="font-medium text-red-800 dark:text-red-300">Peor publicación</p>
              <p className="text-red-900 dark:text-red-200">{peor.tipo} · {fechaFmt(peor.fecha)}</p>
              <p className="text-red-700 dark:text-red-400">{num(peor.likes)} likes</p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ComparacionGrupos titulo="Qué tipo de publicación genera más likes" etiquetaValor="likes" grupos={grupoPorTipo} />
          <ComparacionGrupos
            titulo="Con hashtags vs sin hashtags"
            etiquetaValor="likes"
            grupos={[
              { etiqueta: "Con hashtags", promedio: promedioDe(conHashtags), n: conHashtags.length },
              { etiqueta: "Sin hashtags", promedio: promedioDe(sinHashtagsArr), n: sinHashtagsArr.length },
            ]}
          />
        </div>

        {publicaciones.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Comentarios</TableHead>
                  <TableHead className="text-right">Longitud caption</TableHead>
                  <TableHead>Hashtags</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                  <TableHead>Nivel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenados.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{p.tipo || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(p.likes)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(p.comentarios)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.captionLongitud}</TableCell>
                    <TableCell className={`text-sm ${!p.tieneHashtags ? "text-amber-700" : "text-muted-foreground"}`}>{p.tieneHashtags ? "Sí" : "No"}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{fechaFmt(p.fecha)}</TableCell>
                    <TableCell><NivelBadge nivel={nivelDe(p.likes, p33, p66)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <ListaRecomendaciones items={recomendaciones} />
      </div>
    </section>
  );
}

// ── Sección TikTok y Snapchat ────────────────────────────────────────────

export function SeccionTikTokSnapchat({ r, recomendacionesTiktok, recomendacionesSnapchat }: { r?: ResumenTikTokSnapchat; recomendacionesTiktok?: string[]; recomendacionesSnapchat?: string[] }) {
  if (!r) return <SeccionVaciaOSinDatos titulo="TikTok y Snapchat" />;
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <CabeceraSeccion titulo="TikTok y Snapchat" severidad="sindato" />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">Sin datos reales de la cuenta todavía — las recomendaciones de abajo son buenas prácticas generales, no un análisis de tus vídeos.</p>
        {r.tiktok?.motivo && <p className="text-xs text-muted-foreground">TikTok: {r.tiktok.motivo}</p>}
        {r.snapchat?.motivo && <p className="text-xs text-muted-foreground">Snapchat: {r.snapchat.motivo}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">TikTok</p>
            <ListaRecomendaciones items={recomendacionesTiktok} esGenerico />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Snapchat</p>
            <ListaRecomendaciones items={recomendacionesSnapchat} esGenerico />
          </div>
        </div>
      </div>
    </section>
  );
}
