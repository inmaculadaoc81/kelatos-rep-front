"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enviarV2 } from "@/components/agentes-v2/use-v2";
import { CargandoFilas, ErrorCaja } from "@/components/agentes-v2/componentes";
import { cn } from "@/lib/utils";
import { Campo, EstadoBadge, Progreso, Selector, TextoLimitado } from "./campos";
import { LIMITES, type ContenidoSlide, type Diseno, type Forma } from "./use-social";
import { LAYOUT_A_TIPO, NOMBRE_PLATAFORMA, PLATAFORMAS_POST, urlImagenPost, usePost, type DetallePost } from "./use-posts";

const base = (id: number) => `social/posts/${id}`;

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

// ───────────── contenido (headline/body/cta/campos por layout + hashtags) ─────────────

function EditorContenido({ d, bloqueado, alGuardar }: { d: DetallePost; bloqueado: boolean; alGuardar: () => void }) {
  const p = d.post;
  const t = LAYOUT_A_TIPO[p.layout_type];
  const [headline, setHeadline] = useState(p.headline ?? "");
  const [body, setBody] = useState(p.body ?? "");
  const [cta, setCta] = useState(p.cta ?? "");
  const [tags, setTags] = useState((p.hashtags ?? []).map((h) => `#${h}`).join(" "));
  const [c, setC] = useState<ContenidoSlide>(() => structuredClone(p.content ?? {}));
  const [guardando, setGuardando] = useState(false);

  const izq = c.left ?? { title: "", points: [] };
  const der = c.right ?? { title: "", points: [] };
  const stat = c.stat ?? { value: "", label: "" };
  const cita = c.quote ?? { text: "", author: "" };
  const listaTags = tags.split(/[\s,]+/).map((h) => h.replace(/^#+/, "")).filter(Boolean);

  const muestraBody = t === "cover" || t === "body_card";
  const muestraHeadline = t !== "body_stat" && t !== "body_quote";

  const excede =
    (muestraHeadline && headline.length > LIMITES.headline(t)) || (muestraBody && body.length > LIMITES.body(t)) || cta.length > LIMITES.boton ||
    listaTags.length > LIMITES.hashtags ||
    (t === "body_stat" && (stat.value.length > LIMITES.statValor || stat.label.length > LIMITES.statEtiqueta)) ||
    (t === "body_quote" && (cita.text.length > LIMITES.cita || (cita.author ?? "").length > LIMITES.autor)) ||
    [izq, der].some((k) => k.title.length > LIMITES.compTitulo || k.points.some((pt) => pt.length > LIMITES.compPunto));

  const guardar = async () => {
    setGuardando(true);
    try {
      const content: ContenidoSlide = { ...c };
      if (t === "body_comparison") {
        content.left = { title: izq.title.trim(), points: izq.points.map((x) => x.trim()).filter(Boolean) };
        content.right = { title: der.title.trim(), points: der.points.map((x) => x.trim()).filter(Boolean) };
      }
      if (t === "body_stat") content.stat = { value: stat.value.trim(), label: stat.label.trim() };
      if (t === "body_quote") content.quote = { text: cita.text.trim(), author: (cita.author ?? "").trim() || null };
      const r = await enviarV2<{ aviso?: string | null }>("PATCH", `${base(p.id)}/content`, { headline: headline.trim(), body: body.trim(), cta: cta.trim() || null, content, hashtags: listaTags });
      if (r.aviso) toast.warning(r.aviso);
      else toast.success("Post guardado y dibujado de nuevo");
      alGuardar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
      {muestraHeadline && <TextoLimitado etiqueta={t === "body_comparison" ? "Título" : "Titular"} valor={headline} onChange={setHeadline} max={LIMITES.headline(t)} filas={2} />}
      {t === "body_stat" && (
        <>
          <TextoLimitado etiqueta="Cifra o dato" valor={stat.value} onChange={(v) => setC({ ...c, stat: { ...stat, value: v } })} max={LIMITES.statValor} ayuda="Solo un dato real; la IA no se inventa cifras." />
          <TextoLimitado etiqueta="Qué significa" valor={stat.label} onChange={(v) => setC({ ...c, stat: { ...stat, label: v } })} max={LIMITES.statEtiqueta} filas={2} />
        </>
      )}
      {muestraBody && <TextoLimitado etiqueta="Texto" valor={body} onChange={setBody} max={LIMITES.body(t)} filas={3} />}
      {t === "body_quote" && (
        <>
          <TextoLimitado etiqueta="Cita" valor={cita.text} onChange={(v) => setC({ ...c, quote: { ...cita, text: v } })} max={LIMITES.cita} filas={3} ayuda="Usa solo citas reales y con su autor." />
          <TextoLimitado etiqueta="Autor (opcional)" valor={cita.author ?? ""} onChange={(v) => setC({ ...c, quote: { ...cita, author: v } })} max={LIMITES.autor} />
        </>
      )}
      {t === "body_comparison" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {([["Antes", izq, "left"], ["Después", der, "right"]] as const).map(([nom, k, lado]) => (
            <div key={lado} className="space-y-2 rounded-lg border p-2.5">
              <TextoLimitado etiqueta={`${nom}: título`} valor={k.title} onChange={(v) => setC({ ...c, [lado]: { ...k, title: v } })} max={LIMITES.compTitulo} />
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Puntos <span className="font-normal text-muted-foreground">(2–4)</span></label>
                {k.points.map((v, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input value={v} onChange={(e) => setC({ ...c, [lado]: { ...k, points: k.points.map((x, j) => (j === i ? e.target.value : x)) } })} className={cn("h-8 text-sm", v.length > LIMITES.compPunto && "border-red-500")} />
                    <Button type="button" variant="ghost" size="icon" className="size-7" disabled={k.points.length <= 1} onClick={() => setC({ ...c, [lado]: { ...k, points: k.points.filter((_, j) => j !== i) } })}><X className="size-3.5" /></Button>
                  </div>
                ))}
                {k.points.length < 4 && <Button type="button" size="sm" variant="ghost" onClick={() => setC({ ...c, [lado]: { ...k, points: [...k.points, ""] } })}><Plus className="size-3.5" />Añadir</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <TextoLimitado etiqueta="Llamada a la acción (opcional)" valor={cta} onChange={setCta} max={LIMITES.boton} />
      <Campo etiqueta={`Hashtags (${listaTags.length}/${LIMITES.hashtags})`} ayuda="Separados por espacios.">
        <Input value={tags} onChange={(e) => setTags(e.target.value)} className="h-8 text-sm" />
      </Campo>
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" disabled={bloqueado || guardando || excede} onClick={guardar}>{guardando ? "Guardando…" : "Guardar cambios"}</Button>
        {excede && <span className="text-xs text-red-600">Hay textos por encima del límite.</span>}
      </div>
    </div>
  );
}

// ───────────── diseño ─────────────

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

function EditorDiseno({ d, bloqueado, alGuardar }: { d: DetallePost; bloqueado: boolean; alGuardar: () => void }) {
  const [spec, setSpec] = useState<Diseno>(() => ({ ...DISENO_POR_DEFECTO, ...structuredClone(d.post.design_spec ?? {}) }));
  const [guardando, setGuardando] = useState(false);
  const cambia = (p: Partial<Diseno>) => setSpec({ ...spec, ...p });
  const forma = (i: number, p: Partial<Forma>) => cambia({ shapes: spec.shapes.map((f, j) => (j === i ? { ...f, ...p } : f)) });

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await enviarV2<{ aviso?: string | null }>("PATCH", `${base(d.post.id)}/content`, { design: spec });
      if (r.aviso) toast.warning(r.aviso);
      else toast.success("Diseño guardado");
      alGuardar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
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
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={spec.compact} onChange={(e) => cambia({ compact: e.target.checked })} className="accent-primary" />Espaciado compacto</label>
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

// ───────────── plataformas ─────────────

function Plataformas({ d, bloqueado, recargar }: { d: DetallePost; bloqueado: boolean; recargar: () => void }) {
  const [lanzando, setLanzando] = useState(false);
  const variantes = d.post.platform_variants ?? {};
  const readaptar = async () => {
    setLanzando(true);
    try {
      await enviarV2("POST", `${base(d.post.id)}/regenerate`, { scope: "platforms" });
      toast.success("La IA está readaptando el copy por plataforma");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo lanzar la readaptación");
    } finally {
      setLanzando(false);
    }
  };
  const hay = PLATAFORMAS_POST.some((k) => variantes[k]);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Mismo concepto, texto distinto en cada red (no un recorte del mismo texto).</p>
        <Button size="sm" variant="outline" disabled={bloqueado || lanzando} onClick={readaptar}>{lanzando ? "Readaptando…" : "Readaptar"}</Button>
      </div>
      {!hay && <p className="text-sm text-muted-foreground">Todavía no hay copy adaptado por plataforma.</p>}
      {PLATAFORMAS_POST.map((k) => {
        const v = variantes[k];
        if (!v) return null;
        return (
          <div key={k} className="space-y-1.5 rounded-lg border p-3">
            <p className="text-xs font-semibold">{NOMBRE_PLATAFORMA[k]}</p>
            <p className="text-sm font-medium">{v.headline}</p>
            {v.body && <p className="text-sm text-muted-foreground">{v.body}</p>}
            {v.cta && <p className="text-xs font-medium text-primary">{v.cta}</p>}
            {v.hashtags.length > 0 && <p className="text-[11px] text-muted-foreground">{v.hashtags.map((h) => `#${h}`).join(" ")}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ───────────── rehacer ─────────────

function Rehacer({ d, bloqueado, recargar }: { d: DetallePost; bloqueado: boolean; recargar: () => void }) {
  const [lanzando, setLanzando] = useState<string | null>(null);
  const regenerar = async (alcance: "content" | "design") => {
    setLanzando(alcance);
    try {
      await enviarV2("POST", `${base(d.post.id)}/regenerate`, { scope: alcance });
      toast.success(alcance === "content" ? "La IA está reescribiendo el post" : "La IA está rediseñando el post");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo lanzar la regeneración");
    } finally {
      setLanzando(null);
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Rehacer solo el texto o solo el diseño (no las dos cosas a la vez); la parte que no se toca queda igual. Tarda 1-2 minutos.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={bloqueado || !!lanzando} onClick={() => regenerar("content")}>{lanzando === "content" ? "Reescribiendo…" : "Rehacer el texto"}</Button>
        <Button size="sm" variant="outline" disabled={bloqueado || !!lanzando} onClick={() => regenerar("design")}>{lanzando === "design" ? "Rediseñando…" : "Rehacer el diseño"}</Button>
      </div>
    </div>
  );
}

// ───────────── editor principal ─────────────

export function EditorPost({ id, onVolver }: { id: number; onVolver: () => void }) {
  const { datos, error, cargando, recargar } = usePost(id);
  const [conf, setConf] = useState<Confirmacion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [pestana, setPestana] = useState("contenido");

  const trabajando = datos?.job?.state === "running";
  const bloqueado = trabajando || ocupado;

  const vigilando = useRef(false);
  useEffect(() => {
    const j = datos?.job;
    if (!j) return;
    if (j.state === "running") vigilando.current = true;
    else if (vigilando.current) {
      vigilando.current = false;
      if (j.state === "done") toast.success("Listo: el post está actualizado");
      else toast.error(j.error || "La generación ha fallado");
    }
  }, [datos?.job]);

  if (error && !datos) return <div className="space-y-3"><Button variant="ghost" size="sm" onClick={onVolver}><ArrowLeft className="size-4" />Volver</Button><ErrorCaja mensaje={error} /></div>;
  if (!datos) return cargando ? <CargandoFilas /> : null;

  const p = datos.post;
  const editable = !["published", "scheduled"].includes(p.status);
  const clave = `${p.id}:${p.version}`;

  const accion = async (metodo: "POST" | "DELETE", ruta: string, cuerpo: unknown, ok?: string) => {
    setOcupado(true);
    try {
      const r = await enviarV2<Record<string, unknown>>(metodo, ruta, cuerpo);
      if (ok) toast.success(ok);
      await recargar();
      return r;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
      return null;
    } finally {
      setOcupado(false);
    }
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
        <Button variant="ghost" size="sm" onClick={onVolver}><ArrowLeft className="size-4" />Posts</Button>
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{p.title}</h2>
        <EstadoBadge estado={p.status} />
      </div>

      {cabeceraJob}
      {datos.job?.state === "error" && !trabajando && <ErrorCaja mensaje={`La última generación falló: ${datos.job.error ?? "error desconocido"}. Puedes volver a intentarlo.`} />}
      {p.status === "review" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          Enviado a revisión. Apruébalo o recházalo en <Link href="/agentes-v2/aprobaciones" className="font-medium underline underline-offset-2">Aprobaciones</Link>. Si lo editas, vuelve a «Generado».
        </div>
      )}
      {p.status === "approved" && <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm">Aprobado. Todavía no se ha publicado nada: la publicación de Posts aún no está conectada.</div>}
      {p.status === "rejected" && <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">Rechazado en Aprobaciones. Corrige lo que haga falta y vuelve a enviarlo a revisión.</div>}

      <div className="flex flex-wrap items-center gap-2">
        {!datos.rendered && !trabajando && <Button size="sm" disabled={bloqueado} onClick={() => accion("POST", `${base(id)}/generate`, {}, "La IA está generando el post")}>Generar ahora</Button>}
        <Button size="sm" variant="outline" disabled={bloqueado || !["generated", "rejected"].includes(p.status) || !datos.rendered} onClick={() => setConf({ titulo: "Enviar a revisión", texto: "Se crea una aprobación en «Aprobaciones». Aprobarlo no publica nada.", boton: "Enviar a revisión", accion: async () => void (await accion("POST", `${base(id)}/review`, {}, "Enviado a revisión")) })}>Enviar a revisión</Button>
        <Button size="sm" variant="ghost" disabled={bloqueado || !editable} onClick={() => setConf({ titulo: "Rehacer todo el post", texto: "La IA vuelve a escribir el copy, el diseño y las variantes por plataforma. Se sustituye todo lo actual. Tarda 1-2 minutos.", boton: "Rehacer todo", peligro: true, accion: async () => void (await accion("POST", `${base(id)}/generate`, {}, "La IA está rehaciendo el post")) })}>Rehacer todo</Button>
        <Button size="sm" variant="ghost" className="ml-auto text-red-600" disabled={bloqueado || !editable} onClick={() => setConf({ titulo: "Eliminar post", texto: `Se borra «${p.title}» con su imagen. No se puede deshacer.`, boton: "Eliminar", peligro: true, accion: async () => { const r = await accion("DELETE", base(id), undefined, "Post eliminado"); if (r) onVolver(); } })}>Eliminar</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border bg-muted shadow-sm">
            {datos.rendered ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlImagenPost(id, p.version, p.updated_at)} alt={p.title} className="size-full object-contain" />
            ) : (
              <div className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">{trabajando ? "Preparando la imagen…" : "Este post todavía no está dibujado."}</div>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <Tabs value={pestana} onValueChange={(v) => setPestana(String(v))}>
            <TabsList variant="line" className="mb-2">
              <TabsTrigger value="contenido">Contenido</TabsTrigger>
              <TabsTrigger value="diseno">Diseño</TabsTrigger>
              <TabsTrigger value="plataformas">Plataformas</TabsTrigger>
              <TabsTrigger value="rehacer">Rehacer</TabsTrigger>
            </TabsList>
            <TabsContent value="contenido"><EditorContenido key={clave} d={datos} bloqueado={bloqueado || !editable} alGuardar={() => void recargar()} /></TabsContent>
            <TabsContent value="diseno"><EditorDiseno key={clave} d={datos} bloqueado={bloqueado || !editable} alGuardar={() => void recargar()} /></TabsContent>
            <TabsContent value="plataformas"><Plataformas d={datos} bloqueado={bloqueado || !editable} recargar={() => void recargar()} /></TabsContent>
            <TabsContent value="rehacer"><Rehacer d={datos} bloqueado={bloqueado || !editable} recargar={() => void recargar()} /></TabsContent>
          </Tabs>
        </div>
      </div>

      <Confirmar c={conf} onCerrar={() => setConf(null)} />
    </div>
  );
}
