"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, Download, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enviarV2 } from "@/components/agentes-v2/use-v2";
import { CargandoFilas, ErrorCaja } from "@/components/agentes-v2/componentes";
import { cn } from "@/lib/utils";
import { Campo, Progreso, Selector } from "./campos";
import { type Diseno, type Forma } from "./use-social";
import { ESTADO_REEL_TEXTO, NOMBRE_TIPO_VISUAL, NOMBRE_TRANSICION, TIPOS_VISUAL_ESCENA, TRANSICIONES_REEL, urlEscenaImagen, urlVideoReel, useReel, type EscenaReel } from "./use-reels";
import { TiraEscenas } from "./tira-escenas";

const base = (id: number) => `social/reels/${id}`;

interface Confirmacion { titulo: string; texto: string; boton: string; peligro?: boolean; accion: () => Promise<void> }

function Confirmar({ c, onCerrar }: { c: Confirmacion | null; onCerrar: () => void }) {
  const [trabajando, setTrabajando] = useState(false);
  return (
    <Dialog open={!!c} onOpenChange={(o) => !o && !trabajando && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{c?.titulo}</DialogTitle>
          <DialogDescription>{c?.texto}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" disabled={trabajando} onClick={onCerrar}>Cancelar</Button>
          <Button variant={c?.peligro ? "destructive" : "default"} disabled={trabajando} onClick={async () => { setTrabajando(true); try { await c?.accion(); } finally { setTrabajando(false); onCerrar(); } }}>{trabajando ? "Un momento…" : c?.boton}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function descargarTexto(nombre: string, texto: string) {
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ───────────── texto de la escena ─────────────

function EditorEscenaTexto({ reelId, escena, bloqueado, alGuardar }: { reelId: number; escena: EscenaReel; bloqueado: boolean; alGuardar: () => void }) {
  const [voiceover, setVoiceover] = useState(escena.voiceover ?? "");
  const [onScreenText, setOnScreenText] = useState(escena.on_screen_text ?? "");
  const [duration, setDuration] = useState(escena.duration_seconds);
  const [visualType, setVisualType] = useState(escena.visual_type);
  const [transition, setTransition] = useState(escena.transition);
  const [statValue, setStatValue] = useState(escena.content.stat?.value ?? "");
  const [statLabel, setStatLabel] = useState(escena.content.stat?.label ?? "");
  const [quoteText, setQuoteText] = useState(escena.content.quote?.text ?? "");
  const [quoteAuthor, setQuoteAuthor] = useState(escena.content.quote?.author ?? "");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    try {
      const content = { ...escena.content };
      if (visualType === "statistic") content.stat = { value: statValue.trim(), label: statLabel.trim() };
      if (visualType === "quote") content.quote = { text: quoteText.trim(), author: quoteAuthor.trim() || null };
      await enviarV2("PATCH", `${base(reelId)}/scenes/${escena.id}`, {
        voiceover: voiceover.trim() || null, onScreenText: onScreenText.trim() || null, duration: Number(duration), visualType, transition, content,
      });
      toast.success("Escena guardada");
      alGuardar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Tipo de escena"><Selector valor={visualType} onChange={setVisualType} opciones={TIPOS_VISUAL_ESCENA.map((v) => ({ valor: v, texto: NOMBRE_TIPO_VISUAL[v] }))} /></Campo>
        <Campo etiqueta="Duración (segundos)"><Input type="number" min={1.5} max={20} step={0.5} value={duration} onChange={(e) => setDuration(Number(e.target.value) || escena.duration_seconds)} className="h-8 text-sm" /></Campo>
      </div>
      <Campo etiqueta="Texto en pantalla" ayuda="Corto: 8-10 palabras como mucho."><Textarea rows={2} value={onScreenText} onChange={(e) => setOnScreenText(e.target.value)} maxLength={120} className="min-h-0 text-sm" /></Campo>
      <Campo etiqueta="Voz en off (opcional)" ayuda="Vacío si la escena es solo texto en pantalla, sin narración."><Textarea rows={3} value={voiceover} onChange={(e) => setVoiceover(e.target.value)} maxLength={600} className="min-h-0 text-sm" /></Campo>
      {visualType === "statistic" && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border p-2.5">
          <Campo etiqueta="Cifra" ayuda="Corta: «68%», «3 de 4»."><Input value={statValue} onChange={(e) => setStatValue(e.target.value)} maxLength={20} className="h-8 text-sm" /></Campo>
          <Campo etiqueta="Qué significa"><Input value={statLabel} onChange={(e) => setStatLabel(e.target.value)} maxLength={60} className="h-8 text-sm" /></Campo>
        </div>
      )}
      {visualType === "quote" && (
        <div className="space-y-2 rounded-lg border p-2.5">
          <Campo etiqueta="Cita"><Textarea rows={2} value={quoteText} onChange={(e) => setQuoteText(e.target.value)} maxLength={160} className="min-h-0 text-sm" /></Campo>
          <Campo etiqueta="Autor (opcional)"><Input value={quoteAuthor} onChange={(e) => setQuoteAuthor(e.target.value)} maxLength={40} className="h-8 text-sm" /></Campo>
        </div>
      )}
      <Campo etiqueta="Transición hacia la siguiente escena"><Selector valor={transition} onChange={setTransition} opciones={TRANSICIONES_REEL.map((t) => ({ valor: t, texto: NOMBRE_TRANSICION[t] }))} /></Campo>
      <Button size="sm" disabled={bloqueado || guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar cambios"}</Button>
    </div>
  );
}

// ───────────── diseño de la escena (solo dibujables) ─────────────

const PALETAS: { valor: Diseno["palette"]; texto: string; muestra: string }[] = [
  { valor: "brand", texto: "Marca", muestra: "linear-gradient(135deg,#1d4ed8,#3b82f6)" },
  { valor: "dark", texto: "Oscuro", muestra: "#0b1020" },
  { valor: "light", texto: "Claro", muestra: "#f8fafc" },
  { valor: "accent", texto: "Acento", muestra: "#f59e0b" },
  { valor: "soft", texto: "Suave", muestra: "#e0e7ff" },
];
const FORMAS = [["circle", "Círculo"], ["ring", "Anillo"], ["blob", "Mancha"], ["bar", "Barra"], ["dots", "Puntos"], ["grid", "Cuadrícula"], ["diagonal", "Diagonal"], ["nodes", "Flujo de nodos"], ["chip", "Icono"]] as const;
const POSICIONES = [["tl", "Arriba izq."], ["tr", "Arriba der."], ["bl", "Abajo izq."], ["br", "Abajo der."], ["c", "Centro"], ["l", "Izquierda"], ["r", "Derecha"]] as const;
const ICONOS = ["check", "x", "arrow", "star", "bolt", "target", "chart", "users", "clock", "mail", "chat", "heart", "bulb", "shield", "rocket", "money"];
const DISENO_POR_DEFECTO: Diseno = { variant: "a", palette: "brand", align: "left", scale: "l", compact: false, shapes: [], icon: null, emphasis: "none", imageFit: "cover" };

function EditorEscenaDiseno({ reelId, escena, bloqueado, alGuardar }: { reelId: number; escena: EscenaReel; bloqueado: boolean; alGuardar: () => void }) {
  const [spec, setSpec] = useState<Diseno>(() => ({ ...DISENO_POR_DEFECTO, ...structuredClone(escena.design_spec ?? {}) }));
  const [guardando, setGuardando] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const cambia = (p: Partial<Diseno>) => setSpec({ ...spec, ...p });
  const forma = (i: number, p: Partial<Forma>) => cambia({ shapes: spec.shapes.map((f, j) => (j === i ? { ...f, ...p } : f)) });

  if (!escena.dibujable) {
    return <p className="text-sm text-muted-foreground">El tipo «{NOMBRE_TIPO_VISUAL[escena.visual_type]}» necesita un vídeo, foto o activo real: el sistema no lo dibuja. Cambia el tipo de escena en la pestaña Texto si quieres una versión dibujada.</p>;
  }

  const guardar = async () => {
    setGuardando(true);
    try {
      await enviarV2("PATCH", `${base(reelId)}/scenes/${escena.id}`, { design: spec });
      toast.success("Diseño guardado");
      alGuardar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };
  const regenerar = async () => {
    setRegenerando(true);
    try {
      await enviarV2("POST", `${base(reelId)}/scenes/${escena.id}/regenerate`, {});
      toast.success("La IA está rediseñando esta escena");
      alGuardar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo lanzar la regeneración");
    } finally {
      setRegenerando(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button size="sm" variant="outline" disabled={bloqueado || regenerando} onClick={regenerar}>{regenerando ? "Rediseñando…" : "Rediseñar con IA"}</Button>
      <Campo etiqueta="Colores">
        <div className="flex flex-wrap gap-2">
          {PALETAS.map((p) => (
            <button key={p.valor} type="button" onClick={() => cambia({ palette: p.valor })} className={cn("flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-xs", spec.palette === p.valor ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted")}>
              <span className="size-5 rounded-full border" style={{ background: p.muestra }} />{p.texto}
            </button>
          ))}
        </div>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Composición"><Selector valor={spec.variant} onChange={(v) => cambia({ variant: v })} opciones={[{ valor: "a", texto: "Estilo A" }, { valor: "b", texto: "Estilo B" }, { valor: "c", texto: "Estilo C" }]} /></Campo>
        <Campo etiqueta="Alineación"><Selector valor={spec.align} onChange={(v) => cambia({ align: v })} opciones={[{ valor: "left", texto: "A la izquierda" }, { valor: "center", texto: "Centrado" }]} /></Campo>
        <Campo etiqueta="Tamaño del texto"><Selector valor={spec.scale} onChange={(v) => cambia({ scale: v })} opciones={[{ valor: "xl", texto: "Muy grande" }, { valor: "l", texto: "Grande" }, { valor: "m", texto: "Mediano" }]} /></Campo>
        <Campo etiqueta="Énfasis"><Selector valor={spec.emphasis} onChange={(v) => cambia({ emphasis: v })} opciones={[{ valor: "none", texto: "Ninguno" }, { valor: "underline", texto: "Subrayado" }, { valor: "highlight", texto: "Resaltado" }]} /></Campo>
        <Campo etiqueta="Icono"><Selector valor={spec.icon ?? ""} onChange={(v) => cambia({ icon: v || null })} opciones={[{ valor: "", texto: "Sin icono" }, ...ICONOS.map((i) => ({ valor: i, texto: i }))]} /></Campo>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Formas decorativas <span className="font-normal text-muted-foreground">(hasta 3)</span></label>
        {spec.shapes.map((f, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-lg border p-1.5">
            <div className="w-24"><Selector valor={f.kind} onChange={(v) => forma(i, { kind: v })} opciones={FORMAS.map(([v, t]) => ({ valor: v, texto: t }))} /></div>
            <div className="w-28"><Selector valor={f.at} onChange={(v) => forma(i, { at: v })} opciones={POSICIONES.map(([v, t]) => ({ valor: v, texto: t }))} /></div>
            <div className="w-20"><Selector valor={f.size} onChange={(v) => forma(i, { size: v })} opciones={[{ valor: "s", texto: "Pequeña" }, { valor: "m", texto: "Media" }, { valor: "l", texto: "Grande" }]} /></div>
            <div className="w-24"><Selector valor={f.tone} onChange={(v) => forma(i, { tone: v })} opciones={[{ valor: "accent", texto: "Acento" }, { valor: "soft", texto: "Suave" }, { valor: "contrast", texto: "Contraste" }]} /></div>
            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => cambia({ shapes: spec.shapes.filter((_, j) => j !== i) })} title="Quitar"><X className="size-3.5" /></Button>
          </div>
        ))}
        {spec.shapes.length < 3 && <Button type="button" size="sm" variant="ghost" onClick={() => cambia({ shapes: [...spec.shapes, { kind: "circle", at: "br", size: "m", tone: "soft" }] })}><Plus className="size-3.5" />Añadir forma</Button>}
      </div>
      <Button size="sm" disabled={bloqueado || guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar diseño"}</Button>
    </div>
  );
}

// ───────────── previsualización de la escena activa ─────────────

function PrevisualizacionEscena({ reelId, escena }: { reelId: number; escena: EscenaReel }) {
  if (!escena.dibujable) {
    return (
      <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 rounded-lg border bg-muted p-6 text-center text-sm text-muted-foreground">
        <p>«{NOMBRE_TIPO_VISUAL[escena.visual_type]}» necesita un vídeo, foto o activo real.</p>
        <p className="text-xs">El sistema no la dibuja; hace falta subir o elegir un activo (próximamente).</p>
      </div>
    );
  }
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border bg-muted shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={`${escena.id}:${escena.version}`} src={urlEscenaImagen(reelId, escena.id)} alt={`Escena ${escena.position}`} className="size-full object-contain" />
    </div>
  );
}

// ───────────── vídeo montado (Fase 5) ─────────────

function VideoMontado({ reelId, updatedAt, qa }: { reelId: number; updatedAt: string; qa: { passed: boolean; issues: string[] } | null }) {
  return (
    <section className="space-y-2 rounded-lg border p-3.5">
      <div className="flex items-center gap-2">
        <Film className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Vídeo montado</h3>
        {qa && (
          <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium", qa.passed ? "bg-green-500/15 text-green-700 dark:text-green-300" : "bg-red-500/10 text-red-700 dark:text-red-300")}>
            {qa.passed ? "Control de calidad: OK" : `Control de calidad: ${qa.issues.length} problema${qa.issues.length === 1 ? "" : "s"}`}
          </span>
        )}
      </div>
      <video key={`${reelId}:${updatedAt}`} controls playsInline className="mx-auto block max-h-[70vh] w-auto rounded-lg border bg-black" style={{ aspectRatio: "9/16" }}>
        <source src={urlVideoReel(reelId, updatedAt)} type="video/mp4" />
      </video>
      {qa && !qa.passed && qa.issues.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-red-700 dark:text-red-300">
          {qa.issues.map((i, idx) => <li key={idx}>{i}</li>)}
        </ul>
      )}
    </section>
  );
}

// ───────────── editor principal ─────────────

export function EditorReel({ id, onVolver }: { id: number; onVolver: () => void }) {
  const { datos, error, cargando, recargar } = useReel(id);
  const [activaId, setActivaId] = useState<number | null>(null);
  const [orden, setOrden] = useState<number[] | null>(null);
  const [conf, setConf] = useState<Confirmacion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [pestana, setPestana] = useState("texto");

  const trabajando = datos?.job?.state === "running";
  const bloqueado = trabajando || ocupado;

  const vigilando = useRef(false);
  useEffect(() => {
    const j = datos?.job;
    if (!j) return;
    if (j.state === "running") vigilando.current = true;
    else if (vigilando.current) {
      vigilando.current = false;
      if (j.state === "done") toast.success("Listo: el reel está actualizado");
      else toast.error(j.error || "La generación ha fallado");
    }
  }, [datos?.job]);

  if (error && !datos) return <div className="space-y-3"><Button variant="ghost" size="sm" onClick={onVolver}><ArrowLeft className="size-4" />Volver</Button><ErrorCaja mensaje={error} /></div>;
  if (!datos) return cargando ? <CargandoFilas /> : null;

  const r = datos.reel;
  const editable = !["published", "scheduled"].includes(r.status);
  const porOrden = orden ? orden.map((i) => datos.scenes.find((s) => s.id === i)).filter((s): s is EscenaReel => !!s) : datos.scenes;
  const escenas = porOrden.length === datos.scenes.length ? porOrden : datos.scenes;
  const activa = escenas.find((s) => s.id === activaId) ?? escenas[0] ?? null;
  const clave = activa ? `${activa.id}:${activa.version}` : "sin-escena";

  const accion = async (metodo: "POST" | "DELETE", ruta: string, cuerpo: unknown, ok?: string) => {
    setOcupado(true);
    try {
      const res = await enviarV2<Record<string, unknown>>(metodo, ruta, cuerpo);
      if (ok) toast.success(ok);
      await recargar();
      return res;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
      return null;
    } finally {
      setOcupado(false);
    }
  };

  const reordenar = async (nuevo: number[]) => {
    setOrden(nuevo);
    await accion("POST", `${base(id)}/scenes/reorder`, { order: nuevo });
    setOrden(null);
  };

  const cabeceraJob = trabajando && datos.job && (
    <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <p className="font-medium">{datos.job.etapa}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{datos.job.progreso}%</p>
      </div>
      <Progreso valor={datos.job.progreso} />
      <p className="text-xs text-muted-foreground">La IA local trabaja en segundo plano: puedes salir de esta pantalla y volver, no se pierde nada.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onVolver}><ArrowLeft className="size-4" />Reels</Button>
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{r.title}</h2>
        <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium", ESTADO_REEL_TEXTO[r.status].clase)}>{ESTADO_REEL_TEXTO[r.status].texto}</span>
      </div>

      {cabeceraJob}
      {datos.job?.state === "error" && !trabajando && <ErrorCaja mensaje={`La última generación falló: ${datos.job.error ?? "error desconocido"}. Puedes volver a intentarlo.`} />}
      {r.status === "review" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          Enviado a revisión. Apruébalo o recházalo en <Link href="/agentes-v2/aprobaciones" className="font-medium underline underline-offset-2">Aprobaciones</Link>. Si lo editas, vuelve a «Escenas listas».
        </div>
      )}
      {r.status === "approved" && <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm">Aprobado. Todavía no se ha publicado nada: la publicación de Reels aún no está conectada.</div>}
      {r.status === "failed" && <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">El control de calidad encontró problemas (los tienes debajo, junto al vídeo). Corrígelos y vuelve a renderizar.</div>}

      <div className="flex flex-wrap items-center gap-2">
        {!escenas.length && !trabajando && <Button size="sm" disabled={bloqueado} onClick={() => accion("POST", `${base(id)}/generate`, {}, "La IA está escribiendo el guion")}>Generar ahora</Button>}
        {escenas.length > 0 && ["generating", "qa", "failed"].includes(r.status) && (
          <Button size="sm" disabled={bloqueado || !editable} onClick={() => accion("POST", `${base(id)}/render`, {}, "Dibujando las escenas y montando el vídeo…")}>{r.rendered_at ? "Volver a renderizar" : "Renderizar vídeo"}</Button>
        )}
        {r.status === "qa" && r.qa_result?.passed && (
          <Button size="sm" variant="outline" disabled={bloqueado} onClick={() => setConf({ titulo: "Enviar a revisión", texto: "Se crea una aprobación en «Aprobaciones». Aprobarlo no publica nada.", boton: "Enviar a revisión", accion: async () => void (await accion("POST", `${base(id)}/review`, {}, "Enviado a revisión")) })}>Enviar a revisión</Button>
        )}
        {r.hook && (
          <>
            <Button size="sm" variant="outline" disabled={!r.subtitles_srt} onClick={() => r.subtitles_srt && descargarTexto(`${r.id}.srt`, r.subtitles_srt)}><Download className="size-3.5" />SRT</Button>
            <Button size="sm" variant="outline" disabled={!r.subtitles_vtt} onClick={() => r.subtitles_vtt && descargarTexto(`${r.id}.vtt`, r.subtitles_vtt)}><Download className="size-3.5" />VTT</Button>
          </>
        )}
        <Button size="sm" variant="ghost" disabled={bloqueado || !editable} onClick={() => setConf({ titulo: "Rehacer todo el reel", texto: "La IA vuelve a escribir el guion, las escenas y los subtítulos. Se sustituye todo lo actual. Tarda 2-3 minutos.", boton: "Rehacer todo", peligro: true, accion: async () => void (await accion("POST", `${base(id)}/generate`, {}, "La IA está rehaciendo el reel")) })}>Rehacer todo</Button>
        <Button size="sm" variant="ghost" className="ml-auto text-red-600" disabled={bloqueado || !editable} onClick={() => setConf({ titulo: "Eliminar reel", texto: `Se borra «${r.title}» con sus escenas. No se puede deshacer.`, boton: "Eliminar", peligro: true, accion: async () => { const res = await accion("DELETE", base(id), undefined, "Reel eliminado"); if (res) onVolver(); } })}>Eliminar</Button>
      </div>

      {r.hook && (
        <section className="space-y-1.5 rounded-lg border p-3.5">
          <p className="text-sm font-medium">«{r.hook}»</p>
          {r.script && <p className="text-sm text-muted-foreground">{r.script}</p>}
        </section>
      )}

      {r.rendered_at && !trabajando && <VideoMontado reelId={id} updatedAt={r.updated_at} qa={r.qa_result} />}

      {escenas.length === 0 || !activa ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {trabajando ? "Escribiendo el guion…" : "Este reel todavía no tiene escenas."}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,260px)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Escenas ({escenas.length})</p>
            <TiraEscenas escenas={escenas} reelId={id} activa={activa.id} onElegir={setActivaId} onReordenar={reordenar} bloqueada={bloqueado || !editable} />
          </div>
          <PrevisualizacionEscena reelId={id} escena={activa} />
          <div className="min-w-0">
            <Tabs value={pestana} onValueChange={(v) => setPestana(String(v))}>
              <TabsList variant="line" className="mb-2">
                <TabsTrigger value="texto">Texto</TabsTrigger>
                <TabsTrigger value="diseno">Diseño</TabsTrigger>
              </TabsList>
              <TabsContent value="texto"><EditorEscenaTexto key={clave} reelId={id} escena={activa} bloqueado={bloqueado || !editable} alGuardar={() => void recargar()} /></TabsContent>
              <TabsContent value="diseno"><EditorEscenaDiseno key={clave} reelId={id} escena={activa} bloqueado={bloqueado || !editable} alGuardar={() => void recargar()} /></TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      <Confirmar c={conf} onCerrar={() => setConf(null)} />
    </div>
  );
}
