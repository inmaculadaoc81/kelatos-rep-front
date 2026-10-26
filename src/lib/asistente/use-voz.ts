"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voz del asistente (fase 1, solo lectura): reconocimiento y síntesis de voz del PROPIO NAVEGADOR (Web Speech API),
 * sin servidores ni coste. Chrome y Edge reconocen español; Chrome envía el audio a Google para transcribirlo.
 * La síntesis usa las voces en español que tenga el sistema (en Windows, las «Natural» de Edge suenan mejor).
 */

interface ResultadoVoz { isFinal: boolean; 0: { transcript: string; confidence?: number } }
interface EventoResultado { resultIndex: number; results: ArrayLike<ResultadoVoz> }
interface ReconocimientoVoz {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: EventoResultado) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type ConstructorReconocimiento = new () => ReconocimientoVoz;

function constructorReconocimiento(): ConstructorReconocimiento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstructorReconocimiento; webkitSpeechRecognition?: ConstructorReconocimiento };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const MENSAJES_ERROR: Record<string, string> = {
  "not-allowed": "El navegador no tiene permiso para usar el micrófono. Actívalo en el candado de la barra de direcciones.",
  "service-not-allowed": "El navegador no permite el reconocimiento de voz en esta página.",
  "no-speech": "No te he oído. Pulsa el micrófono y habla cuando aparezca «Te escucho».",
  "audio-capture": "No encuentro ningún micrófono conectado.",
  network: "Sin conexión con el servicio de reconocimiento de voz del navegador.",
};

/** Deja el texto de una respuesta listo para leerlo en voz alta: sin Markdown, código, enlaces ni tablas, y de longitud razonable. */
export function limpiarParaVoz(texto: string, maximo = 800): string {
  let t = texto
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .split("\n")
    .filter((l) => !/^\s*\|/.test(l) && !/^\s*[-=_]{3,}\s*$/.test(l))
    .join("\n")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/(\*\*|__|\*|_)/g, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > maximo) {
    const corte = t.lastIndexOf(". ", maximo);
    t = (corte > maximo * 0.5 ? t.slice(0, corte + 1) : t.slice(0, maximo)) + " Te dejo el resto escrito.";
  }
  return t;
}

function elegirVoz(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voces = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("es"));
  if (voces.length === 0) return null;
  const puntuar = (v: SpeechSynthesisVoice) =>
    (/natural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 3 : 0) + (v.lang.toLowerCase() === "es-es" ? 2 : 0) + (v.localService ? 0 : 1);
  return [...voces].sort((a, b) => puntuar(b) - puntuar(a))[0];
}

/**
 * `alTerminar` recibe TODO lo dictado cuando la persona pulsa el micrófono para terminar. Mientras tanto se escucha de
 * forma continua: las pausas al pensar no cortan el dictado (si el navegador cierra la escucha por su cuenta, se reanuda sola).
 * Nada se envía ni se ejecuta hasta que la persona revisa el texto y pulsa Enviar.
 */
export function useVoz({ alTerminar }: { alTerminar: (texto: string, confianza: number | null) => void }) {
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hablando, setHablando] = useState(false);
  const reconocimientoRef = useRef<ReconocimientoVoz | null>(null);
  const alTerminarRef = useRef(alTerminar);
  const acumuladoRef = useRef("");
  const ultimoRef = useRef("");
  const quiereRef = useRef(false);
  const confianzas = useRef<number[]>([]);
  const reinicios = useRef<number[]>([]);
  const arrancarRef = useRef<() => void>(() => {});

  useEffect(() => {
    alTerminarRef.current = alTerminar;
  }, [alTerminar]);

  const soportaMicrofono = constructorReconocimiento() !== null;
  const soportaVoz = typeof window !== "undefined" && "speechSynthesis" in window;

  const callar = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setHablando(false);
  }, []);

  const hablar = useCallback((texto: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const limpio = limpiarParaVoz(texto);
    if (!limpio) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(limpio);
    u.lang = "es-ES";
    u.rate = 1;
    const voz = elegirVoz();
    if (voz) u.voice = voz;
    u.onstart = () => setHablando(true);
    u.onend = () => setHablando(false);
    u.onerror = () => setHablando(false);
    window.speechSynthesis.speak(u);
  }, []);

  /** Cierra el dictado y entrega el texto completo. */
  const finalizar = useCallback(() => {
    quiereRef.current = false;
    reconocimientoRef.current = null;
    setEscuchando(false);
    const dicho = ultimoRef.current.trim();
    ultimoRef.current = "";
    acumuladoRef.current = "";
    setParcial("");
    // Confianza media del reconocimiento (0 a 1; null si el navegador no la da). El asistente la usa para decidir si pregunta.
    const c = confianzas.current.filter((x) => x > 0);
    confianzas.current = [];
    if (dicho) alTerminarRef.current(dicho, c.length ? c.reduce((a, b) => a + b, 0) / c.length : null);
  }, []);

  const arrancar = useCallback(() => {
    const Ctor = constructorReconocimiento();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "es-ES";
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let nuevoFinal = "";
      let provisional = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const frase = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          nuevoFinal += frase;
          confianzas.current.push(e.results[i][0].confidence ?? 0);
        } else provisional += frase;
      }
      if (nuevoFinal) acumuladoRef.current = `${acumuladoRef.current} ${nuevoFinal}`.trim();
      const visible = `${acumuladoRef.current} ${provisional}`.trim();
      ultimoRef.current = visible;
      setParcial(visible);
    };
    r.onerror = (e) => {
      if (e.error === "aborted" || e.error === "no-speech") return; // las pausas largas se reanudan solas en onend
      setError(MENSAJES_ERROR[e.error] || `No se pudo escuchar (${e.error}).`);
      quiereRef.current = false;
    };
    r.onend = () => {
      if (!quiereRef.current) {
        finalizar();
        return;
      }
      // El navegador cerró la escucha (silencio largo, límite de tiempo…) y la persona no había terminado: se reanuda.
      const ahora = Date.now();
      reinicios.current = [...reinicios.current.filter((x) => ahora - x < 5000), ahora];
      if (reinicios.current.length > 6) {
        setError("El micrófono se está cortando. Vuelve a pulsarlo para seguir dictando.");
        finalizar();
        return;
      }
      setTimeout(() => {
        if (quiereRef.current) arrancarRef.current();
      }, 200);
    };
    reconocimientoRef.current = r;
    try {
      r.start();
    } catch {
      setError("No se pudo iniciar el micrófono. Inténtalo de nuevo.");
      finalizar();
    }
  }, [finalizar]);

  useEffect(() => {
    arrancarRef.current = arrancar;
  }, [arrancar]);

  const iniciar = useCallback(() => {
    if (!constructorReconocimiento()) {
      setError("Este navegador no reconoce la voz. Usa Chrome o Edge.");
      return;
    }
    callar();
    setError(null);
    setParcial("");
    acumuladoRef.current = "";
    ultimoRef.current = "";
    reinicios.current = [];
    confianzas.current = [];
    quiereRef.current = true;
    setEscuchando(true);
    arrancar();
  }, [callar, arrancar]);

  const parar = useCallback(() => {
    quiereRef.current = false;
    if (reconocimientoRef.current) reconocimientoRef.current.stop();
    else finalizar();
  }, [finalizar]);

  // Al cerrar la pantalla se corta lo que se estuviera oyendo o diciendo.
  useEffect(() => {
    return () => {
      quiereRef.current = false;
      reconocimientoRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  return { soportaMicrofono, soportaVoz, escuchando, parcial, error, hablando, iniciar, parar, hablar, callar };
}
