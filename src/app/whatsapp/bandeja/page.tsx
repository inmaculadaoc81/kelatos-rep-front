"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Message, Refresh2, SearchNormal1, Send2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSondeoVisible } from "@/hooks/use-sondeo-visible";
import { cn } from "@/lib/utils";
import { ConversacionWa, FILTROS_WA, MensajeWa, horaCompletaWa, horaWa, inicialesWa } from "@/lib/whatsapp";

const REFRESCO_LISTA_MS = 30_000;
const REFRESCO_HILO_MS = 15_000;

/**
 * WhatsApp dentro del dashboard. Es una ventana sobre las conversaciones de Chatwoot: Chatwoot, sus bots y n8n siguen funcionando igual y
 * lo que se escribe aquí sale por el mismo canal (y se ve también en Chatwoot). Fase 1: ver, buscar, responder y enlazar con las reparaciones.
 */
export default function WhatsappPage() {
  const [filtro, setFiltro] = useState("open");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [conversaciones, setConversaciones] = useState<ConversacionWa[]>([]);
  const [configurado, setConfigurado] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const paginaActual = useRef(1);
  const [abierta, setAbierta] = useState<ConversacionWa | null>(null);
  const [mensajes, setMensajes] = useState<MensajeWa[]>([]);
  const [cargandoHilo, setCargandoHilo] = useState(false);
  const [errorHilo, setErrorHilo] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const finHilo = useRef<HTMLDivElement>(null);
  const abiertaId = useRef<number | null>(null);

  // Búsqueda con pausa al teclear.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 400);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargarLista = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const qs = new URLSearchParams({ estado: filtro });
      if (busquedaAplicada) qs.set("q", busquedaAplicada);
      const res = await fetch(`/api/whatsapp/conversaciones?${qs}`, { cache: "no-store" });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      setConfigurado(d.configurado !== false);
      const nuevas = d.conversaciones as ConversacionWa[];
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
    } finally {
      setCargando(false);
    }
  }, [filtro, busquedaAplicada]);

  useEffect(() => { cargarLista(); }, [cargarLista]);

  async function cargarMas() {
    if (cargandoMas) return;
    setCargandoMas(true);
    try {
      const sig = paginaActual.current + 1;
      const qs = new URLSearchParams({ estado: filtro, pagina: String(sig) });
      const res = await fetch(`/api/whatsapp/conversaciones?${qs}`, { cache: "no-store" });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      const nuevas = d.conversaciones as ConversacionWa[];
      paginaActual.current = sig;
      setConversaciones((prev) => { const ids = new Set(prev.map((x) => x.id)); return [...prev, ...nuevas.filter((x) => !ids.has(x.id))]; });
      setHayMas(nuevas.length >= 25);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar más conversaciones");
    } finally {
      setCargandoMas(false);
    }
  }
  useSondeoVisible(() => { cargarLista(true); }, REFRESCO_LISTA_MS, configurado);

  const cargarHilo = useCallback(async (id: number, inicial: boolean) => {
    if (inicial) { setCargandoHilo(true); setErrorHilo(null); }
    try {
      const res = await fetch(`/api/whatsapp/conversaciones/${id}/mensajes`, { cache: "no-store" });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      if (abiertaId.current !== id) return; // el usuario ya abrió otra
      setMensajes(d.mensajes as MensajeWa[]);
      if (d.conversacion) setAbierta((prev) => (prev && prev.id === id ? { ...prev, ...(d.conversacion as ConversacionWa) } : prev));
      setErrorHilo(null);
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
    cargarHilo(c.id, true);
  }

  useSondeoVisible(() => { if (abiertaId.current) cargarHilo(abiertaId.current, false); }, REFRESCO_HILO_MS, abierta !== null);

  // Al llegar mensajes nuevos, baja al final.
  useEffect(() => { finHilo.current?.scrollIntoView({ block: "end" }); }, [mensajes.length, abierta?.id]);

  async function enviar() {
    if (!abierta || !texto.trim() || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/whatsapp/conversaciones/${abierta.id}/mensajes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "No se pudo enviar");
      setTexto("");
      setMensajes((prev) => [...prev, d.mensaje as MensajeWa]);
      cargarLista(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar el mensaje");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold"><Message className="size-5" /> Conversaciones</h1>
          <p className="text-sm text-muted-foreground">Conversaciones de WhatsApp de Kelatos (la misma bandeja de Chatwoot, que sigue funcionando igual)</p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={() => cargarLista()} title="Actualizar">
          <Refresh2 className={cn("size-4", cargando && "animate-spin")} />
        </Button>
      </div>

      {!configurado && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Falta conectar con Chatwoot: hay que configurar el token de acceso en el servidor (variable <code>CHATWOOT_API_TOKEN</code>). Mientras tanto no se puede mostrar ninguna conversación.
        </div>
      )}
      {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}

      <div className="grid min-h-[70vh] gap-3 lg:grid-cols-[22rem_1fr]">
        {/* Lista */}
        <div className="flex max-h-[78vh] flex-col overflow-hidden rounded-lg border bg-card">
          <div className="space-y-2 border-b p-2.5">
            <div className="relative">
              <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Nombre, teléfono o mensaje…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1">
              {FILTROS_WA.map((f) => (
                <button key={f.valor} type="button" onClick={() => setFiltro(f.valor)}
                  className={cn("rounded-full border px-2.5 py-0.5 text-xs", filtro === f.valor ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-accent")}>
                  {f.etiqueta}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {cargando && Array.from({ length: 6 }).map((_, i) => <div key={i} className="space-y-1.5 border-b p-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /></div>)}
            {!cargando && configurado && conversaciones.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">{busquedaAplicada ? "Ninguna conversación coincide" : "No hay conversaciones en esta vista"}</p>
            )}
            {!cargando && conversaciones.map((c) => (
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
                  {c.reparaciones.length > 0 && (
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-cyan-700 dark:text-cyan-400">
                      Reparación {c.reparaciones[0].resguardo} · {c.reparaciones[0].estado}{c.reparaciones.length > 1 ? ` (+${c.reparaciones.length - 1})` : ""}
                    </span>
                  )}
                </span>
              </button>
            ))}
            {!cargando && hayMas && (
              <div className="p-3 text-center">
                <Button variant="outline" size="sm" disabled={cargandoMas} onClick={cargarMas}>{cargandoMas ? "Cargando…" : `Cargar más (${conversaciones.length} mostradas)`}</Button>
              </div>
            )}
          </div>
        </div>

        {/* Hilo */}
        <div className="flex max-h-[78vh] min-h-[50vh] flex-col overflow-hidden rounded-lg border bg-card">
          {!abierta && <p className="m-auto p-6 text-sm text-muted-foreground">Elige una conversación para verla</p>}
          {abierta && (
            <>
              <div className="border-b px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{abierta.nombre}</p>
                    <p className="text-xs text-muted-foreground">{abierta.telefono || "Sin teléfono"}{abierta.asignadoA ? ` · Asignada a ${abierta.asignadoA}` : ""}</p>
                  </div>
                  <a href={`https://chat.affirmatechnology.com/app/accounts/2/conversations/${abierta.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline-offset-2 hover:underline">Abrir en Chatwoot</a>
                </div>
                {abierta.reparaciones.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {abierta.reparaciones.map((r) => (
                      <Link key={r.resguardo} href={`/reparaciones?resguardo=${encodeURIComponent(r.resguardo)}`} className="rounded-md border border-cyan-500/40 bg-cyan-500/5 px-2 py-0.5 text-[11px] text-cyan-800 hover:bg-cyan-500/10 dark:text-cyan-300" title="Abrir la reparación">
                        <strong>{r.resguardo}</strong> · {r.estado}{r.equipo ? ` · ${r.equipo}` : ""}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto bg-muted/20 px-4 py-3">
                {cargandoHilo && <Skeleton className="h-10 w-1/2" />}
                {errorHilo && <p className="text-sm text-destructive">{errorHilo}</p>}
                {mensajes.map((m) => m.tipo === "actividad" ? (
                  <p key={m.id} className="py-1 text-center text-[11px] text-muted-foreground">{m.texto} · {horaCompletaWa(m.ts)}</p>
                ) : (
                  <div key={m.id} className={cn("flex", m.tipo === "entrante" ? "justify-start" : "justify-end")}>
                    <div className={cn("max-w-[78%] rounded-2xl px-3 py-1.5 text-sm shadow-sm", m.tipo === "entrante" ? "rounded-bl-sm bg-card" : "rounded-br-sm bg-emerald-100 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-50")}>
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
                {!abierta.puedeResponder && (
                  <p className="mb-2 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300">
                    Han pasado más de 24 horas desde el último mensaje del cliente: WhatsApp solo permite escribirle con una plantilla aprobada. Responde desde Chatwoot con una plantilla.
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <Textarea
                    rows={2}
                    placeholder="Escribe un mensaje… (Enter envía, Mayús+Enter salto de línea)"
                    value={texto}
                    disabled={enviando || !abierta.puedeResponder}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  />
                  <Button className="gap-1.5" disabled={!texto.trim() || enviando || !abierta.puedeResponder} onClick={enviar}>
                    <Send2 className="size-4" /> {enviando ? "Enviando…" : "Enviar"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
