"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, Cpu, Lock, Message, Paperclip2, Refresh2, SearchNormal1, Send2, TickCircle, UserAdd } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSondeoVisible } from "@/hooks/use-sondeo-visible";
import { cn } from "@/lib/utils";
import {
  CatalogoWa, ContadoresWa, ConversacionWa, ESTADOS_WA, FILTROS_WA, MensajeWa, PRIORIDADES_WA,
  horaCompletaWa, horaWa, inicialesWa, mananaALas9,
} from "@/lib/whatsapp";

const REFRESCO_LISTA_MS = 30_000;
const REFRESCO_HILO_MS = 15_000;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ARCHIVOS = 5;

const ASIGNACIONES: { valor: string; etiqueta: string }[] = [
  { valor: "todas", etiqueta: "Todas" },
  { valor: "mias", etiqueta: "Mías" },
  { valor: "sin_asignar", etiqueta: "Sin asignar" },
  { valor: "asignadas", etiqueta: "Asignadas" },
];

type Adjunto = { nombre: string; tipo: string; base64: string; peso: number };

const claseSelect = "h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

async function llamar<T>(url: string, init?: RequestInit): Promise<T & { ok: true }> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const d = await res.json();
  if (!d.ok) throw new Error(d.error || "Error desconocido");
  return d;
}

function aBase64(f: File): Promise<string> {
  return new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.onerror = () => mal(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(f);
  });
}

/**
 * WhatsApp dentro del dashboard. Es una ventana sobre las conversaciones de Chatwoot: Chatwoot, sus bots y n8n siguen funcionando igual y
 * todo lo que se hace aquí (responder, notas, asignar, estado, etiquetas…) se hace en Chatwoot y se ve también allí.
 */
export default function WhatsappPage() {
  // Filtros
  const [estado, setEstado] = useState("open");
  const [bandeja, setBandeja] = useState("");
  const [asignacion, setAsignacion] = useState("todas");
  const [etiqueta, setEtiqueta] = useState("");
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  // Datos
  const [catalogo, setCatalogo] = useState<(CatalogoWa & { yoAgenteId: number | null }) | null>(null);
  const [contadores, setContadores] = useState<ContadoresWa | null>(null);
  const [conversaciones, setConversaciones] = useState<ConversacionWa[]>([]);
  const [configurado, setConfigurado] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const paginaActual = useRef(1);
  // Conversación abierta
  const [abierta, setAbierta] = useState<ConversacionWa | null>(null);
  const [mensajes, setMensajes] = useState<MensajeWa[]>([]);
  const [cargandoHilo, setCargandoHilo] = useState(false);
  const [errorHilo, setErrorHilo] = useState<string | null>(null);
  const [verDetalles, setVerDetalles] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  // Redacción
  const [modoNota, setModoNota] = useState(false);
  const [texto, setTexto] = useState("");
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const finHilo = useRef<HTMLDivElement>(null);
  const abiertaId = useRef<number | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  // Búsqueda con pausa al teclear.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 400);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Catálogo (bandejas, agentes, etiquetas, respuestas predefinidas): una vez.
  useEffect(() => {
    llamar<{ configurado: boolean } & CatalogoWa & { yoAgenteId: number | null }>("/api/whatsapp/catalogo")
      .then((d) => setCatalogo(d)).catch(() => {});
  }, []);

  const cargarContadores = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (bandeja) qs.set("bandeja", bandeja);
      const d = await llamar<ContadoresWa>(`/api/whatsapp/contadores?${qs}`);
      setContadores({ todas: d.todas, sinAsignar: d.sinAsignar, asignadas: d.asignadas, mias: d.mias });
    } catch { /* los contadores son un extra: si fallan no se muestra nada */ }
  }, [bandeja]);

  const paramsLista = useCallback((pagina?: number) => {
    const qs = new URLSearchParams({ estado, asignacion });
    if (bandeja) qs.set("bandeja", bandeja);
    if (etiqueta) qs.set("etiqueta", etiqueta);
    if (busquedaAplicada) qs.set("q", busquedaAplicada);
    if (pagina) qs.set("pagina", String(pagina));
    return qs;
  }, [estado, asignacion, bandeja, etiqueta, busquedaAplicada]);

  const cargarLista = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const d = await llamar<{ configurado: boolean; conversaciones: ConversacionWa[] }>(`/api/whatsapp/conversaciones?${paramsLista()}`);
      setConfigurado(d.configurado !== false);
      const nuevas = d.conversaciones;
      if (silencioso && paginaActual.current > 1) {
        // Refresco automático con páginas ya ampliadas: se renuevan las primeras y se conservan las que el usuario ya había cargado.
        setConversaciones((prev) => { const ids = new Set(nuevas.map((x) => x.id)); return [...nuevas, ...prev.filter((x) => !ids.has(x.id))]; });
      } else {
        paginaActual.current = 1;
        setConversaciones(nuevas);
        setHayMas(!busquedaAplicada && nuevas.length >= 25);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      if (!silencioso) setConversaciones([]);
    } finally {
      setCargando(false);
    }
  }, [paramsLista, busquedaAplicada]);

  useEffect(() => { cargarLista(); }, [cargarLista]);
  useEffect(() => { cargarContadores(); }, [cargarContadores]);

  async function cargarMas() {
    if (cargandoMas) return;
    setCargandoMas(true);
    try {
      const sig = paginaActual.current + 1;
      const d = await llamar<{ conversaciones: ConversacionWa[] }>(`/api/whatsapp/conversaciones?${paramsLista(sig)}`);
      paginaActual.current = sig;
      setConversaciones((prev) => { const ids = new Set(prev.map((x) => x.id)); return [...prev, ...d.conversaciones.filter((x) => !ids.has(x.id))]; });
      setHayMas(d.conversaciones.length >= 25);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar más conversaciones");
    } finally {
      setCargandoMas(false);
    }
  }
  useSondeoVisible(() => { cargarLista(true); cargarContadores(); }, REFRESCO_LISTA_MS, configurado);

  const cargarHilo = useCallback(async (id: number, inicial: boolean) => {
    if (inicial) { setCargandoHilo(true); setErrorHilo(null); }
    try {
      const d = await llamar<{ mensajes: MensajeWa[]; conversacion: ConversacionWa | null }>(`/api/whatsapp/conversaciones/${id}/mensajes${inicial ? "?leer=1" : ""}`);
      if (abiertaId.current !== id) return; // el usuario ya abrió otra
      setMensajes(d.mensajes);
      if (d.conversacion) setAbierta((prev) => (prev && prev.id === id ? { ...prev, ...d.conversacion! } : prev));
      setErrorHilo(null);
      if (inicial) setConversaciones((prev) => prev.map((x) => (x.id === id ? { ...x, noLeidos: 0 } : x)));
    } catch (e) {
      if (abiertaId.current === id) setErrorHilo(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (inicial) setCargandoHilo(false);
    }
  }, []);

  function abrir(c: ConversacionWa) {
    abiertaId.current = c.id;
    setAbierta(c);
    setMensajes([]);
    setTexto("");
    setAdjuntos([]);
    setModoNota(false);
    cargarHilo(c.id, true);
  }

  useSondeoVisible(() => { if (abiertaId.current) cargarHilo(abiertaId.current, false); }, REFRESCO_HILO_MS, abierta !== null);

  // Al llegar mensajes nuevos, baja al final.
  useEffect(() => { finHilo.current?.scrollIntoView({ block: "end" }); }, [mensajes.length, abierta?.id]);

  /** Aplica a la lista y al hilo la conversación devuelta por una acción. */
  function aplicar(c: ConversacionWa) {
    setConversaciones((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...c, reparaciones: x.reparaciones, otras: x.otras } : x)));
    setAbierta((prev) => (prev && prev.id === c.id ? { ...prev, ...c, reparaciones: prev.reparaciones, otras: prev.otras } : prev));
  }

  async function accion(cuerpo: Record<string, unknown>, exito: string) {
    if (!abierta || trabajando) return;
    setTrabajando(true);
    try {
      const d = await llamar<{ conversacion: ConversacionWa }>(`/api/whatsapp/conversaciones/${abierta.id}/accion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
      aplicar(d.conversacion);
      toast.success(exito);
      cargarHilo(abierta.id, false);
      cargarContadores();
      // Si el cambio la saca del filtro actual (p. ej. resolverla en «Abiertas») se refresca la lista.
      cargarLista(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo hacer el cambio");
    } finally {
      setTrabajando(false);
    }
  }

  async function elegirArchivos(files: FileList | null) {
    if (!files) return;
    const nuevos: Adjunto[] = [];
    let total = adjuntos.reduce((s, a) => s + a.peso, 0);
    for (const f of Array.from(files)) {
      if (adjuntos.length + nuevos.length >= MAX_ARCHIVOS) { toast.error(`Máximo ${MAX_ARCHIVOS} archivos por mensaje`); break; }
      total += f.size;
      if (total > MAX_BYTES) { toast.error("Los archivos pesan demasiado (máximo 10 MB en total)"); break; }
      nuevos.push({ nombre: f.name, tipo: f.type || "application/octet-stream", base64: await aBase64(f), peso: f.size });
    }
    setAdjuntos((prev) => [...prev, ...nuevos]);
    if (inputArchivo.current) inputArchivo.current.value = "";
  }

  async function enviar() {
    if (!abierta || (!texto.trim() && adjuntos.length === 0) || enviando) return;
    setEnviando(true);
    try {
      const d = await llamar<{ mensaje: MensajeWa }>(`/api/whatsapp/conversaciones/${abierta.id}/mensajes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, privado: modoNota, adjuntos: adjuntos.map(({ nombre, tipo, base64 }) => ({ nombre, tipo, base64 })) }),
      });
      setTexto("");
      setAdjuntos([]);
      setMensajes((prev) => [...prev, d.mensaje]);
      cargarHilo(abierta.id, false);
      cargarLista(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar el mensaje");
    } finally {
      setEnviando(false);
    }
  }

  const visibles = useMemo(() => (soloNoLeidas ? conversaciones.filter((c) => c.noLeidos > 0) : conversaciones), [conversaciones, soloNoLeidas]);
  const sugerencias = useMemo(() => {
    if (modoNota || !catalogo || !texto.startsWith("/")) return [];
    const q = texto.slice(1).toLowerCase();
    return catalogo.respuestas.filter((r) => r.atajo.toLowerCase().includes(q) || r.texto.toLowerCase().includes(q)).slice(0, 6);
  }, [texto, catalogo, modoNota]);
  const nombreBandeja = (id: number) => catalogo?.bandejas.find((b) => b.id === id)?.nombre ?? "";
  const hayFiltros = estado !== "open" || !!bandeja || asignacion !== "todas" || !!etiqueta || soloNoLeidas || !!busqueda;
  const contador = (v: string) => (!contadores ? null : v === "todas" ? contadores.todas : v === "mias" ? contadores.mias : v === "sin_asignar" ? contadores.sinAsignar : contadores.asignadas);
  const esMia = !!abierta && catalogo?.yoAgenteId != null && abierta.asignado?.id === catalogo.yoAgenteId && !abierta.asignado.esBot;

  const detalles = abierta && (
    <div className="space-y-4 p-3 text-sm">
      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Contacto</p>
        <p className="font-medium">{abierta.nombre}</p>
        {abierta.telefono && <p className="text-xs text-muted-foreground">{abierta.telefono}</p>}
        {abierta.email && <p className="text-xs text-muted-foreground">{abierta.email}</p>}
        <p className="text-xs text-muted-foreground">Conversación #{abierta.id}{abierta.bandeja ? ` · ${abierta.bandeja}` : ""}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="wa-asignado">Asignada a</label>
        <select id="wa-asignado" className={cn(claseSelect, "w-full")} disabled={trabajando} value={abierta.asignado && !abierta.asignado.esBot ? String(abierta.asignado.id) : ""}
          onChange={(e) => accion({ accion: "asignar", agenteId: e.target.value ? Number(e.target.value) : null }, e.target.value ? "Conversación asignada" : "Conversación sin asignar")}>
          <option value="">{abierta.asignado?.esBot ? `${abierta.asignado.nombre} (bot) — sin persona` : "Sin asignar"}</option>
          {catalogo?.agentes.map((a) => <option key={a.id} value={a.id}>{a.nombre}{a.estado === "online" ? " · en línea" : ""}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="wa-prioridad">Prioridad</label>
        <select id="wa-prioridad" className={cn(claseSelect, "w-full")} disabled={trabajando} value={abierta.prioridad ?? ""}
          onChange={(e) => accion({ accion: "prioridad", prioridad: e.target.value || null }, "Prioridad actualizada")}>
          <option value="">Ninguna</option>
          {PRIORIDADES_WA.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
        </select>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Etiquetas</p>
        {catalogo && catalogo.etiquetas.length === 0 && <p className="text-xs text-muted-foreground">No hay etiquetas creadas en Chatwoot.</p>}
        <div className="flex flex-wrap gap-1">
          {catalogo?.etiquetas.map((t) => {
            const puesta = abierta.etiquetas.includes(t.titulo);
            return (
              <button key={t.titulo} type="button" disabled={trabajando}
                onClick={() => accion({ accion: "etiquetas", etiquetas: puesta ? abierta.etiquetas.filter((x) => x !== t.titulo) : [...abierta.etiquetas, t.titulo] }, puesta ? "Etiqueta quitada" : "Etiqueta añadida")}
                className={cn("max-w-full truncate rounded-full border px-2 py-0.5 text-[11px]", puesta ? "border-transparent text-white" : "hover:bg-accent")}
                style={puesta ? { backgroundColor: t.color } : undefined} title={t.titulo}>
                {t.titulo}
              </button>
            );
          })}
        </div>
      </div>

      {abierta.reparaciones.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Reparaciones de este teléfono</p>
          <div className="space-y-1">
            {abierta.reparaciones.map((r) => (
              <Link key={r.resguardo} href={`/reparaciones?resguardo=${encodeURIComponent(r.resguardo)}`} className="block rounded-md border border-cyan-500/40 bg-cyan-500/5 px-2 py-1 text-[11px] text-cyan-800 hover:bg-cyan-500/10 dark:text-cyan-300">
                <strong>{r.resguardo}</strong> · {r.estado}{r.equipo ? ` · ${r.equipo}` : ""}
              </Link>
            ))}
          </div>
        </div>
      )}

      {abierta.otras && abierta.otras.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Otras conversaciones del contacto</p>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {abierta.otras.map((o) => (
              <li key={o.id}>#{o.id} · {nombreBandeja(o.bandejaId) || "bandeja"} · {ESTADOS_WA[o.estado] ?? o.estado} · {horaWa(o.ts)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1.5 border-t pt-3">
        <Button variant="outline" size="sm" disabled={trabajando} onClick={() => accion({ accion: "no_leida" }, "Marcada como no leída")}>Marcar como no leída</Button>
        <a href={`https://chat.affirmatechnology.com/app/accounts/2/conversations/${abierta.id}`} target="_blank" rel="noopener noreferrer" className="text-center text-xs text-muted-foreground underline-offset-2 hover:underline">Abrir en Chatwoot</a>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold"><Message className="size-5" /> Conversaciones</h1>
          <p className="text-sm text-muted-foreground">Todas las bandejas de WhatsApp de Kelatos (la misma bandeja de Chatwoot, que sigue funcionando igual)</p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={() => { cargarLista(); cargarContadores(); }} title="Actualizar">
          <Refresh2 className={cn("size-4", cargando && "animate-spin")} />
        </Button>
      </div>

      {!configurado && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Falta conectar con Chatwoot: hay que configurar el token de acceso en el servidor (variable <code>CHATWOOT_API_TOKEN</code>). Mientras tanto no se puede mostrar ninguna conversación.
        </div>
      )}
      {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}

      <div className="grid min-h-[70vh] gap-3 lg:grid-cols-[23rem_1fr] xl:grid-cols-[23rem_1fr_17rem]">
        {/* Lista y filtros */}
        <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-lg border bg-card">
          <div className="space-y-2 border-b p-2.5">
            <div className="relative">
              <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Nombre, teléfono o mensaje…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <select aria-label="Bandeja" className={claseSelect} value={bandeja} onChange={(e) => setBandeja(e.target.value)}>
                <option value="">Todas las bandejas</option>
                {catalogo?.bandejas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
              <select aria-label="Etiqueta" className={claseSelect} value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
                <option value="">Todas las etiquetas</option>
                {catalogo?.etiquetas.map((t) => <option key={t.titulo} value={t.titulo}>{t.titulo}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-1">
              {ASIGNACIONES.map((f) => {
                const n = estado === "open" ? contador(f.valor) : null;
                return (
                  <button key={f.valor} type="button" onClick={() => setAsignacion(f.valor)}
                    className={cn("rounded-full border px-2.5 py-0.5 text-xs", asignacion === f.valor ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-accent")}>
                    {f.etiqueta}{n !== null && n !== undefined ? <span className="ml-1 text-muted-foreground">{n.toLocaleString("es-ES")}</span> : null}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {FILTROS_WA.map((f) => (
                <button key={f.valor} type="button" onClick={() => setEstado(f.valor)}
                  className={cn("rounded-md border px-2 py-0.5 text-[11px]", estado === f.valor ? "border-emerald-600 bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-300" : "hover:bg-accent")}>
                  {f.etiqueta}
                </button>
              ))}
              <button type="button" onClick={() => setSoloNoLeidas((v) => !v)}
                className={cn("rounded-md border px-2 py-0.5 text-[11px]", soloNoLeidas ? "border-emerald-600 bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-300" : "hover:bg-accent")}>
                Sin leer
              </button>
              {hayFiltros && (
                <button type="button" className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => { setEstado("open"); setBandeja(""); setAsignacion("todas"); setEtiqueta(""); setSoloNoLeidas(false); setBusqueda(""); }}>
                  Quitar filtros
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {cargando && Array.from({ length: 6 }).map((_, i) => <div key={i} className="space-y-1.5 border-b p-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /></div>)}
            {!cargando && configurado && visibles.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">{hayFiltros ? "Ninguna conversación coincide con los filtros" : "No hay conversaciones en esta vista"}</p>
            )}
            {!cargando && visibles.map((c) => {
              const pr = PRIORIDADES_WA.find((p) => p.valor === c.prioridad);
              return (
                <button key={c.id} type="button" onClick={() => abrir(c)}
                  className={cn("flex w-full items-start gap-2.5 border-b px-3 py-2.5 text-left hover:bg-muted/50", abierta?.id === c.id && "bg-muted")}>
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{inicialesWa(c.nombre)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", c.noLeidos > 0 && "font-semibold")}>{c.nombre}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{horaWa(c.ultimoMensaje?.ts || c.ultimaActividad)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={cn("truncate text-xs", c.noLeidos > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {c.ultimoMensaje ? `${c.ultimoMensaje.saliente ? "Tú: " : ""}${c.ultimoMensaje.texto}` : "—"}
                      </span>
                      {c.noLeidos > 0 && <span className="ml-auto shrink-0 rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">{c.noLeidos}</span>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                      {c.bandeja && <span className="rounded bg-muted px-1">{c.bandeja}</span>}
                      {c.estado !== "open" && <span className="rounded bg-muted px-1">{ESTADOS_WA[c.estado] ?? c.estado}</span>}
                      {c.asignado && <span className="inline-flex items-center gap-0.5">{c.asignado.esBot ? <Cpu className="size-3" /> : <UserAdd className="size-3" />}{c.asignado.nombre}</span>}
                      {pr && <span className={cn("font-medium", pr.clase)}>{pr.etiqueta}</span>}
                      {c.etiquetas.slice(0, 2).map((t) => <span key={t} className="max-w-28 truncate rounded-full border px-1.5">{t}</span>)}
                    </span>
                    {c.reparaciones.length > 0 && (
                      <span className="mt-0.5 block truncate text-[11px] font-medium text-cyan-700 dark:text-cyan-400">
                        Reparación {c.reparaciones[0].resguardo} · {c.reparaciones[0].estado}{c.reparaciones.length > 1 ? ` (+${c.reparaciones.length - 1})` : ""}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {!cargando && hayMas && (
              <div className="p-3 text-center">
                <Button variant="outline" size="sm" disabled={cargandoMas} onClick={cargarMas}>{cargandoMas ? "Cargando…" : `Cargar más (${conversaciones.length} mostradas)`}</Button>
              </div>
            )}
          </div>
        </div>

        {/* Hilo */}
        <div className="flex max-h-[80vh] min-h-[50vh] flex-col overflow-hidden rounded-lg border bg-card">
          {!abierta && <p className="m-auto p-6 text-sm text-muted-foreground">Elige una conversación para verla</p>}
          {abierta && (
            <>
              <div className="border-b px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{abierta.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {abierta.telefono || "Sin teléfono"}{abierta.bandeja ? ` · ${abierta.bandeja}` : ""} · {ESTADOS_WA[abierta.estado] ?? abierta.estado}
                      {abierta.asignado ? ` · ${abierta.asignado.esBot ? "Bot: " : "Asignada a "}${abierta.asignado.nombre}` : " · Sin asignar"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!esMia && (
                      <Button size="sm" className="gap-1.5" disabled={trabajando} onClick={() => accion({ accion: "tomar" }, "Ahora la llevas tú")} title="Asignármela y abrirla (si la llevaba un bot, la atiendes tú)">
                        <UserAdd className="size-4" /> Tomar el control
                      </Button>
                    )}
                    {abierta.estado === "resolved" ? (
                      <Button size="sm" variant="outline" disabled={trabajando} onClick={() => accion({ accion: "estado", estado: "open" }, "Conversación reabierta")}>Reabrir</Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={trabajando} onClick={() => accion({ accion: "estado", estado: "resolved" }, "Conversación resuelta")}>
                        <TickCircle className="size-4" /> Resolver
                      </Button>
                    )}
                    {abierta.estado !== "resolved" && (
                      <select aria-label="Posponer" className={cn(claseSelect, "w-28")} disabled={trabajando} value="" title="Posponer: vuelve a aparecer como abierta a la hora elegida"
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) return;
                          const ahora = Math.floor(Date.now() / 1000);
                          const hasta = v === "1h" ? ahora + 3600 : v === "3h" ? ahora + 3 * 3600 : mananaALas9();
                          accion({ accion: "estado", estado: "snoozed", hasta }, "Conversación pospuesta");
                        }}>
                        <option value="">Posponer…</option>
                        <option value="1h">1 hora</option>
                        <option value="3h">3 horas</option>
                        <option value="man">Mañana 9:00</option>
                      </select>
                    )}
                    {abierta.estado !== "pending" && abierta.estado !== "resolved" && (
                      <Button size="sm" variant="ghost" className="gap-1.5" disabled={trabajando} onClick={() => accion({ accion: "estado", estado: "pending" }, "Marcada como pendiente")} title="Dejarla en pendiente">
                        <Clock className="size-4" /> Pendiente
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="xl:hidden" onClick={() => setVerDetalles((v) => !v)}>{verDetalles ? "Ocultar detalles" : "Detalles"}</Button>
                  </div>
                </div>
                {abierta.asignado?.esBot && (
                  <p className="mt-1.5 rounded-md bg-sky-500/10 px-2 py-1 text-[11px] text-sky-800 dark:text-sky-300">
                    Esta conversación la lleva un bot ({abierta.asignado.nombre}). Pulsa «Tomar el control» para atenderla tú.
                  </p>
                )}
                {abierta.pospuestaHasta > 0 && abierta.estado === "snoozed" && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">Pospuesta hasta {horaCompletaWa(abierta.pospuestaHasta)}</p>
                )}
              </div>
              {verDetalles && <div className="max-h-72 overflow-y-auto border-b bg-muted/10 xl:hidden">{detalles}</div>}

              <div className="flex-1 space-y-1.5 overflow-y-auto bg-muted/20 px-4 py-3">
                {cargandoHilo && <Skeleton className="h-10 w-1/2" />}
                {errorHilo && <p className="text-sm text-destructive">{errorHilo}</p>}
                {mensajes.map((m) => m.tipo === "actividad" ? (
                  <p key={m.id} className="py-1 text-center text-[11px] text-muted-foreground">{m.texto} · {horaCompletaWa(m.ts)}</p>
                ) : (
                  <div key={m.id} className={cn("flex", m.tipo === "entrante" ? "justify-start" : "justify-end")}>
                    <div className={cn(
                      "max-w-[78%] rounded-2xl px-3 py-1.5 text-sm shadow-sm",
                      m.privado ? "rounded-br-sm border border-amber-400/60 bg-amber-100 text-amber-950 dark:bg-amber-900/30 dark:text-amber-50"
                        : m.tipo === "entrante" ? "rounded-bl-sm bg-card" : "rounded-br-sm bg-emerald-100 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-50")}>
                      {m.privado && <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"><Lock className="size-3" /> Nota privada (el cliente no la ve)</p>}
                      {m.adjuntos.map((a, i) => a.tipo === "image" && a.url
                        ? /* eslint-disable-next-line @next/next/no-img-element */ <img key={i} src={a.miniatura || a.url} alt="Imagen" className="mb-1 max-h-60 rounded-lg" />
                        : <a key={i} href={a.url || "#"} target="_blank" rel="noopener noreferrer" className="mb-1 block text-xs underline">📎 {a.tipo === "audio" ? "Audio" : a.tipo === "video" ? "Vídeo" : "Archivo adjunto"}</a>)}
                      {m.texto && <p className="break-words whitespace-pre-wrap">{m.texto}</p>}
                      <p className="mt-0.5 text-right text-[10px] text-muted-foreground">{m.tipo !== "entrante" && m.autor ? `${m.autor} · ` : ""}{horaCompletaWa(m.ts)}</p>
                    </div>
                  </div>
                ))}
                <div ref={finHilo} />
              </div>

              <div className="border-t p-2.5">
                <div className="mb-2 inline-flex rounded-md border p-0.5 text-xs">
                  <button type="button" onClick={() => setModoNota(false)} className={cn("rounded px-3 py-1", !modoNota ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Responder</button>
                  <button type="button" onClick={() => setModoNota(true)} className={cn("inline-flex items-center gap-1 rounded px-3 py-1", modoNota ? "bg-amber-500 text-white" : "text-muted-foreground")}><Lock className="size-3" /> Nota privada</button>
                </div>
                {!modoNota && !abierta.puedeResponder && (
                  <p className="mb-2 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300">
                    Han pasado más de 24 horas desde el último mensaje del cliente: WhatsApp solo permite escribirle con una plantilla aprobada. Responde desde Chatwoot con una plantilla (aquí puedes dejar notas privadas).
                  </p>
                )}
                {sugerencias.length > 0 && (
                  <div className="mb-2 max-h-40 overflow-y-auto rounded-md border bg-popover text-xs shadow-sm">
                    {sugerencias.map((r) => (
                      <button key={r.atajo} type="button" className="block w-full px-3 py-1.5 text-left hover:bg-accent" onClick={() => setTexto(r.texto)}>
                        <strong>/{r.atajo}</strong> <span className="text-muted-foreground">{r.texto.slice(0, 90)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {adjuntos.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {adjuntos.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-[11px]">
                        📎 {a.nombre} ({Math.max(1, Math.round(a.peso / 1024))} KB)
                        <button type="button" aria-label="Quitar archivo" className="text-muted-foreground hover:text-foreground" onClick={() => setAdjuntos((prev) => prev.filter((_, j) => j !== i))}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input ref={inputArchivo} type="file" multiple className="hidden" onChange={(e) => elegirArchivos(e.target.files)} />
                  <Button variant="outline" size="icon" className="size-9 shrink-0" title="Adjuntar archivos o imágenes" disabled={enviando || (!modoNota && !abierta.puedeResponder)} onClick={() => inputArchivo.current?.click()}>
                    <Paperclip2 className="size-4" />
                  </Button>
                  <Textarea
                    rows={2}
                    className={cn(modoNota && "border-amber-400 bg-amber-50 dark:bg-amber-950/20")}
                    placeholder={modoNota ? "Nota privada para el equipo… (el cliente no la verá)" : "Escribe un mensaje… (Enter envía, Mayús+Enter salto de línea, «/» respuestas predefinidas)"}
                    value={texto}
                    disabled={enviando || (!modoNota && !abierta.puedeResponder)}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  />
                  <Button className={cn("gap-1.5", modoNota && "bg-amber-500 hover:bg-amber-600")} disabled={(!texto.trim() && adjuntos.length === 0) || enviando || (!modoNota && !abierta.puedeResponder)} onClick={enviar}>
                    <Send2 className="size-4" /> {enviando ? "Enviando…" : modoNota ? "Guardar nota" : "Enviar"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detalles (pantallas anchas) */}
        <div className="hidden max-h-[80vh] overflow-y-auto rounded-lg border bg-card xl:block">
          {abierta ? detalles : <p className="p-4 text-xs text-muted-foreground">Aquí verás los datos del contacto, la asignación, la prioridad y las etiquetas.</p>}
        </div>
      </div>
    </div>
  );
}
