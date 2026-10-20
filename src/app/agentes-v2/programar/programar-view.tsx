"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { useOrganizacion } from "../organizacion-context";

type EstadoProgramado = "scheduled" | "running" | "published" | "approved" | "failed" | "cancelled";
type Diseno = "tech" | "editorial" | "bold" | "photo" | "guia";

interface Programado {
  id: number;
  topic: string;
  notes: string | null;
  slide_count: number | null;
  visual_style: Diseno | null;
  colors: Partial<Record<ClaveColor, string>> | null;
  status: EstadoProgramado;
  carousel_id: number | null;
  result_note: string | null;
  error: string | null;
  fecha: string;
  hora: string;
  created_by: string;
  carousel_status: string | null;
  carousel_title: string | null;
  primera_slide_id: number | null;
}

type ClaveColor = "primary" | "secondary" | "accent" | "dark" | "light";
type ColoresMarca = Record<ClaveColor, string>;

const ZONA = "Europe/Madrid";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const ESTADO_ETIQUETA: Record<EstadoProgramado, string> = {
  scheduled: "Programado",
  running: "Generando…",
  published: "Publicado",
  approved: "Generado, sin publicar",
  failed: "Falló",
  cancelled: "Cancelado",
};
const ESTADO_ESTILO: Record<EstadoProgramado, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  running: "bg-amber-100 text-amber-800 animate-pulse",
  published: "bg-emerald-100 text-emerald-800",
  approved: "bg-orange-100 text-orange-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-zinc-100 text-zinc-500",
};

/** Por ahora hay UN formato de diseño: el que ya se usa en los carruseles (foto real de fondo con velo oscuro, chip de la
 * marca, titular grande con palabras destacadas y puntos de progreso). Los demás formatos se irán añadiendo aquí. */
const DISENOS: { id: Diseno | ""; nombre: string; descripcion: string }[] = [
  { id: "photo", nombre: "Foto — diseño actual", descripcion: "Foto real de fondo con velo oscuro, titular grande con palabras destacadas y el nombre de la marca" },
  { id: "guia", nombre: "Guía — portada con foto", descripcion: "Primera slide llamativa con foto y titular grande; el resto solo texto sobre color de fondo, con titulares en negro y una palabra en cursiva de color" },
];

const NOMBRE_COLOR: Record<ClaveColor, string> = { primary: "Principal", secondary: "Secundario", accent: "Acento", dark: "Fondo oscuro", light: "Fondo claro" };
const COLORES_DEFECTO: ColoresMarca = { primary: "#2563eb", secondary: "#1e3a8a", accent: "#f59e0b", dark: "#0b1220", light: "#ffffff" };

/** AAAA-MM-DD de "hoy" en España (la hora de referencia de la empresa), no la del ordenador de quien mira. */
function hoyMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

function sumarDias(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}

function lunesDe(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dow = (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
  return sumarDias(iso, -dow);
}

function textoFecha(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

/**
 * Programar contenido: la community manager deja programados carruseles (tema, diseño y, si quiere, slides, colores
 * e indicaciones) y el sistema los genera y publica solo a su hora. Modo automático: solo tema + diseño.
 */
export function ProgramarView() {
  const { organizaciones, organizacionId, organizacion, seleccionar } = useOrganizacion();
  const hoy = hoyMadrid();
  const [lunes, setLunes] = useState(() => lunesDe(hoyMadrid()));
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)), [lunes]);

  const { datos, cargando, error, recargar } = useV2<{ ok: boolean; items: Programado[] }>(`social/schedule?desde=${dias[0]}&hasta=${dias[6]}`);
  const { datos: datosMarca } = useV2<{ ok: boolean; brand: { colors: ColoresMarca; name: string } }>("social/brand");
  const marca = datosMarca?.brand ?? null;

  const [nuevo, setNuevo] = useState<{ fecha: string } | null>(null);
  const [detalle, setDetalle] = useState<Programado | null>(null);

  const items = useMemo(() => datos?.items ?? [], [datos]);
  const hayEnCurso = items.some((i) => i.status === "running" || (i.status === "scheduled" && `${i.fecha}T${i.hora}` <= new Date().toISOString().slice(0, 16)));
  useEffect(() => {
    if (!hayEnCurso) return;
    const t = setInterval(recargar, 20_000);
    return () => clearInterval(t);
  }, [hayEnCurso, recargar]);

  const porDia = useMemo(() => {
    const m = new Map<string, Programado[]>();
    for (const i of items) m.set(i.fecha, [...(m.get(i.fecha) ?? []), i]);
    for (const lista of m.values()) lista.sort((a, b) => a.hora.localeCompare(b.hora));
    return m;
  }, [items]);

  const [a1, m1] = dias[0].split("-").map(Number);
  const [, m7] = dias[6].split("-").map(Number);
  const titulo = m1 === m7 ? `${Number(dias[0].slice(8))}–${Number(dias[6].slice(8))} de ${MESES[m1 - 1]} ${a1}` : `${textoFecha(dias[0])} – ${textoFecha(dias[6])} ${a1}`;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Programar contenido</h1>
          <p className="text-sm text-muted-foreground">
            Deja programados los carruseles de la semana: a su hora el sistema los genera y los publica en Instagram. Horas en horario de España (Madrid).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Marca</Label>
          <Select value={organizacionId ?? ""} onValueChange={(v) => v && seleccionar(v)}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Elige una marca" /></SelectTrigger>
            <SelectContent>
              {organizaciones.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior"><ChevronLeft className="size-4" /></Button>
        <div className="min-w-56 text-center text-sm font-semibold">{titulo}</div>
        <Button variant="outline" size="icon" onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente"><ChevronRight className="size-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setLunes(lunesDe(hoy))}>Esta semana</Button>
        <Button className="ml-auto gap-1.5" onClick={() => setNuevo({ fecha: dias.find((d) => d >= hoy) ?? dias[0] })} disabled={!organizacion}>
          <Plus className="size-4" /> Programar carrusel
        </Button>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}

      <div className="grid gap-3 md:grid-cols-7">
        {dias.map((d, i) => {
          const lista = porDia.get(d) ?? [];
          const pasado = d < hoy;
          return (
            <section key={d} className={`flex min-h-40 flex-col rounded-lg border bg-card ${d === hoy ? "ring-2 ring-primary/60" : ""}`}>
              <header className={`flex items-center justify-between border-b px-2.5 py-1.5 ${pasado ? "text-muted-foreground" : ""}`}>
                <span className="text-sm font-medium">{DIAS[i]} <span className="text-muted-foreground">{Number(d.slice(8))}</span></span>
                {!pasado && (
                  <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Programar el ${textoFecha(d)}`} onClick={() => setNuevo({ fecha: d })}>
                    <Plus className="size-4" />
                  </button>
                )}
              </header>
              <div className="flex-1 space-y-1.5 p-1.5">
                {cargando && !datos && <Skeleton className="h-14 w-full" />}
                {lista.map((p) => (
                  <button key={p.id} type="button" onClick={() => setDetalle(p)} className={`w-full rounded-md border bg-background p-2 text-left text-xs transition-colors hover:bg-muted ${p.status === "cancelled" ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold">{p.hora}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${ESTADO_ESTILO[p.status]}`}>{ESTADO_ETIQUETA[p.status]}</span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-foreground">{p.topic}</p>
                  </button>
                ))}
                {!cargando && lista.length === 0 && <p className="px-1 pt-2 text-center text-[11px] text-muted-foreground">{pasado ? "—" : "Nada programado"}</p>}
              </div>
            </section>
          );
        })}
      </div>

      {nuevo && organizacion && (
        <DialogoProgramar
          nombreMarca={organizacion.name}
          colores={marca?.colors ?? null}
          fechaInicial={nuevo.fecha}
          hoy={hoy}
          onCerrar={() => setNuevo(null)}
          onGuardado={() => { setNuevo(null); recargar(); }}
        />
      )}
      {detalle && (
        <DialogoDetalle
          item={detalle}
          organizacionId={organizacionId}
          onCerrar={() => setDetalle(null)}
          onCambio={() => { setDetalle(null); recargar(); }}
        />
      )}
    </div>
  );
}

function MiniDiseno({ id, colores }: { id: Diseno | ""; colores: ColoresMarca }) {
  if (id === "guia") {
    // Portada con foto y, al lado, una slide de solo texto sobre fondo claro.
    return (
      <div className="flex shrink-0 gap-1">
        <div
          className="flex h-28 w-[3.2rem] flex-col justify-end overflow-hidden rounded-md p-1.5 text-white"
          style={{ background: `linear-gradient(180deg, ${colores.dark}66, ${colores.dark}f2), repeating-linear-gradient(35deg, #6b7280 0 7px, #4b5563 7px 14px)` }}
        >
          <span className="text-[7px] font-bold leading-[1.05]">Tu tema <em className="font-serif" style={{ color: colores.accent }}>aquí</em></span>
        </div>
        <div className="flex h-28 w-[3.2rem] flex-col justify-start overflow-hidden rounded-md bg-zinc-200 p-1.5 text-zinc-900">
          <span className="text-[7px] font-bold leading-[1.05]">Paso <em className="font-serif font-medium" style={{ color: colores.primary }}>uno</em></span>
          <i className="mt-1 block h-0.5 w-6 bg-zinc-900" />
          <i className="mt-1.5 block h-0.5 w-full bg-zinc-400" />
          <i className="mt-1 block h-0.5 w-4/5 bg-zinc-400" />
        </div>
      </div>
    );
  }
  // Réplica en pequeño del diseño real: foto de fondo (aquí un patrón) bajo un velo oscuro, chip de la marca,
  // titular blanco con una palabra destacada en cursiva de color de acento y puntos de progreso.
  return (
    <div
      className="relative flex h-28 w-[5.5rem] shrink-0 flex-col justify-end overflow-hidden rounded-md p-2 text-white"
      style={{ background: `linear-gradient(180deg, ${colores.dark}66, ${colores.dark}f2), repeating-linear-gradient(35deg, #6b7280 0 7px, #4b5563 7px 14px)` }}
    >
      <span className="mb-1.5 inline-flex w-fit items-center gap-0.5 rounded-full border border-white/60 px-1 py-px text-[4px] tracking-widest">
        <i className="inline-block h-px w-2" style={{ backgroundColor: colores.accent }} /> MARCA
      </span>
      <span className="text-[9px] font-bold leading-[1.05]">¿Tu tema<br /><em className="font-serif" style={{ color: colores.accent }}>aquí?</em></span>
      <span className="mt-1.5 flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => <i key={i} className="h-0.5 rounded-full" style={{ width: i === 0 ? 8 : 3, backgroundColor: i === 0 ? colores.accent : "#ffffff77" }} />)}
      </span>
    </div>
  );
}

function DialogoProgramar({
  nombreMarca, colores, fechaInicial, hoy, onCerrar, onGuardado,
}: {
  nombreMarca: string;
  colores: ColoresMarca | null;
  fechaInicial: string;
  hoy: string;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const paleta = colores ?? COLORES_DEFECTO;
  const [tema, setTema] = useState("");
  const [fecha, setFecha] = useState(fechaInicial);
  const [hora, setHora] = useState("14:00");
  const [diseno, setDiseno] = useState<Diseno | "">("photo");
  const [personalizar, setPersonalizar] = useState(false);
  const [slides, setSlides] = useState("auto");
  const [coloresElegidos, setColoresElegidos] = useState<ColoresMarca>(paleta);
  const [indicaciones, setIndicaciones] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (tema.trim().length < 5) { toast.error("Escribe el tema del carrusel (mínimo 5 letras)"); return; }
    if (!fecha || fecha < hoy) { toast.error("Elige un día de hoy en adelante"); return; }
    setGuardando(true);
    try {
      const cuerpo: Record<string, unknown> = { topic: tema.trim(), fecha, hora, visualStyle: diseno || null };
      if (personalizar) {
        cuerpo.slideCount = slides === "auto" ? null : Number(slides);
        // Solo se mandan los colores que ella cambió respecto a la marca.
        const cambiados: Partial<ColoresMarca> = {};
        (Object.keys(coloresElegidos) as ClaveColor[]).forEach((k) => { if (coloresElegidos[k].toLowerCase() !== paleta[k].toLowerCase()) cambiados[k] = coloresElegidos[k]; });
        cuerpo.colors = Object.keys(cambiados).length ? cambiados : null;
        cuerpo.notes = indicaciones.trim() || null;
      }
      await enviarV2("POST", "social/schedule", cuerpo);
      toast.success("Carrusel programado");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-5" /> Programar un carrusel — {nombreMarca}</DialogTitle>
          <DialogDescription>Dime el tema y el diseño; el sistema escribe el carrusel, lo diseña y lo publica en Instagram a la hora que elijas.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pgTema">Tema *</Label>
            <Input id="pgTema" value={tema} maxLength={160} placeholder="Ej.: 5 señales de que tu portátil necesita limpieza interna" onChange={(e) => setTema(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pgFecha">Día *</Label>
              <Input id="pgFecha" type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pgHora">Hora (España) *</Label>
              <Input id="pgHora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Diseño</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {DISENOS.map((d) => (
                <button
                  key={d.id || "marca"}
                  type="button"
                  onClick={() => setDiseno(d.id)}
                  className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-colors ${diseno === d.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}
                >
                  <MiniDiseno id={d.id} colores={personalizar ? coloresElegidos : paleta} />
                  <span>
                    <span className="block text-sm font-medium">{d.nombre}</span>
                    <span className="block text-xs text-muted-foreground">{d.descripcion}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Más formatos de diseño próximamente.</p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={personalizar} onChange={(e) => setPersonalizar(e.target.checked)} />
              <span>
                <span className="font-medium">Personalizar más</span>
                <span className="block text-xs text-muted-foreground">
                  {personalizar ? "Elige el número de slides, los colores y añade indicaciones." : "Modo automático: el sistema decide cuántos slides (5 a 7), usa los colores de la marca y redacta todo."}
                </span>
              </span>
            </label>

            {personalizar && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Número de slides</Label>
                    <Select value={slides} onValueChange={(v) => setSlides(v ?? "auto")}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automático (5 a 7)</SelectItem>
                        {[4, 5, 6, 7, 8, 9, 10].map((n) => <SelectItem key={n} value={String(n)}>{n} slides</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Colores</Label>
                    <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setColoresElegidos(paleta)}>Volver a los de la marca</button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.keys(NOMBRE_COLOR) as ClaveColor[]).map((k) => (
                      <label key={k} className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
                        <input type="color" className="h-9 w-full cursor-pointer rounded border bg-transparent p-0.5" value={coloresElegidos[k]} onChange={(e) => setColoresElegidos((prev) => ({ ...prev, [k]: e.target.value }))} />
                        {NOMBRE_COLOR[k]}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pgNotas">Indicaciones para la IA (opcional)</Label>
                  <Textarea id="pgNotas" rows={3} maxLength={1500} placeholder="Ej.: que mencione nuestro servicio de recogida a domicilio y termine con una pregunta" value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={guardando} onClick={onCerrar}>Cancelar</Button>
          <Button disabled={guardando} onClick={guardar}>{guardando ? "Programando…" : "Programar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoDetalle({
  item, organizacionId, onCerrar, onCambio,
}: { item: Programado; organizacionId: string | null; onCerrar: () => void; onCambio: () => void }) {
  const [trabajando, setTrabajando] = useState(false);

  async function accion(ruta: string, ok: string) {
    setTrabajando(true);
    try {
      await enviarV2("POST", ruta);
      toast.success(ok);
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setTrabajando(false);
    }
  }

  const miniatura = item.carousel_id && item.primera_slide_id && organizacionId
    ? `/api/agentes-v2/social/carousels/${item.carousel_id}/slides/${item.primera_slide_id}/image?organization_id=${organizacionId}`
    : null;
  const diseno = DISENOS.find((d) => d.id === (item.visual_style ?? "photo"))?.nombre ?? "Foto — diseño actual";

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !trabajando) onCerrar(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{textoFecha(item.fecha)} a las {item.hora}</DialogTitle>
          <DialogDescription>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_ESTILO[item.status]}`}>{ESTADO_ETIQUETA[item.status]}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3">
          {miniatura && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={miniatura} alt="Primera slide" className="h-40 w-32 shrink-0 rounded-md border object-cover" />
          )}
          <div className="min-w-0 space-y-1.5 text-sm">
            <p className="font-medium">{item.topic}</p>
            <p className="text-xs text-muted-foreground">Diseño: {diseno} · Slides: {item.slide_count ?? "automático"}</p>
            {item.notes && <p className="text-xs text-muted-foreground">Indicaciones: {item.notes}</p>}
            {item.status === "running" && <p className="text-xs text-amber-700">Se está generando; tarda unos minutos.</p>}
            {item.result_note && <p className="text-xs text-muted-foreground">{item.result_note}</p>}
            {item.error && <p className="rounded bg-red-50 p-2 text-xs text-red-800">{item.error}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCerrar} disabled={trabajando}>Cerrar</Button>
          {item.status === "failed" && <Button disabled={trabajando} onClick={() => accion(`social/schedule/${item.id}/retry`, "Se volverá a intentar en un minuto")}>Reintentar</Button>}
          {(item.status === "scheduled" || item.status === "failed") && (
            <Button variant="destructive" disabled={trabajando} onClick={() => accion(`social/schedule/${item.id}/cancel`, "Programación cancelada")}>Cancelar programación</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
