"use client";

/**
 * Chat interno uno a uno, al estilo de la ventanita de Gmail: aparece abajo a la derecha en cualquier vista, se puede
 * minimizar a una burbuja y desde ella responder. Está en el layout raíz para que no se cierre al cambiar de vista.
 *
 * - Cuando llega un mensaje nuevo, la conversación se abre sola (sin quitar el cursor de donde se esté escribiendo).
 * - «Visto» solo se marca cuando la persona pulsa o escribe en la conversación: que se abra sola no cuenta.
 * - La burbuja se arrastra y se recuerda en este navegador, como la del asistente (que queda justo encima). La ventana la sigue.
 * - Queda POR DEBAJO de los diálogos (z-40): así nunca cierra por accidente un formulario a medio rellenar.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Add, ArrowLeft2, CloseCircle, Message, MinusCirlce, Send2 } from "@/lib/icons";

interface Conversacion {
  con: string;
  nombre: string;
  sinLeer: number;
  ultimoRecibidoSinLeer: number | null;
  ultimo: { id: number; texto: string; mio: boolean; creadoEn: string; leidoEn: string | null };
}
interface Mensaje { id: number; mio: boolean; texto: string; creadoEn: string; leidoEn: string | null }
interface Resumen { ok: boolean; disponible: boolean; yo?: string; junto?: boolean; sinLeer: number; conversaciones: Conversacion[] }
interface Persona { email: string; nombre: string }

type Vista = { tipo: "burbuja" } | { tipo: "lista" } | { tipo: "nuevo" } | { tipo: "conversacion"; con: string; nombre: string };

// Páginas que ven los clientes (o sin sesión): allí no hay chat.
const RUTAS_SIN_CHAT = /^\/(login|acceso-restringido|presupuesto\/|(formulario|formulario-recogida|formulario-entrega-venta|valoracion|encuesta)(\/|$))/;

const CLAVE_MINIMIZADO = "kelatos-chat-minimizado-hasta:";

const CLAVE_POSICION = "kelatos-chat-posicion";
/** Tamaño de la burbuja (48 px, como la del asistente). */
const BOTON = 48;
/** Hueco que ocupan a la derecha la burbuja del asistente y su micrófono: la ventana se abre a la izquierda de ellos. */
const HUECO_ASISTENTE = 108;

interface Posicion { right: number; bottom: number }
const entre = (v: number, min: number, max: number) => Math.min(Math.max(min, v), Math.max(min, max));

function leerMinimizado(yo: string): number {
  try { return Number(window.localStorage.getItem(CLAVE_MINIMIZADO + yo)) || 0; } catch { return 0; }
}
function guardarMinimizado(yo: string, id: number) {
  try { window.localStorage.setItem(CLAVE_MINIMIZADO + yo, String(id)); } catch { /* sin almacenamiento */ }
}

/** Dos tonos cortos. El navegador puede bloquearlo si aún no se ha tocado la página: no pasa nada. */
function sonar() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((frecuencia, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = frecuencia;
      g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.14 + 0.13);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.14);
      o.stop(ctx.currentTime + i * 0.14 + 0.14);
    });
    setTimeout(() => void ctx.close(), 600);
  } catch { /* sin sonido */ }
}

function hora(iso: string): string {
  const f = new Date(iso);
  const h = f.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return f.toDateString() === new Date().toDateString() ? h : `${f.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })} ${h}`;
}

async function pedir<T>(url: string, cuerpo?: unknown): Promise<T> {
  const r = await fetch(url, cuerpo === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error || "Error desconocido");
  return d as T;
}

export function ChatFlotante() {
  const ruta = usePathname() || "";
  if (RUTAS_SIN_CHAT.test(ruta)) return null;
  return <Chat />;
}

function Chat() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [vista, setVista] = useState<Vista>({ tipo: "burbuja" });
  const [mensajes, setMensajes] = useState<{ con: string; lista: Mensaje[] }>({ con: "", lista: [] });
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Posición de la burbuja (distancia a la esquina inferior derecha). Por defecto, abajo del todo.
  const [pos, setPos] = useState<Posicion>({ right: 20, bottom: 20 });
  const [vp, setVp] = useState({ w: 1200, h: 800 });
  const posRef = useRef(pos);
  const arrastre = useRef<{ x: number; y: number; right: number; bottom: number; movido: boolean } | null>(null);
  const ignorarClic = useRef(false);
  useEffect(() => {
    // Se lee al montar (no en el estado inicial) para no desajustar el HTML del servidor.
    try {
      const g = JSON.parse(window.localStorage.getItem(CLAVE_POSICION) || "null");
      if (g && Number.isFinite(g.right) && Number.isFinite(g.bottom)) { posRef.current = { right: g.right, bottom: g.bottom }; setPos(posRef.current); }
    } catch { /* sin almacenamiento: posición por defecto */ }
    const medir = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  const caja = useRef<HTMLDivElement>(null);
  const final = useRef<HTMLDivElement>(null);
  const vistaRef = useRef(vista);
  const borradoresRef = useRef(borradores);
  const sonadoHasta = useRef(0);
  const abiertoHasta = useRef(0);
  useEffect(() => { vistaRef.current = vista; }, [vista]);
  useEffect(() => { borradoresRef.current = borradores; }, [borradores]);

  const cargarResumen = useCallback(async (): Promise<"bien" | "sin-chat" | "error"> => {
    let d: Resumen;
    try { d = await pedir<Resumen>("/api/chat/resumen"); } catch { return "error"; }
    setResumen(d);
    if (!d.disponible || !d.yo) return "sin-chat";

    const nuevos = d.conversaciones.filter((c) => c.ultimoRecibidoSinLeer != null).sort((a, b) => b.ultimoRecibidoSinLeer! - a.ultimoRecibidoSinLeer!);
    const ultimo = nuevos[0];
    if (!ultimo) return "bien";
    const id = ultimo.ultimoRecibidoSinLeer!;
    if (id <= leerMinimizado(d.yo)) return "bien"; // ya lo vio llegar y lo escondió: se queda en la burbuja con el contador
    if (id > sonadoHasta.current) { sonadoHasta.current = id; sonar(); }
    if (id > abiertoHasta.current) {
      // Se abre sola, salvo que esté escribiendo en otra conversación: entonces solo cuenta.
      const v = vistaRef.current;
      const escribiendo = v.tipo === "conversacion" && v.con !== ultimo.con && !!borradoresRef.current[v.con]?.trim();
      if (!escribiendo) {
        abiertoHasta.current = id;
        setVista({ tipo: "conversacion", con: ultimo.con, nombre: ultimo.nombre });
      }
    }
    return "bien";
  }, []);

  // Consulta periódica: más a menudo con una conversación a la vista, menos con la pestaña en segundo plano (la API tiene un límite compartido).
  const conversando = vista.tipo === "conversacion";
  useEffect(() => {
    let vivo = true;
    let reloj: ReturnType<typeof setTimeout>;
    const vuelta = async () => {
      const estado = await cargarResumen();
      if (!vivo) return;
      const espera = estado === "sin-chat" ? 5 * 60_000 : estado === "error" ? 60_000 : document.visibilityState !== "visible" ? 30_000 : conversando ? 5_000 : 10_000;
      reloj = setTimeout(vuelta, espera);
    };
    void vuelta();
    const alVolver = () => { if (document.visibilityState === "visible") { clearTimeout(reloj); void vuelta(); } };
    document.addEventListener("visibilitychange", alVolver);
    return () => { vivo = false; clearTimeout(reloj); document.removeEventListener("visibilitychange", alVolver); };
  }, [cargarResumen, conversando]);

  const con = vista.tipo === "conversacion" ? vista.con : "";
  const idUltimo = resumen?.conversaciones.find((c) => c.con === con)?.ultimo;
  const marcaCambios = idUltimo ? `${idUltimo.id}:${idUltimo.leidoEn || ""}` : "";
  const cargarMensajes = useCallback(async (quien: string) => {
    try {
      const d = await pedir<{ mensajes: Mensaje[] }>(`/api/chat/mensajes?con=${encodeURIComponent(quien)}`);
      setMensajes({ con: quien, lista: d.mensajes });
    } catch { /* se reintenta en la siguiente consulta */ }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- trae los mensajes cuando cambia la conversación o hay novedades
  useEffect(() => { if (con) void cargarMensajes(con); }, [con, marcaCambios, cargarMensajes]);

  const lista = mensajes.con === con ? mensajes.lista : [];
  const ultimoId = lista.length ? lista[lista.length - 1].id : 0;
  useEffect(() => { final.current?.scrollIntoView({ block: "nearest" }); }, [ultimoId, con]);

  /** La persona ha hecho algo en la conversación: lo recibido hasta ahora queda como visto. */
  const marcarVisto = useCallback(async (quien: string) => {
    const pendientes = mensajes.con === quien ? mensajes.lista.filter((m) => !m.mio && !m.leidoEn) : [];
    if (!pendientes.length || document.visibilityState !== "visible") return;
    const hastaId = pendientes[pendientes.length - 1].id;
    const ahora = new Date().toISOString();
    setMensajes((a) => (a.con !== quien ? a : { con: quien, lista: a.lista.map((m) => (!m.mio && !m.leidoEn && m.id <= hastaId ? { ...m, leidoEn: ahora } : m)) }));
    try {
      await pedir("/api/chat/leido", { con: quien, hastaId });
      await cargarResumen();
    } catch { /* se volverá a intentar al siguiente gesto */ }
  }, [mensajes, cargarResumen]);

  // Si ya está escribiendo ahí (cursor dentro) y llega otro mensaje, lo está viendo.
  useEffect(() => {
    if (con && caja.current?.contains(document.activeElement) && document.activeElement?.tagName === "TEXTAREA") {
      void marcarVisto(con);
    }
  }, [con, ultimoId, marcarVisto]);

  if (!resumen?.disponible || !resumen.yo) return null;
  const yo = resumen.yo;

  function esconder() {
    const mayor = Math.max(0, ...(resumen?.conversaciones.map((c) => c.ultimoRecibidoSinLeer || 0) || []), ultimoId);
    guardarMinimizado(yo, mayor);
    setVista({ tipo: "burbuja" });
  }

  async function nuevoMensaje() {
    setVista({ tipo: "nuevo" });
    try { setPersonas((await pedir<{ personas: Persona[] }>("/api/chat/personas")).personas); }
    catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo cargar la lista"); }
  }

  async function enviar(quien: string) {
    const texto = (borradores[quien] || "").trim();
    if (!texto || enviando) return;
    setEnviando(true);
    try {
      await pedir("/api/chat/enviar", { para: quien, texto });
      setBorradores((b) => ({ ...b, [quien]: "" }));
      await Promise.all([cargarMensajes(quien), cargarResumen()]);
    } catch (e) {
      // el texto no se borra: se puede volver a enviar
      toast.error(e instanceof Error ? e.message : "No se pudo enviar el mensaje");
    } finally {
      setEnviando(false);
    }
  }

  // La burbuja nunca sale de la pantalla; la ventana se abre junto a ella, donde quepa.
  const limitar = (q: Posicion): Posicion => ({ right: entre(q.right, 8, vp.w - BOTON - 8), bottom: entre(q.bottom, 8, vp.h - BOTON - 8) });
  const burbuja = limitar(pos);
  const ancho = Math.min(336, vp.w - 16);
  const alto = Math.min(432, vp.h - 80);
  const haceHueco = !!resumen.junto;
  const cabeAlLado = !haceHueco || vp.w - burbuja.right - HUECO_ASISTENTE - ancho >= 8;
  const ventana = {
    width: ancho,
    height: alto,
    right: entre(burbuja.right + (haceHueco && cabeAlLado ? HUECO_ASISTENTE : 0), 8, vp.w - ancho - 8),
    // En pantallas estrechas, con el asistente, se abre por encima de las dos burbujas.
    bottom: entre(burbuja.bottom + (cabeAlLado ? 0 : 2 * BOTON + 28), 8, vp.h - alto - 8),
  };

  if (vista.tipo === "burbuja") {
    return (
      <button
        type="button"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          arrastre.current = { x: e.clientX, y: e.clientY, ...burbuja, movido: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const a = arrastre.current;
          if (!a) return;
          const dx = e.clientX - a.x, dy = e.clientY - a.y;
          if (!a.movido && Math.hypot(dx, dy) < 6) return;
          a.movido = true;
          posRef.current = limitar({ right: a.right - dx, bottom: a.bottom - dy });
          setPos(posRef.current);
        }}
        onPointerUp={() => {
          const a = arrastre.current;
          arrastre.current = null;
          if (!a?.movido) return;
          // Tras arrastrar no debe contar como clic (abriría el chat).
          ignorarClic.current = true;
          setTimeout(() => { ignorarClic.current = false; }, 0);
          try { window.localStorage.setItem(CLAVE_POSICION, JSON.stringify(posRef.current)); } catch { /* sin almacenamiento */ }
        }}
        onPointerCancel={() => { arrastre.current = null; }}
        style={{ right: burbuja.right, bottom: burbuja.bottom, touchAction: "none" }}
        onClick={() => {
          if (ignorarClic.current) return;
          const pendiente = resumen.conversaciones.filter((c) => c.sinLeer > 0);
          setVista(pendiente.length === 1 ? { tipo: "conversacion", con: pendiente[0].con, nombre: pendiente[0].nombre } : { tipo: "lista" });
        }}
        title={`${resumen.sinLeer ? `${resumen.sinLeer} mensaje(s) sin leer` : "Mensajes"} (mantén pulsado y arrastra para moverlo)`}
        aria-label={resumen.sinLeer ? `Mensajes: ${resumen.sinLeer} sin leer` : "Mensajes"}
        className="fixed z-40 flex size-12 cursor-grab items-center justify-center rounded-full border bg-card text-primary shadow-lg transition-transform hover:scale-105 active:cursor-grabbing print:hidden"
      >
        <Message className="size-6" />
        {resumen.sinLeer > 0 && (
          <>
            <span aria-hidden className="absolute inset-0 animate-ping rounded-full border-2 border-red-500 opacity-60" />
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-[11px] font-bold leading-5 text-white">{resumen.sinLeer > 99 ? "99+" : resumen.sinLeer}</span>
          </>
        )}
      </button>
    );
  }

  const titulo = vista.tipo === "conversacion" ? vista.nombre : vista.tipo === "nuevo" ? "Nuevo mensaje" : "Mensajes";
  const pendientesAqui = lista.some((m) => !m.mio && !m.leidoEn);
  const pendientesFuera = resumen.conversaciones.filter((c) => c.con !== con).reduce((s, c) => s + c.sinLeer, 0);

  return (
    <div ref={caja} role="dialog" aria-label={`Chat: ${titulo}`} style={ventana} className="fixed z-40 flex flex-col overflow-hidden rounded-xl border bg-card shadow-2xl print:hidden">
      <div className="flex items-center gap-1 bg-primary px-2 py-2 text-primary-foreground">
        {vista.tipo !== "lista" && (
          <Button variant="ghost" size="icon-sm" className="relative text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" onClick={() => setVista({ tipo: "lista" })} aria-label="Ver todas las conversaciones" title="Todas las conversaciones">
            <ArrowLeft2 className="size-4" />
            {pendientesFuera > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-[9px] font-bold leading-4 text-white">{pendientesFuera}</span>}
          </Button>
        )}
        <p className="min-w-0 flex-1 truncate pl-1.5 text-sm font-semibold">{titulo}</p>
        {vista.tipo === "lista" && (
          <Button variant="ghost" size="icon-sm" className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" onClick={() => void nuevoMensaje()} aria-label="Nuevo mensaje" title="Nuevo mensaje">
            <Add className="size-5" />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" onClick={esconder} aria-label="Minimizar" title="Minimizar">
          {vista.tipo === "conversacion" ? <MinusCirlce className="size-4" /> : <CloseCircle className="size-4" />}
        </Button>
      </div>

      {vista.tipo === "lista" && (
        <div className="flex-1 overflow-y-auto">
          {resumen.conversaciones.length === 0 && (
            <div className="space-y-3 p-6 text-center text-sm text-muted-foreground">
              <p>Todavía no hay mensajes.</p>
              <Button size="sm" onClick={() => void nuevoMensaje()}>Escribir un mensaje</Button>
            </div>
          )}
          {resumen.conversaciones.map((c) => (
            <button key={c.con} type="button" onClick={() => setVista({ tipo: "conversacion", con: c.con, nombre: c.nombre })} className="flex w-full items-start gap-2 border-b px-3 py-2.5 text-left hover:bg-muted/60">
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={`min-w-0 flex-1 truncate text-sm ${c.sinLeer ? "font-semibold" : "font-medium"}`}>{c.nombre}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{hora(c.ultimo.creadoEn)}</span>
                </span>
                <span className={`block truncate text-xs ${c.sinLeer ? "font-medium text-foreground" : "text-muted-foreground"}`}>{c.ultimo.mio ? "Tú: " : ""}{c.ultimo.texto}</span>
                {c.ultimo.mio && <span className={`block text-[10px] ${c.ultimo.leidoEn ? "text-emerald-600" : "text-amber-600"}`}>{c.ultimo.leidoEn ? `Visto ${hora(c.ultimo.leidoEn)}` : "Sin ver todavía"}</span>}
              </span>
              {c.sinLeer > 0 && <span className="min-w-5 shrink-0 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white">{c.sinLeer}</span>}
            </button>
          ))}
        </div>
      )}

      {vista.tipo === "nuevo" && (
        <div className="flex-1 overflow-y-auto">
          <p className="px-3 py-2 text-xs text-muted-foreground">¿A quién quieres escribir?</p>
          {personas.map((p) => (
            <button key={p.email} type="button" onClick={() => setVista({ tipo: "conversacion", con: p.email, nombre: p.nombre })} className="block w-full border-b px-3 py-2 text-left hover:bg-muted/60">
              <span className="block text-sm font-medium">{p.nombre}</span>
              <span className="block truncate text-xs text-muted-foreground">{p.email}</span>
            </button>
          ))}
        </div>
      )}

      {vista.tipo === "conversacion" && (
        <div className="flex min-h-0 flex-1 flex-col" onPointerDown={() => void marcarVisto(vista.con)}>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {lista.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Escribe el primer mensaje.</p>}
            {lista.map((m, i) => (
              <div key={m.id} className={`flex flex-col ${m.mio ? "items-end" : "items-start"}`}>
                <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-1.5 text-sm ${m.mio ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m.texto}</p>
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  {hora(m.creadoEn)}
                  {m.mio && i === lista.length - 1 && (m.leidoEn ? ` · Visto ${hora(m.leidoEn)}` : " · Sin ver todavía")}
                </span>
              </div>
            ))}
            <div ref={final} />
          </div>
          {pendientesAqui && <p className="border-t bg-amber-50 px-3 py-1 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">Mensaje nuevo: pulsa aquí o responde.</p>}
          <form className="flex items-end gap-2 border-t p-2" onSubmit={(e) => { e.preventDefault(); void enviar(vista.con); }}>
            <Textarea
              value={borradores[vista.con] || ""}
              onChange={(e) => setBorradores((b) => ({ ...b, [vista.con]: e.target.value }))}
              onKeyDown={(e) => {
                void marcarVisto(vista.con);
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void enviar(vista.con); }
              }}
              maxLength={4000}
              rows={1}
              placeholder="Escribe un mensaje…"
              aria-label="Escribe un mensaje"
              className="max-h-24 min-h-9 resize-none"
            />
            <Button type="submit" size="icon" disabled={enviando || !(borradores[vista.con] || "").trim()} aria-label="Enviar">
              <Send2 className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
