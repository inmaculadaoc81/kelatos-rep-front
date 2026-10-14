"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Streamdown } from "streamdown";
import { Send2, CloseCircle, Refresh2, Copy, TickCircle } from "@/lib/icons";

interface Mensaje {
  rol: "usuario" | "asistente";
  texto: string;
  error?: boolean;
}

const CLAVE_STORAGE = "kelatos-asistente-chat";
const SUGERENCIAS = [
  "¿Para qué sirve esta pantalla?",
  "¿Cómo se calcula el efectivo en caja?",
  "¿Dónde se registra una factura recibida?",
  "¿Cómo se alquila un equipo?",
];

/** Destellos (icono "sparkles"): el mismo dibujo que el botón del asistente de referencia. */
function IconoDestellos({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </svg>
  );
}

/**
 * Efecto de escritura: el servidor entrega el texto a trozos (uno por consulta), y aquí se revela letra a letra
 * con una velocidad que se adapta a lo que falta por mostrar (si llega un trozo grande, acelera para no quedarse
 * atrás; si va justo, escribe despacio). Con `animar` en false (mensajes ya terminados) se muestra todo de golpe.
 */
function useTextoEscribiendose(texto: string, animar: boolean): { visible: string; escribiendo: boolean } {
  const [visible, setVisible] = useState(0);
  const [animado, setAnimado] = useState(animar);
  const textoRef = useRef(texto);
  const visibleRef = useRef(0);
  useEffect(() => {
    textoRef.current = texto;
  }, [texto]);
  // Una respuesta que se ha ido escribiendo sigue haciéndolo hasta terminar, aunque la IA ya haya acabado.
  if (animar && !animado) setAnimado(true);
  useEffect(() => {
    if (!animado) return;
    let raf = 0;
    let ultimo = 0;
    const paso = (t: number) => {
      if (t - ultimo >= 28) {
        ultimo = t;
        const falta = textoRef.current.length - visibleRef.current;
        if (falta > 0) {
          visibleRef.current += Math.max(1, Math.ceil(falta * 0.12));
          setVisible(visibleRef.current);
        }
      }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [animado]);
  if (!animado) return { visible: texto, escribiendo: false };
  return { visible: texto.slice(0, visible), escribiendo: visible < texto.length || animar };
}

function Respuesta({ texto, animar }: { texto: string; animar: boolean }) {
  const { visible, escribiendo } = useTextoEscribiendose(texto, animar);
  return (
    <div className="text-[13.5px] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ol]:ml-4 [&_ol]:list-decimal [&_p]:my-1.5 [&_ul]:ml-4 [&_ul]:list-disc">
      <Streamdown>{visible}</Streamdown>
      {escribiendo && <span className={`ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 rounded-sm bg-blue-500 ${visible.length < texto.length ? "" : "animate-pulse"}`} />}
    </div>
  );
}

function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      title="Copiar respuesta"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        } catch {
          /* sin permiso de portapapeles */
        }
      }}
      className="mt-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-muted-foreground hover:bg-background/70 hover:text-foreground"
    >
      {copiado ? <TickCircle className="size-3" /> : <Copy className="size-3" />}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}

/**
 * Asistente de ayuda: botón fijo abajo a la derecha que abre un chat para dudas sobre el sistema (dónde está
 * algo, cómo se calcula, para qué sirve una vista...). La respuesta llega por trozos (se consulta cada medio
 * segundo el texto acumulado) y se muestra escribiéndose. No consulta datos reales, solo explica el funcionamiento.
 * Por ahora solo se monta para superadministradores (ver layout.tsx).
 */
export function AsistenteFlotante() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  // La conversación se conserva mientras dure la pestaña (no entre sesiones). El panel arranca cerrado, así que
  // leerla al montar no provoca diferencias con el HTML del servidor.
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => {
    try {
      const guardado = typeof window !== "undefined" ? sessionStorage.getItem(CLAVE_STORAGE) : null;
      return guardado ? (JSON.parse(guardado) as Mensaje[]) : [];
    } catch {
      return [];
    }
  });
  const [entrada, setEntrada] = useState("");
  const [respondiendo, setRespondiendo] = useState(false);
  const desplazableRef = useRef<HTMLDivElement>(null);
  const enviandoRef = useRef(false);
  const cancelarRef = useRef(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_STORAGE, JSON.stringify(mensajes.slice(-30)));
    } catch {
      /* ignorar */
    }
  }, [mensajes]);

  // Mantiene el final de la conversación a la vista mientras se escribe (si el usuario no ha subido a leer).
  useEffect(() => {
    const el = desplazableRef.current;
    if (!el) return;
    const cercaDelFinal = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (cercaDelFinal || !respondiendo) el.scrollTop = el.scrollHeight;
  }, [mensajes, abierto, respondiendo]);
  useEffect(() => {
    if (!respondiendo) return;
    const id = setInterval(() => {
      const el = desplazableRef.current;
      if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 140) el.scrollTop = el.scrollHeight;
    }, 150);
    return () => clearInterval(id);
  }, [respondiendo]);
  useEffect(() => () => {
    cancelarRef.current = true;
  }, []);

  const ponerRespuesta = useCallback((texto: string) => {
    setMensajes((m) => {
      const copia = [...m];
      copia[copia.length - 1] = { rol: "asistente", texto };
      return copia;
    });
  }, []);

  async function enviar(textoPregunta: string) {
    const pregunta = textoPregunta.trim();
    if (!pregunta || enviandoRef.current) return;
    enviandoRef.current = true;
    cancelarRef.current = false;
    setRespondiendo(true);
    setEntrada("");
    const historial = mensajes.filter((m) => !m.error && m.texto).slice(-6).map((m) => ({ rol: m.rol, texto: m.texto }));
    setMensajes((m) => [...m, { rol: "usuario", texto: pregunta }, { rol: "asistente", texto: "" }]);
    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta, historial, ruta }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo consultar al asistente");

      let consultas = 0;
      while (!cancelarRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        if (++consultas > 600) throw new Error("La respuesta está tardando demasiado. Inténtalo de nuevo.");
        const r = await fetch(`/api/asistente/${data.jobId}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || "No se pudo leer la respuesta");
        if (d.texto) ponerRespuesta(d.texto);
        if (d.estado === "error") throw new Error(d.error || "No se pudo responder");
        if (d.estado === "listo") break;
      }
    } catch (e) {
      const msg = e instanceof Error ? (e.name === "TimeoutError" ? "El asistente no responde. Inténtalo de nuevo." : e.message) : "Error desconocido";
      setMensajes((m) => {
        const ultimo = m[m.length - 1];
        // Si ya había texto parcial se conserva y el error se añade debajo.
        return ultimo?.texto ? [...m, { rol: "asistente", texto: msg, error: true }] : [...m.slice(0, -1), { rol: "asistente", texto: msg, error: true }];
      });
    } finally {
      enviandoRef.current = false;
      setRespondiendo(false);
    }
  }

  function detener() {
    cancelarRef.current = true;
  }

  function nuevaConversacion() {
    if (enviandoRef.current) return;
    setMensajes([]);
  }

  const ultimo = mensajes.length - 1;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-4 print:hidden">
      {abierto && (
        <div
          role="dialog"
          aria-label="Asistente de ayuda de Kelatos"
          className="flex h-[min(40rem,calc(100dvh-8rem))] w-[min(28rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
        >
          <div className="flex items-center gap-3 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 px-4 py-3 text-white">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <IconoDestellos className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Asistente de Kelatos</p>
              <p className="flex items-center gap-1.5 text-[11px] leading-tight text-white/80">
                <span className={`size-1.5 rounded-full ${respondiendo ? "animate-pulse bg-amber-300" : "bg-emerald-300"}`} />
                {respondiendo ? "Escribiendo…" : "Pregúntame cómo funciona el sistema"}
              </p>
            </div>
            <button type="button" onClick={nuevaConversacion} disabled={respondiendo || mensajes.length === 0} className="rounded-md p-1.5 text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-30" title="Nueva conversación">
              <Refresh2 className="size-4" />
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="rounded-md p-1.5 text-white/80 hover:bg-white/15 hover:text-white" title="Cerrar">
              <CloseCircle className="size-4" />
            </button>
          </div>

          <div ref={desplazableRef} className="flex-1 space-y-4 overflow-y-auto bg-muted/30 px-4 py-4 text-sm">
            {mensajes.length === 0 && (
              <div className="space-y-4">
                <div className="flex gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <IconoDestellos className="size-4" />
                  </span>
                  <div className="rounded-2xl rounded-tl-sm bg-card px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm">
                    Hola 👋 Puedo explicarte dónde está una función, cómo se hace algo o cómo se calcula una cifra. No veo datos reales de clientes ni importes: te explico cómo funciona el sistema.
                  </div>
                </div>
                <div className="flex flex-col gap-2 pl-10">
                  {SUGERENCIAS.map((s) => (
                    <button key={s} type="button" onClick={() => enviar(s)} className="rounded-xl border border-blue-200 bg-card px-3 py-2 text-left text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((m, i) =>
              m.rol === "usuario" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-gradient-to-br from-blue-500 to-blue-700 px-3.5 py-2 text-[13.5px] leading-relaxed text-white shadow-sm">
                    {m.texto}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <IconoDestellos className="size-4" />
                  </span>
                  <div className="min-w-0 max-w-[88%]">
                    <div className={m.error ? "rounded-2xl rounded-tl-sm border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-[13.5px] text-destructive" : "rounded-2xl rounded-tl-sm bg-card px-3.5 py-2.5 shadow-sm"}>
                      {m.error ? (
                        m.texto
                      ) : m.texto ? (
                        <Respuesta texto={m.texto} animar={respondiendo && i === ultimo} />
                      ) : (
                        <span className="flex items-center gap-1.5 py-1 text-muted-foreground">
                          <span className="size-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-blue-500" />
                          <span className="ml-1 text-xs">Buscando en el sistema…</span>
                        </span>
                      )}
                    </div>
                    {!m.error && m.texto && !(respondiendo && i === ultimo) && <BotonCopiar texto={m.texto} />}
                  </div>
                </div>
              )
            )}
          </div>

          <form
            className="flex items-end gap-2 border-t bg-card p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (respondiendo) detener();
              else enviar(entrada);
            }}
          >
            <textarea
              rows={1}
              value={entrada}
              maxLength={1200}
              disabled={respondiendo}
              placeholder={respondiendo ? "Respondiendo…" : "Escribe tu pregunta…"}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!respondiendo) enviar(entrada);
                }
              }}
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!respondiendo && !entrada.trim()}
              title={respondiendo ? "Detener" : "Enviar"}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
            >
              {respondiendo ? <span className="size-3.5 rounded-sm bg-white" /> : <Send2 className="size-[18px]" />}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente de ayuda"}
        title="Asistente de ayuda"
        style={{
          background: "linear-gradient(145deg, rgb(96, 165, 250) 0%, rgb(37, 99, 235) 60%, rgb(29, 78, 216) 100%)",
          boxShadow: "rgba(37, 99, 235, 0.45) 0px 4px 20px, rgba(0, 0, 0, 0.15) 0px 2px 8px",
        }}
        className="flex size-16 items-center justify-center rounded-full text-white transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
      >
        {abierto ? <CloseCircle className="size-7" /> : <IconoDestellos className="size-7" />}
      </button>
    </div>
  );
}
