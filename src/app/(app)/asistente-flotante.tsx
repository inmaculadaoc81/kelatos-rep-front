"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import { Message, MessageQuestion, Send2, CloseCircle, Refresh2 } from "@/lib/icons";

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

/**
 * Asistente de ayuda: burbuja fija abajo a la derecha que responde dudas sobre el sistema (dónde está algo,
 * cómo se calcula, para qué sirve una vista...). La respuesta llega en streaming: se consulta cada segundo el
 * texto acumulado hasta que la IA termina. No consulta datos reales, solo explica el funcionamiento.
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
  const finRef = useRef<HTMLDivElement>(null);
  const enviandoRef = useRef(false);
  const cancelarRef = useRef(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_STORAGE, JSON.stringify(mensajes.slice(-30)));
    } catch {
      /* ignorar */
    }
  }, [mensajes]);
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes, abierto]);
  useEffect(() => () => {
    cancelarRef.current = true;
  }, []);

  const ponerRespuesta = useCallback((texto: string, error = false) => {
    setMensajes((m) => {
      const copia = [...m];
      copia[copia.length - 1] = { rol: "asistente", texto, error };
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
        await new Promise((r) => setTimeout(r, 1000));
        if (++consultas > 300) throw new Error("La respuesta está tardando demasiado. Inténtalo de nuevo.");
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

  function nuevaConversacion() {
    if (enviandoRef.current) return;
    setMensajes([]);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 print:hidden">
      {abierto && (
        <div
          role="dialog"
          aria-label="Asistente de ayuda de Kelatos"
          className="flex h-[min(34rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl"
        >
          <div className="flex items-center gap-2 bg-primary px-3 py-2.5 text-primary-foreground">
            <MessageQuestion className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Asistente de Kelatos</p>
              <p className="text-[11px] leading-tight opacity-80">Pregúntame cómo funciona el sistema</p>
            </div>
            <button type="button" onClick={nuevaConversacion} disabled={respondiendo || mensajes.length === 0} className="rounded p-1 opacity-80 hover:opacity-100 disabled:opacity-30" title="Nueva conversación">
              <Refresh2 className="size-4" />
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="rounded p-1 opacity-80 hover:opacity-100" title="Cerrar">
              <CloseCircle className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
            {mensajes.length === 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Hola 👋 Puedo explicarte dónde está una función, cómo se hace algo o cómo se calcula una cifra. No veo datos de clientes ni importes reales: te explico cómo funciona.
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGERENCIAS.map((s) => (
                    <button key={s} type="button" onClick={() => enviar(s)} className="rounded-lg border px-3 py-1.5 text-left text-xs hover:bg-muted">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={m.rol === "usuario" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.rol === "usuario"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
                      : m.error
                        ? "max-w-[90%] rounded-2xl rounded-bl-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive"
                        : "max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2"
                  }
                >
                  {m.rol === "asistente" && !m.error ? (
                    m.texto ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <Streamdown>{m.texto}</Streamdown>
                      </div>
                    ) : (
                      <span className="animate-pulse text-muted-foreground">Buscando en el sistema…</span>
                    )
                  ) : (
                    <span className="whitespace-pre-wrap">{m.texto}</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={finRef} />
          </div>

          <form
            className="flex items-end gap-2 border-t p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(entrada);
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
                  enviar(entrada);
                }
              }}
              className="max-h-28 min-h-9 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
            <Button type="submit" size="icon" className="size-9 shrink-0" disabled={respondiendo || !entrada.trim()} title="Enviar">
              <Send2 className="size-4" />
            </Button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente de ayuda"}
        title="Asistente de ayuda"
        className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {abierto ? <CloseCircle className="size-6" /> : <Message className="size-6" />}
      </button>
    </div>
  );
}
