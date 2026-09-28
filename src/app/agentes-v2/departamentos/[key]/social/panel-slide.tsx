"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enviarV2 } from "@/components/agentes-v2/use-v2";
import { cn } from "@/lib/utils";
import { ElegirActivo } from "./activos";
import { Campo, Selector, TextoLimitado, fechaCorta } from "./campos";
import { LIMITES, nombreTipo, urlImagen, type ContenidoSlide, type Diseno, type Forma, type Slide } from "./use-social";

const base = (carruselId: number, slideId: number) => `social/carousels/${carruselId}/slides/${slideId}`;

// ───────────── texto ─────────────

function ListaEditable({ etiqueta, valores, onChange, min, max, maxLen }: { etiqueta: string; valores: string[]; onChange: (v: string[]) => void; min: number; max: number; maxLen: number }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{etiqueta} <span className="font-normal text-muted-foreground">({min}–{max})</span></label>
      {valores.map((v, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input value={v} onChange={(e) => onChange(valores.map((x, j) => (j === i ? e.target.value : x)))} className={cn("h-8 text-sm", v.length > maxLen && "border-red-500")} />
          <span className={cn("w-10 shrink-0 text-right text-[10px] tabular-nums", v.length > maxLen ? "font-medium text-red-600" : "text-muted-foreground")}>{v.length}/{maxLen}</span>
          <Button type="button" variant="ghost" size="icon" className="size-7" disabled={valores.length <= min} onClick={() => onChange(valores.filter((_, j) => j !== i))} title="Quitar"><X className="size-3.5" /></Button>
        </div>
      ))}
      {valores.length < max && <Button type="button" size="sm" variant="ghost" onClick={() => onChange([...valores, ""])}><Plus className="size-3.5" />Añadir</Button>}
    </div>
  );
}

const limpiarLista = (l: string[] | null | undefined) => (l ?? []).map((x) => x.trim()).filter(Boolean);

function EditorTexto({ slide, carruselId, bloqueado, alGuardar, onCambio }: { slide: Slide; carruselId: number; bloqueado: boolean; alGuardar: () => void; onCambio: (c: object | null) => void }) {
  const [headline, setHeadline] = useState(slide.headline ?? "");
  const [body, setBody] = useState(slide.body ?? "");
  const [cta, setCta] = useState(slide.cta ?? "");
  const [c, setC] = useState<ContenidoSlide>(() => structuredClone(slide.content ?? {}));
  const [guardando, setGuardando] = useState(false);
  const t = slide.type;

  const items = c.items ?? [];
  const izq = c.left ?? { title: "", points: [] };
  const der = c.right ?? { title: "", points: [] };
  const celdas = c.cells ?? [];
  const stat = c.stat ?? { value: "", label: "" };
  const cita = c.quote ?? { text: "", author: "" };

  const muestraBody = ["cover", "body_card", "body_step", "cta", "image_text", "body_stat"].includes(t);
  const muestraHeadline = t !== "body_stat";

  const excede =
    headline.length > LIMITES.headline(t) || (muestraBody && body.length > LIMITES.body(t)) || cta.length > LIMITES.boton ||
    (t === "body_stat" && (stat.value.length > LIMITES.statValor || stat.label.length > LIMITES.statEtiqueta)) ||
    (t === "body_quote" && (cita.text.length > LIMITES.cita || (cita.author ?? "").length > LIMITES.autor)) ||
    items.some((x) => x.length > LIMITES.itemLista) ||
    [izq, der].some((k) => k.title.length > LIMITES.compTitulo || k.points.some((p) => p.length > LIMITES.compPunto)) ||
    celdas.some((x) => x.title.length > LIMITES.celdaTitulo || (x.text ?? "").length > LIMITES.celdaTexto);

  const armar = (): ContenidoSlide => {
    const content: ContenidoSlide = { ...c };
    if (t === "body_list") content.items = limpiarLista(items);
    if (t === "body_comparison") {
      content.left = { title: izq.title.trim(), points: limpiarLista(izq.points) };
      content.right = { title: der.title.trim(), points: limpiarLista(der.points) };
    }
    if (t === "grid") content.cells = celdas.filter((x) => x.title.trim()).map((x) => ({ title: x.title.trim(), text: (x.text ?? "").trim() || null }));
    if (t === "body_stat") content.stat = { value: stat.value.trim(), label: stat.label.trim() };
    if (t === "body_quote") content.quote = { text: cita.text.trim(), author: (cita.author ?? "").trim() || null };
    return content;
  };
  const cambios = { headline: headline.trim(), body: body.trim(), cta: cta.trim() || null, content: armar() };
  const claveCambios = JSON.stringify(cambios);
  const [inicial] = useState(claveCambios);
  const sinGuardar = claveCambios !== inicial;
  useEffect(() => {
    onCambio(sinGuardar && !excede ? JSON.parse(claveCambios) : null);
    return () => onCambio(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveCambios, sinGuardar, excede]);

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await enviarV2<{ aviso?: string | null }>("PATCH", base(carruselId, slide.id), cambios);
      if (r.aviso) toast.warning(r.aviso);
      else toast.success("Slide guardada y dibujada de nuevo");
      alGuardar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Tipo: <span className="font-medium text-foreground">{nombreTipo(t)}</span>. Al guardar se dibuja de nuevo solo esta slide.</p>
      {muestraHeadline && <TextoLimitado etiqueta={t === "body_comparison" ? "Título de la comparación" : "Título"} valor={headline} onChange={setHeadline} max={LIMITES.headline(t)} filas={2} />}
      {t === "body_stat" && (
        <>
          <TextoLimitado etiqueta="Cifra o dato" valor={stat.value} onChange={(v) => setC({ ...c, stat: { ...stat, value: v } })} max={LIMITES.statValor} ayuda="Solo un dato real que tengas; la IA no se inventa cifras." />
          <TextoLimitado etiqueta="Qué significa" valor={stat.label} onChange={(v) => setC({ ...c, stat: { ...stat, label: v } })} max={LIMITES.statEtiqueta} filas={2} />
        </>
      )}
      {t === "body_step" && (
        <Campo etiqueta="Número de paso">
          <Input type="number" min={1} max={99} value={c.step?.number ?? slide.position - 1} onChange={(e) => setC({ ...c, step: { number: Math.max(1, Math.min(99, Number(e.target.value) || 1)) } })} className="h-8 w-24 text-sm" />
        </Campo>
      )}
      {muestraBody && <TextoLimitado etiqueta="Texto" valor={body} onChange={setBody} max={LIMITES.body(t)} filas={3} />}
      {t === "body_list" && <ListaEditable etiqueta="Puntos" valores={items} onChange={(v) => setC({ ...c, items: v })} min={3} max={5} maxLen={LIMITES.itemLista} />}
      {t === "body_comparison" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {([["Columna izquierda", izq, "left"], ["Columna derecha", der, "right"]] as const).map(([nom, k, lado]) => (
            <div key={lado} className="space-y-2 rounded-lg border p-2.5">
              <TextoLimitado etiqueta={`${nom}: título`} valor={k.title} onChange={(v) => setC({ ...c, [lado]: { ...k, title: v } })} max={LIMITES.compTitulo} />
              <ListaEditable etiqueta="Puntos" valores={k.points} onChange={(v) => setC({ ...c, [lado]: { ...k, points: v } })} min={1} max={4} maxLen={LIMITES.compPunto} />
            </div>
          ))}
        </div>
      )}
      {t === "grid" && (
        <div className="space-y-2">
          <label className="text-xs font-medium">Celdas <span className="font-normal text-muted-foreground">(4–6)</span></label>
          {celdas.map((x, i) => (
            <div key={i} className="flex items-start gap-1.5 rounded-lg border p-2">
              <div className="grid flex-1 gap-1.5">
                <Input value={x.title} placeholder="Título" onChange={(e) => setC({ ...c, cells: celdas.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)) })} className={cn("h-8 text-sm", x.title.length > LIMITES.celdaTitulo && "border-red-500")} />
                <Input value={x.text ?? ""} placeholder="Texto corto (opcional)" onChange={(e) => setC({ ...c, cells: celdas.map((y, j) => (j === i ? { ...y, text: e.target.value } : y)) })} className={cn("h-8 text-sm", (x.text ?? "").length > LIMITES.celdaTexto && "border-red-500")} />
              </div>
              <Button type="button" variant="ghost" size="icon" className="size-7" disabled={celdas.length <= 4} onClick={() => setC({ ...c, cells: celdas.filter((_, j) => j !== i) })} title="Quitar"><X className="size-3.5" /></Button>
            </div>
          ))}
          {celdas.length < 6 && <Button type="button" size="sm" variant="ghost" onClick={() => setC({ ...c, cells: [...celdas, { title: "", text: "" }] })}><Plus className="size-3.5" />Añadir celda</Button>}
        </div>
      )}
      {t === "body_quote" && (
        <>
          <TextoLimitado etiqueta="Cita" valor={cita.text} onChange={(v) => setC({ ...c, quote: { ...cita, text: v } })} max={LIMITES.cita} filas={3} ayuda="Usa solo citas reales y con su autor." />
          <TextoLimitado etiqueta="Autor (opcional)" valor={cita.author ?? ""} onChange={(v) => setC({ ...c, quote: { ...cita, author: v } })} max={LIMITES.autor} />
        </>
      )}
      {t === "image_text" && (
        <Campo etiqueta="Imagen" ayuda="PNG, JPEG o WebP de hasta 1,4 MB. Sin imagen se usa una forma decorativa.">
          <ElegirActivo kind="image" valor={c.image?.assetId ?? null} onChange={(id) => setC({ ...c, image: { assetId: id } })} />
        </Campo>
      )}
      {t === "cta" && <TextoLimitado etiqueta="Texto del botón" valor={cta} onChange={setCta} max={LIMITES.boton} />}
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
const FORMAS = [["circle", "Círculo"], ["ring", "Anillo"], ["blob", "Mancha"], ["bar", "Barra"], ["dots", "Puntos"], ["grid", "Cuadrícula"], ["diagonal", "Diagonal"]] as const;
const POSICIONES = [["tl", "Arriba izq."], ["tr", "Arriba der."], ["bl", "Abajo izq."], ["br", "Abajo der."], ["c", "Centro"], ["l", "Izquierda"], ["r", "Derecha"]] as const;
const ICONOS = ["check", "x", "arrow", "star", "bolt", "target", "chart", "users", "clock", "mail", "chat", "heart", "bulb", "shield", "rocket", "money"];

function EditorDiseno({ slide, carruselId, bloqueado, alGuardar, onCambio }: { slide: Slide; carruselId: number; bloqueado: boolean; alGuardar: () => void; onCambio: (c: object | null) => void }) {
  const [d, setD] = useState<Diseno>(() => structuredClone(slide.design_spec));
  const claveDiseno = JSON.stringify(d);
  const [inicialDiseno] = useState(claveDiseno);
  useEffect(() => {
    onCambio(claveDiseno !== inicialDiseno ? { design: JSON.parse(claveDiseno) } : null);
    return () => onCambio(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDiseno, inicialDiseno]);
  const [guardando, setGuardando] = useState(false);
  const cambia = (p: Partial<Diseno>) => setD({ ...d, ...p });
  const forma = (i: number, p: Partial<Forma>) => cambia({ shapes: d.shapes.map((f, j) => (j === i ? { ...f, ...p } : f)) });

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await enviarV2<{ aviso?: string | null }>("PATCH", base(carruselId, slide.id), { design: d });
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
            <button key={p.valor} type="button" onClick={() => cambia({ palette: p.valor })} className={cn("flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-xs", d.palette === p.valor ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted")}>
              <span className="size-5 rounded-full border" style={{ background: p.muestra }} />{p.texto}
            </button>
          ))}
        </div>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Composición"><Selector valor={d.variant} onChange={(v) => cambia({ variant: v })} opciones={[{ valor: "a", texto: "Estilo A" }, { valor: "b", texto: "Estilo B" }, { valor: "c", texto: "Estilo C" }]} /></Campo>
        <Campo etiqueta="Alineación"><Selector valor={d.align} onChange={(v) => cambia({ align: v })} opciones={[{ valor: "left", texto: "A la izquierda" }, { valor: "center", texto: "Centrado" }]} /></Campo>
        <Campo etiqueta="Tamaño del texto"><Selector valor={d.scale} onChange={(v) => cambia({ scale: v })} opciones={[{ valor: "xl", texto: "Muy grande" }, { valor: "l", texto: "Grande" }, { valor: "m", texto: "Mediano" }]} /></Campo>
        <Campo etiqueta="Énfasis"><Selector valor={d.emphasis} onChange={(v) => cambia({ emphasis: v })} opciones={[{ valor: "none", texto: "Ninguno" }, { valor: "underline", texto: "Subrayado" }, { valor: "highlight", texto: "Resaltado" }]} /></Campo>
        <Campo etiqueta="Icono"><Selector valor={d.icon ?? ""} onChange={(v) => cambia({ icon: v || null })} opciones={[{ valor: "", texto: "Sin icono" }, ...ICONOS.map((i) => ({ valor: i, texto: i }))]} /></Campo>
        <Campo etiqueta="Imagen"><Selector valor={d.imageFit} onChange={(v) => cambia({ imageFit: v })} opciones={[{ valor: "cover", texto: "Rellenar" }, { valor: "contain", texto: "Ajustar" }]} /></Campo>
      </div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={d.compact} onChange={(e) => cambia({ compact: e.target.checked })} className="accent-primary" />Espaciado compacto</label>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Formas decorativas <span className="font-normal text-muted-foreground">(hasta 3)</span></label>
        {d.shapes.map((f, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-lg border p-1.5">
            <div className="w-24"><Selector valor={f.kind} onChange={(v) => forma(i, { kind: v })} opciones={FORMAS.map(([v, t]) => ({ valor: v, texto: t }))} /></div>
            <div className="w-28"><Selector valor={f.at} onChange={(v) => forma(i, { at: v })} opciones={POSICIONES.map(([v, t]) => ({ valor: v, texto: t }))} /></div>
            <div className="w-20"><Selector valor={f.size} onChange={(v) => forma(i, { size: v })} opciones={[{ valor: "s", texto: "Pequeña" }, { valor: "m", texto: "Media" }, { valor: "l", texto: "Grande" }]} /></div>
            <div className="w-24"><Selector valor={f.tone} onChange={(v) => forma(i, { tone: v })} opciones={[{ valor: "accent", texto: "Acento" }, { valor: "soft", texto: "Suave" }, { valor: "contrast", texto: "Contraste" }]} /></div>
            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => cambia({ shapes: d.shapes.filter((_, j) => j !== i) })} title="Quitar"><X className="size-3.5" /></Button>
          </div>
        ))}
        {d.shapes.length < 3 && <Button type="button" size="sm" variant="ghost" onClick={() => cambia({ shapes: [...d.shapes, { kind: "circle", at: "br", size: "m", tone: "soft" }] })}><Plus className="size-3.5" />Añadir forma</Button>}
      </div>
      <Button size="sm" disabled={bloqueado || guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar diseño"}</Button>
    </div>
  );
}

// ───────────── versiones ─────────────

function Versiones({ slide, carruselId, bloqueado, alCambiar }: { slide: Slide; carruselId: number; bloqueado: boolean; alCambiar: () => void }) {
  const [trabajando, setTrabajando] = useState<number | null>(null);
  const restaurar = async (version: number) => {
    setTrabajando(version);
    try {
      await enviarV2("POST", `${base(carruselId, slide.id)}/restore`, { version });
      toast.success(`Versión ${version} restaurada`);
      alCambiar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo restaurar");
    } finally {
      setTrabajando(null);
    }
  };
  if (!slide.versions.length) return <p className="text-sm text-muted-foreground">Esta slide todavía no tiene versiones anteriores. Cada cambio guarda la versión previa (se conservan las últimas 8).</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Versión actual: <span className="font-medium text-foreground">{slide.version}</span>. Restaurar no borra nada: la versión actual también queda guardada.</p>
      {slide.versions.map((v) => (
        <div key={v.version} className="flex items-center gap-2.5 rounded-lg border p-2">
          <div className="aspect-[4/5] w-10 shrink-0 overflow-hidden rounded bg-muted">
            {v.has_render && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlImagen(carruselId, slide.id, v.version)} alt="" loading="lazy" className="size-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">Versión {v.version}</p>
            <p className="truncate text-[11px] text-muted-foreground">{v.reason || "Cambio"} · {fechaCorta(v.created_at)}</p>
          </div>
          <Button size="sm" variant="outline" disabled={bloqueado || trabajando !== null} onClick={() => restaurar(v.version)}>{trabajando === v.version ? "…" : "Restaurar"}</Button>
        </div>
      ))}
    </div>
  );
}

// ───────────── panel ─────────────

export function PanelSlide({ slide, carruselId, bloqueado, recargar, onTexto, onDiseno }: { slide: Slide; carruselId: number; bloqueado: boolean; recargar: () => void; onTexto: (c: object | null) => void; onDiseno: (c: object | null) => void }) {
  const [instruccion, setInstruccion] = useState("");
  const [lanzando, setLanzando] = useState(false);
  const [pestana, setPestana] = useState("texto");

  const regenerar = async (scope: "copy" | "design" | "both") => {
    setLanzando(true);
    try {
      await enviarV2("POST", `${base(carruselId, slide.id)}/regenerate`, { scope, instruction: instruccion.trim() || undefined });
      toast.success("La IA está rehaciendo esta slide");
      setInstruccion("");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo lanzar la regeneración");
    } finally {
      setLanzando(false);
    }
  };

  const clave = `${slide.id}:${slide.version}`;
  return (
    <div className="space-y-3">
      <Tabs value={pestana} onValueChange={(v) => setPestana(String(v))}>
        <TabsList variant="line" className="mb-2">
          <TabsTrigger value="texto">Texto</TabsTrigger>
          <TabsTrigger value="diseno">Diseño</TabsTrigger>
          <TabsTrigger value="ia">Rehacer</TabsTrigger>
          <TabsTrigger value="versiones">Versiones{slide.versions.length ? ` (${slide.versions.length})` : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="texto"><EditorTexto key={clave} slide={slide} carruselId={carruselId} bloqueado={bloqueado} alGuardar={recargar} onCambio={onTexto} /></TabsContent>
        <TabsContent value="diseno"><EditorDiseno key={clave} slide={slide} carruselId={carruselId} bloqueado={bloqueado} alGuardar={recargar} onCambio={onDiseno} /></TabsContent>
        <TabsContent value="ia">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Solo se rehace esta slide; el resto del carrusel no cambia y la versión actual queda guardada. Tarda entre 1 y 2 minutos.</p>
            <Campo etiqueta="Indicación (opcional)" ayuda="Ej.: «más directo», «menos texto», «que destaque el precio».">
              <Input value={instruccion} onChange={(e) => setInstruccion(e.target.value)} maxLength={300} className="h-8 text-sm" />
            </Campo>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={bloqueado || lanzando} onClick={() => regenerar("copy")}>Rehacer el texto</Button>
              <Button size="sm" variant="outline" disabled={bloqueado || lanzando} onClick={() => regenerar("design")}>Rehacer el diseño</Button>
              <Button size="sm" disabled={bloqueado || lanzando} onClick={() => regenerar("both")}>Rehacer texto y diseño</Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="versiones"><Versiones slide={slide} carruselId={carruselId} bloqueado={bloqueado} alCambiar={recargar} /></TabsContent>
      </Tabs>
    </div>
  );
}
