"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { enviarV2 } from "@/components/agentes-v2/use-v2";
import { CargandoFilas, ErrorCaja } from "@/components/agentes-v2/componentes";
import { Campo, EstadoBadge, Progreso } from "./campos";
import { PanelSlide } from "./panel-slide";
import { TiraSlides } from "./tira-slides";
import { LIMITES, useCarrusel, type DetalleCarrusel } from "./use-social";
import { VistaPrevia } from "./vista-previa";

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

/** Título, texto de la publicación y hashtags (se guardan aparte de las slides). */
function Publicacion({ d, recargar, bloqueado }: { d: DetalleCarrusel; recargar: () => void; bloqueado: boolean }) {
  const c = d.carousel;
  const [titulo, setTitulo] = useState(c.title);
  const [caption, setCaption] = useState(c.caption ?? "");
  const [tags, setTags] = useState((c.hashtags ?? []).map((h) => `#${h}`).join(" "));
  const [guardando, setGuardando] = useState(false);
  const lista = tags.split(/[\s,]+/).map((h) => h.replace(/^#+/, "")).filter(Boolean);

  const guardar = async () => {
    setGuardando(true);
    try {
      await enviarV2("PATCH", `social/carousels/${c.id}`, { title: titulo, caption, hashtags: lista });
      toast.success("Publicación guardada");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">Texto de la publicación</h3>
        <p className="text-xs text-muted-foreground">Lo que acompaña al carrusel al publicarlo. Va incluido en la exportación.</p>
      </div>
      <Campo etiqueta="Título interno"><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} className="h-8 text-sm" /></Campo>
      <Campo etiqueta={`Caption (${caption.length}/${LIMITES.caption})`}>
        <Textarea rows={5} value={caption} onChange={(e) => setCaption(e.target.value)} className="min-h-0 text-sm" />
      </Campo>
      <Campo etiqueta={`Hashtags (${lista.length}/${LIMITES.hashtags})`} ayuda="Separados por espacios.">
        <Input value={tags} onChange={(e) => setTags(e.target.value)} className="h-8 text-sm" />
      </Campo>
      <Button size="sm" disabled={bloqueado || guardando || caption.length > LIMITES.caption || lista.length > LIMITES.hashtags || !titulo.trim()} onClick={guardar}>{guardando ? "Guardando…" : "Guardar"}</Button>
    </section>
  );
}

export function EditorCarrusel({ id, onVolver }: { id: number; onVolver: () => void }) {
  const { datos, error, cargando, recargar } = useCarrusel(id);
  const [activaId, setActivaId] = useState<number | null>(null);
  const [orden, setOrden] = useState<number[] | null>(null);
  const [conf, setConf] = useState<Confirmacion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [bTexto, setBTexto] = useState<object | null>(null);
  const [bDiseno, setBDiseno] = useState<object | null>(null);

  const trabajando = datos?.job?.state === "running";
  const bloqueado = trabajando || ocupado;

  // Avisa cuando termina (o falla) un trabajo que se vio en marcha desde esta pantalla.
  const vigilando = useRef(false);
  useEffect(() => {
    const j = datos?.job;
    if (!j) return;
    if (j.state === "running") vigilando.current = true;
    else if (vigilando.current) {
      vigilando.current = false;
      if (j.state === "done") toast.success("Listo: el carrusel está actualizado");
      else toast.error(j.error || "La generación ha fallado");
    }
  }, [datos?.job]);

  if (error && !datos) return <div className="space-y-3"><Button variant="ghost" size="sm" onClick={onVolver}><ArrowLeft className="size-4" />Volver</Button><ErrorCaja mensaje={error} /></div>;
  if (!datos) return cargando ? <CargandoFilas /> : null;

  const c = datos.carousel;
  const porOrden = orden ? orden.map((i) => datos.slides.find((s) => s.id === i)).filter((s): s is NonNullable<typeof s> => !!s) : datos.slides;
  const slides = porOrden.length === datos.slides.length ? porOrden : datos.slides;
  const activa = slides.find((s) => s.id === activaId) ?? slides[0] ?? null;
  const cambiosSinGuardar = bTexto || bDiseno ? { ...(bTexto ?? {}), ...(bDiseno ?? {}) } : null;
  const ratio = c.format_info ? c.format_info.width / c.format_info.height : 4 / 5;
  const sinDibujar = datos.slides.filter((s) => !s.rendered).length;
  const editable = !["published", "scheduled"].includes(c.status);

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
  const base = `social/carousels/${id}`;
  const dibujar = () => accion("POST", `${base}/render`, {}, "Dibujando las slides…");

  const reordenar = async (nuevo: number[]) => {
    setOrden(nuevo);
    const r = await accion("POST", `${base}/reorder`, { order: nuevo });
    setOrden(null);
    if (r) await dibujar();
  };
  const exportar = async () => {
    const r = await accion("POST", `${base}/export`, {}, "Exportación lista: se descarga el ZIP");
    const idExp = Number(r?.exportId ?? (r?.result as { exportId?: number } | undefined)?.exportId);
    if (idExp) {
      const a = document.createElement("a");
      a.href = `/api/agentes-v2/social/exports/${idExp}/download`;
      a.click();
    }
    else if (r) toast.error("La exportación se creó pero no se recibió su identificador");
  };

  const cabeceraJob = trabajando && datos.job && (
    <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <p className="font-medium">{datos.job.etapa}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{datos.job.progreso}%</p>
      </div>
      <Progreso valor={datos.job.progreso} />
      <p className="text-xs text-muted-foreground">La IA local trabaja en segundo plano: puedes salir de esta pantalla y volver, no se pierde nada. Un carrusel completo tarda unos 3-5 minutos.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onVolver}><ArrowLeft className="size-4" />Carruseles</Button>
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{c.title}</h2>
        <EstadoBadge estado={c.status} />
      </div>

      {cabeceraJob}
      {datos.job?.state === "error" && !trabajando && <ErrorCaja mensaje={`La última generación falló: ${datos.job.error ?? "error desconocido"}. Puedes volver a intentarlo.`} />}
      {c.status === "review" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          Enviado a revisión. Apruébalo o recházalo en <Link href="/agentes-v2/aprobaciones" className="font-medium underline underline-offset-2">Aprobaciones</Link>. Si lo editas, vuelve a «Generado».
        </div>
      )}
      {c.status === "approved" && <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm">Aprobado. Todavía no se ha publicado nada: la publicación en redes aún no está conectada, así que descarga el ZIP y súbelo tú.</div>}
      {c.status === "rejected" && <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">Rechazado en Aprobaciones. Corrige lo que haga falta y vuelve a enviarlo a revisión.</div>}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={bloqueado || !editable || slides.length === 0 || sinDibujar > 0} onClick={exportar}>Exportar ZIP</Button>
        <Button size="sm" variant="outline" disabled={bloqueado || !["generated", "rejected"].includes(c.status) || sinDibujar > 0} onClick={() => setConf({ titulo: "Enviar a revisión", texto: "Se crea una aprobación en «Aprobaciones». Aprobarlo no publica nada.", boton: "Enviar a revisión", accion: async () => void (await accion("POST", `${base}/review`, {}, "Enviado a revisión")) })}>Enviar a revisión</Button>
        {sinDibujar > 0 && !trabajando && <Button size="sm" variant="outline" disabled={bloqueado} onClick={dibujar}>Dibujar {sinDibujar} slide{sinDibujar > 1 ? "s" : ""} pendiente{sinDibujar > 1 ? "s" : ""}</Button>}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <Button size="sm" variant="ghost" disabled={bloqueado || !editable || slides.length === 0} onClick={() => setConf({ titulo: "Nuevo diseño para todas las slides", texto: "La IA propone otro diseño para cada slide (el texto no cambia). Las versiones actuales quedan guardadas. Tarda 2-3 minutos.", boton: "Rehacer el diseño", accion: async () => void (await accion("POST", `${base}/regenerate-design`, {}, "La IA está rediseñando el carrusel")) })}>Rehacer todo el diseño</Button>
        <Button size="sm" variant="ghost" disabled={bloqueado || !editable} onClick={() => setConf({ titulo: "Rehacer todo el carrusel", texto: "La IA vuelve a planificar el contenido y a diseñar todas las slides. Se sustituyen los textos y diseños actuales. Tarda 3-5 minutos.", boton: "Rehacer todo", peligro: true, accion: async () => void (await accion("POST", `${base}/generate`, {}, "La IA está rehaciendo el carrusel")) })}>Rehacer todo</Button>
        <Button size="sm" variant="ghost" className="ml-auto text-red-600" disabled={bloqueado || !editable} onClick={() => setConf({ titulo: "Eliminar carrusel", texto: `Se borra «${c.title}» con todas sus slides, versiones e imágenes. No se puede deshacer.`, boton: "Eliminar", peligro: true, accion: async () => { const r = await accion("DELETE", base, undefined, "Carrusel eliminado"); if (r) onVolver(); } })}>Eliminar</Button>
      </div>

      {slides.length === 0 || !activa ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {trabajando ? "Preparando las slides…" : "Este carrusel todavía no tiene slides."}
          {!trabajando && editable && <div className="mt-3"><Button size="sm" disabled={bloqueado} onClick={() => accion("POST", `${base}/generate`, {}, "La IA está generando el carrusel")}>Generar ahora</Button></div>}
        </div>
      ) : (
        <div className="space-y-4">
          <TiraSlides slides={slides} carruselId={id} activa={activa.id} onElegir={setActivaId} onReordenar={reordenar} bloqueada={bloqueado || !editable} />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <VistaPrevia
              slides={slides}
              activa={activa}
              carruselId={id}
              ratio={ratio}
              cambios={cambiosSinGuardar}
              onElegir={setActivaId}
              bloqueado={bloqueado || !editable}
              onDuplicar={async () => {
                const r = await accion("POST", `${base}/slides/${activa.id}/duplicate`, {}, "Slide duplicada");
                if (r) await dibujar();
              }}
              onEliminar={() => setConf({ titulo: `Eliminar la slide ${activa.position}`, texto: "Se borra esta slide y se vuelven a numerar las demás (se dibujan de nuevo).", boton: "Eliminar slide", peligro: true, accion: async () => { const r = await accion("DELETE", `${base}/slides/${activa.id}`, undefined, "Slide eliminada"); if (r) { setActivaId(null); await dibujar(); } } })}
            />
            <div className="min-w-0">
              <PanelSlide slide={activa} carruselId={id} bloqueado={bloqueado || !editable} recargar={() => void recargar()} onTexto={setBTexto} onDiseno={setBDiseno} />
            </div>
          </div>
        </div>
      )}

      {editable && slides.length > 0 && <Publicacion key={`${c.id}:${c.updated_at}`} d={datos} recargar={() => void recargar()} bloqueado={bloqueado} />}
      <Confirmar c={conf} onCerrar={() => setConf(null)} />
    </div>
  );
}
