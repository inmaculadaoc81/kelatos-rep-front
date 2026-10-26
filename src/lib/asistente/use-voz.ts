"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voz del asistente (fase 1, solo lectura): reconocimiento y síntesis de voz del PROPIO NAVEGADOR (Web Speech API),
 * sin servidores ni coste. Chrome y Edge reconocen español; Chrome envía el audio a Google para transcribirlo.
 * La síntesis usa las voces en español que tenga el sistema (en Windows, las «Natural» de Edge suenan mejor).
 */

interface ResultadoVoz { isFinal: boolean; 0: { transcript: string } }
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

export function useVoz({ alTranscribir }: { alTranscribir: (texto: string) => void }) {
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hablando, setHablando] = useState(false);
  const reconocimientoRef = useRef<ReconocimientoVoz | null>(null);
  const alTranscribirRef = useRef(alTranscribir);
  const textoFinalRef = useRef("");

  useEffect(() => {
    alTranscribirRef.current = alTranscribir;
  }, [alTranscribir]);

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

  const parar = useCallback(() => {
    reconocimientoRef.current?.stop();
  }, []);

  const iniciar = useCallback(() => {
    const Ctor = constructorReconocimiento();
    if (!Ctor) {
      setError("Este navegador no reconoce la voz. Usa Chrome o Edge.");
      return;
    }
    callar();
    setError(null);
    setParcial("");
    textoFinalRef.current = "";
    const r = new Ctor();
    r.lang = "es-ES";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let final = "";
      let provisional = "";
      for (let i = 0; i < e.results.length; i++) {
        const frase = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += frase;
        else provisional += frase;
      }
      if (final) textoFinalRef.current = final.trim();
      setParcial((final + provisional).trim());
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") setError(MENSAJES_ERROR[e.error] || `No se pudo escuchar (${e.error}).`);
    };
    r.onend = () => {
      setEscuchando(false);
      reconocimientoRef.current = null;
      const dicho = textoFinalRef.current;
      textoFinalRef.current = "";
      setParcial("");
      if (dicho) alTranscribirRef.current(dicho);
    };
    reconocimientoRef.current = r;
    try {
      r.start();
      setEscuchando(true);
    } catch {
      setError("No se pudo iniciar el micrófono. Inténtalo de nuevo.");
    }
  }, [callar]);

  // Al cerrar la pantalla se corta lo que se estuviera oyendo o diciendo.
  useEffect(() => {
    return () => {
      reconocimientoRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  return { soportaMicrofono, soportaVoz, escuchando, parcial, error, hablando, iniciar, parar, hablar, callar };
}
