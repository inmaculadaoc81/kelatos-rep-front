"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Streamdown } from "streamdown";
import { Send2, CloseCircle, Refresh2, Copy, TickCircle, Book1, SearchNormal1, Microphone, VolumeHigh, VolumeSlash, Clock } from "@/lib/icons";
import { useVoz } from "@/lib/asistente/use-voz";
import { comprobarResguardo, etiquetaResguardo, type FichaResguardo } from "@/lib/asistente/resguardos";
import { analizar, AYUDA_COMANDOS, completar, describir, resolver, respuestaSiNo, extraerNumero, pantallaCoincide, type Comando, type IntencionIncompleta } from "@/lib/asistente/comandos-voz";
import { contextoPantallaActual } from "@/lib/asistente/contexto";

interface Mensaje {
  rol: "usuario" | "asistente";
  texto: string;
  error?: boolean;
}

const CLAVE_STORAGE = "kelatos-asistente-chat";
const CLAVE_LEER = "kelatos-asistente-leer-voz";
const CLAVE_ACCIONES = "kelatos-asistente-acciones";

/** Una orden que el asistente ejecutó (abrir un resguardo, ir a una pantalla…), para repasarla o repetirla. */
interface AccionEjecutada {
  fecha: string;
  frase: string;
  /** Lo que el asistente entendió que había que hacer. */
  entendido: string;
  resultado: string;
  /** Dirección que se abrió (vacía si la orden se canceló o no se entendió). */
  url: string;
  porVoz: boolean;
  /** directa = se ejecutó al instante · confirmada = tras pedir confirmación · cancelada = la persona dijo que no · sin_entender = no se llegó a entender. */
  confirmacion: "directa" | "confirmada" | "cancelada" | "sin_entender";
}

const ETIQUETA_CONFIRMACION: Record<AccionEjecutada["confirmacion"], { texto: string; clase: string }> = {
  directa: { texto: "Ejecutada", clase: "bg-emerald-500/15 text-emerald-700" },
  confirmada: { texto: "Confirmada y ejecutada", clase: "bg-emerald-500/15 text-emerald-700" },
  cancelada: { texto: "Cancelada", clase: "bg-muted text-muted-foreground" },
  sin_entender: { texto: "No se entendió", clase: "bg-amber-500/15 text-amber-700" },
};

/** Orden a medias: o espera un «sí/no», o espera el dato que faltaba (el número de resguardo). */
type Pendiente =
  | { tipo: "confirmar"; comando: Comando; frase: string; intentos: number }
  | { tipo: "completar"; intencion: IntencionIncompleta; frase: string; intentos: number }
  | { tipo: "elegir"; intencion: IntencionIncompleta; opciones: FichaResguardo[]; frase: string; intentos: number }
  | { tipo: "pantalla"; opciones: { ruta: string; nombre: string }[]; frase: string; intentos: number };

/** Por debajo de esta confianza del reconocimiento de voz se pregunta antes de abrir; por encima (y con el resguardo comprobado) se abre directamente. */
const CONFIANZA_MINIMA = 0.8;

const MAX_INTENTOS = 2;

/** Una frase larga o con interrogación no es un «sí/no»: es otra pregunta para el asistente. */
const pareceOtraPregunta = (texto: string) => /[?¿]/.test(texto) || texto.trim().split(/\s+/).length > 7;

function fechaHoraCompleta(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface Sugerencia {
  pregunta: string;
  /** "guia" = explica cómo funciona algo; "datos" = consulta datos reales. */
  tipo: "guia" | "datos";
}

/** Sugerencias de la pantalla de bienvenida, según dónde está el usuario y qué tiene abierto. */
function sugerenciasPara(ruta: string, abierto: { tipo: string; id: string } | null): Sugerencia[] {
  if (abierto?.tipo === "resguardo") {
    return [
      { tipo: "datos", pregunta: "¿Cuándo se generó este resguardo y en qué estado está?" },
      { tipo: "datos", pregunta: "¿Qué correos se le han enviado a este cliente?" },
      { tipo: "guia", pregunta: "¿Qué toca hacer en el estado actual de esta reparación?" },
    ];
  }
  const porPantalla: [string, Sugerencia[]][] = [
    ["/reparaciones/cobros", [{ tipo: "guia", pregunta: "¿Cuándo se considera cobrada una transferencia?" }]],
    ["/reparaciones", [
      { tipo: "guia", pregunta: "¿Qué significa cada estado de una reparación?" },
      { tipo: "datos", pregunta: "¿Cuántas reparaciones se recibieron hoy?" },
      { tipo: "guia", pregunta: "¿Cómo se entrega una reparación y se factura?" },
    ]],
    ["/efectivo", [
      { tipo: "guia", pregunta: "¿Cómo se calcula el saldo de caja?" },
      { tipo: "guia", pregunta: "¿Quién puede retirar efectivo y cómo se hace?" },
    ]],
    ["/compras", [
      { tipo: "guia", pregunta: "¿Cómo funciona Subir pedido con IA?" },
      { tipo: "guia", pregunta: "¿Qué significan los estados de un pedido?" },
    ]],
    ["/equipos", [
      { tipo: "guia", pregunta: "¿Cómo se alquila un equipo paso a paso?" },
      { tipo: "datos", pregunta: "¿Cuántos equipos hay disponibles ahora?" },
    ]],
    ["/facturas-clientes", [
      { tipo: "guia", pregunta: "¿Qué series de facturación hay y para qué sirve cada una?" },
      { tipo: "guia", pregunta: "¿Cómo se hace una rectificativa?" },
    ]],
    ["/stock-piezas", [
      { tipo: "guia", pregunta: "¿Para qué sirve el nombre interno del proveedor?" },
      { tipo: "datos", pregunta: "¿Qué piezas están por debajo del stock mínimo?" },
    ]],
    ["/ventas", [{ tipo: "guia", pregunta: "¿Cómo se registra una venta de piezas?" }]],
    ["/tpv", [{ tipo: "guia", pregunta: "¿Para qué sirve Facturación del día?" }]],
  ];
  const propias = porPantalla.find(([prefijo]) => ruta === prefijo || ruta.startsWith(prefijo + "/"))?.[1] ?? [];
  const generales: Sugerencia[] = [
    { tipo: "guia", pregunta: "¿Para qué sirve esta pantalla?" },
    { tipo: "guia", pregunta: "Explícame el proceso de una reparación de principio a fin" },
    { tipo: "datos", pregunta: "¿Cuántas reparaciones hay en cada estado?" },
  ];
  return [...propias, ...generales].filter((s, i, todas) => todas.findIndex((x) => x.pregunta === s.pregunta) === i).slice(0, 4);
}

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
      {escribiendo && <span className={`ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 rounded-sm bg-primary ${visible.length < texto.length ? "" : "animate-pulse"}`} />}
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
  const router = useRouter();
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
  const [fase, setFase] = useState("");
  const desplazableRef = useRef<HTMLDivElement>(null);
  const enviandoRef = useRef(false);
  const cancelarRef = useRef(false);
  // Leer las respuestas en voz alta: se recuerda en el navegador. Si la pregunta se hizo hablando, la respuesta se lee siempre.
  const [leerRespuestas, setLeerRespuestas] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(CLAVE_LEER) === "1";
    } catch {
      return false;
    }
  });
  // Lo dictado se queda en la caja de texto para revisarlo: NO se envía ni se ejecuta hasta que la persona pulsa Enviar.
  const dictadoRef = useRef(false);
  const confianzaRef = useRef<number | null>(null);
  const voz = useVoz({
    alTerminar: (texto, confianza) => {
      dictadoRef.current = true;
      confianzaRef.current = confianza;
      setEntrada((previo) => (previo.trim() ? `${previo.trim()} ${texto}` : texto));
    },
  });
  // Historial de órdenes ejecutadas: se guarda en este navegador (las últimas 50).
  const [acciones, setAcciones] = useState<AccionEjecutada[]>(() => {
    try {
      const g = typeof window !== "undefined" ? localStorage.getItem(CLAVE_ACCIONES) : null;
      return g ? (JSON.parse(g) as AccionEjecutada[]) : [];
    } catch {
      return [];
    }
  });
  const [verHistorial, setVerHistorial] = useState(false);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const guardarAcciones = (lista: AccionEjecutada[]) => {
    setAcciones(lista);
    try {
      localStorage.setItem(CLAVE_ACCIONES, JSON.stringify(lista));
    } catch {
      /* ignorar */
    }
  };

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

  /** Añade al chat lo dicho por la persona y la respuesta del asistente (y la lee en voz alta si procede). */
  function dialogo(usuario: string, asistente: string, porVoz: boolean) {
    setEntrada("");
    setMensajes((m) => [...m, { rol: "usuario", texto: usuario }, { rol: "asistente", texto: asistente }]);
    if (porVoz || leerRespuestas) voz.hablar(asistente);
  }

  function anotar(a: Omit<AccionEjecutada, "fecha">) {
    guardarAcciones([{ fecha: new Date().toISOString(), ...a }, ...acciones].slice(0, 50));
  }

  function ejecutar(comando: Comando, frase: string, porVoz: boolean, confirmacion: "directa" | "confirmada", respuestaUsuario?: string) {
    const { url, mensaje } = resolver(comando);
    if (respuestaUsuario !== undefined) {
      // La frase original ya está en el chat: aquí solo se añade la respuesta de la persona y el resultado.
      setMensajes((m) => [...m, { rol: "usuario", texto: respuestaUsuario }, { rol: "asistente", texto: mensaje }]);
      if (porVoz || leerRespuestas) voz.hablar(mensaje);
    } else {
      dialogo(frase, mensaje, porVoz);
    }
    anotar({ frase, entendido: describir(comando), resultado: mensaje, url, porVoz, confirmacion });
    setPendiente(null);
    router.push(url);
    setAbierto(false);
  }

  /**
   * Decide qué hacer con una orden ya entendida, comprobando los datos antes de abrir nada:
   *  · si trae un resguardo, se comprueba que EXISTE: si no, se ofrecen los que se le parecen (cifras cambiadas) o se pide repetirlo;
   *  · una orden clara y comprobada se ejecuta directamente (más rápido); solo se pregunta si hay dudas, es decir, si el
   *    reconocimiento de voz no estaba seguro (confianza baja) o no se pudo comprobar el dato.
   */
  async function decidir(comando: Comando, frase: string, porVoz: boolean, confianza: number | null, respuestaUsuario?: string, preguntar?: string) {
    // Orden deducida (no dicha): siempre se pregunta antes de abrir.
    if (preguntar) {
      decir(frase, preguntar, porVoz, respuestaUsuario);
      setPendiente({ tipo: "confirmar", comando, frase, intentos: 0 });
      return;
    }
    const seguro = !porVoz || confianza === null || confianza >= CONFIANZA_MINIMA;
    const numero = comando.tipo === "abrir_resguardo" || comando.tipo === "accion_resguardo" ? comando.resguardo : null;
    const intencion: IntencionIncompleta | null = comando.tipo === "abrir_resguardo" ? "abrir_resguardo" : comando.tipo === "accion_resguardo" ? comando.accion : null;
    if (numero && intencion) {
      const r = await comprobarResguardo(numero);
      if (r && !r.existe) {
        const opciones = r.parecidos;
        const pregunta = opciones.length
          ? `No encuentro el resguardo ${numero}. ¿Te refieres a ${opciones.length > 1 ? "alguno de estos" : "este"}? ${opciones.map(etiquetaResguardo).join(" — ")}`
          : `No encuentro el resguardo ${numero}. Dímelo otra vez, despacio y cifra a cifra.`;
        decir(frase, pregunta, porVoz, respuestaUsuario);
        setPendiente(opciones.length ? { tipo: "elegir", intencion, opciones, frase, intentos: 0 } : { tipo: "completar", intencion, frase, intentos: 0 });
        return;
      }
      if (r?.existe && r.reparacion && !seguro) {
        const q = `Entendí: ${describir(comando)}. Es ${etiquetaResguardo(r.reparacion)}. ¿Lo abro?`;
        decir(frase, q, porVoz, respuestaUsuario);
        setPendiente({ tipo: "confirmar", comando, frase, intentos: 0 });
        return;
      }
      if (!r && porVoz) {
        // No se pudo comprobar el resguardo: no se adivina, se pregunta.
        const q = `Entendí: ${describir(comando)}. No he podido comprobar que exista. ¿Lo abro?`;
        decir(frase, q, porVoz, respuestaUsuario);
        setPendiente({ tipo: "confirmar", comando, frase, intentos: 0 });
        return;
      }
    } else if (!seguro) {
      const q = `Entendí: ${describir(comando)}. ¿Lo hago? Responde sí o no.`;
      decir(frase, q, porVoz, respuestaUsuario);
      setPendiente({ tipo: "confirmar", comando, frase, intentos: 0 });
      return;
    }
    ejecutar(comando, frase, porVoz, "directa", respuestaUsuario);
  }

  /** Muestra la respuesta del asistente: tras la frase nueva de la persona o tras su respuesta a una pregunta pendiente. */
  function decir(frase: string, mensaje: string, porVoz: boolean, respuestaUsuario?: string) {
    if (respuestaUsuario !== undefined) {
      setMensajes((m) => [...m, { rol: "usuario", texto: respuestaUsuario }, { rol: "asistente", texto: mensaje }]);
      if (porVoz || leerRespuestas) voz.hablar(mensaje);
    } else dialogo(frase, mensaje, porVoz);
  }

  /** Una opción pulsada con el ratón o el dedo ya es una confirmación: se abre sin volver a preguntar. */
  async function decidirDesdeBoton(intencion: IntencionIncompleta, resguardo: string, frase: string, textoBoton: string) {
    ejecutar(completar(intencion, resguardo), frase, false, "confirmada", textoBoton);
  }

  /** Devuelve true si el texto era una orden (o la respuesta a una pregunta pendiente) y ya se ha tratado. */
  async function gestionarOrden(texto: string, porVoz: boolean, confianza: number | null): Promise<boolean> {
    // 1) Hay algo a medias: esto es la respuesta.
    if (pendiente) {
      const dicho = respuestaSiNo(texto);
      if (pendiente.tipo === "confirmar") {
        if (dicho === "si") {
          ejecutar(pendiente.comando, pendiente.frase, porVoz, "confirmada", texto);
          return true;
        }
        if (dicho === "no") {
          dialogo(texto, "Vale, no hago nada. Dime qué necesitas.", porVoz);
          anotar({ frase: pendiente.frase, entendido: describir(pendiente.comando), resultado: "La persona canceló la orden.", url: "", porVoz, confirmacion: "cancelada" });
          setPendiente(null);
          return true;
        }
        // Ni sí ni no: puede ser una corrección («no, el 19583», «el resguardo 19583»).
        const corregida = analizar(texto);
        if (corregida?.tipo === "comando") {
          setPendiente(null);
          await decidir(corregida.comando, texto, porVoz, confianza);
          return true;
        }
        if (pareceOtraPregunta(texto)) {
          anotar({ frase: pendiente.frase, entendido: describir(pendiente.comando), resultado: "Se hizo otra pregunta antes de confirmar; la orden se dejó sin ejecutar.", url: "", porVoz, confirmacion: "cancelada" });
          setPendiente(null);
          return false;
        }
        if (pendiente.intentos + 1 >= MAX_INTENTOS) {
          dialogo(texto, "No he entendido tu respuesta, así que no hago nada. Cuéntame con más detalle qué quieres hacer, por ejemplo: «abre el resguardo 19538».", porVoz);
          anotar({ frase: pendiente.frase, entendido: describir(pendiente.comando), resultado: "No se entendió la confirmación; no se ejecutó nada.", url: "", porVoz, confirmacion: "sin_entender" });
          setPendiente(null);
          return true;
        }
        dialogo(texto, `No te he entendido. ¿Lo hago? (${describir(pendiente.comando)}). Responde sí o no.`, porVoz);
        setPendiente({ ...pendiente, intentos: pendiente.intentos + 1 });
        return true;
      }
      if (pendiente.tipo === "pantalla") {
        if (dicho === "no") {
          dialogo(texto, "Vale, no abro nada. Dime qué necesitas.", porVoz);
          anotar({ frase: pendiente.frase, entendido: "Había que elegir entre dos pantallas", resultado: "La persona canceló la orden.", url: "", porVoz, confirmacion: "cancelada" });
          setPendiente(null);
          return true;
        }
        const elegidas = pendiente.opciones.filter((o) => pantallaCoincide(o.ruta, texto));
        if (elegidas.length === 1) {
          setPendiente(null);
          await decidir({ tipo: "ir", ruta: elegidas[0].ruta, nombre: elegidas[0].nombre }, pendiente.frase, porVoz, confianza, texto);
          return true;
        }
        if (pareceOtraPregunta(texto)) {
          anotar({ frase: pendiente.frase, entendido: "Había que elegir entre dos pantallas", resultado: "Se hizo otra pregunta antes de elegir; la orden se dejó sin ejecutar.", url: "", porVoz, confirmacion: "cancelada" });
          setPendiente(null);
          return false;
        }
        if (pendiente.intentos + 1 >= MAX_INTENTOS) {
          dialogo(texto, "No he entendido cuál quieres, así que no abro nada. Dime, por ejemplo, «abre Compras».", porVoz);
          anotar({ frase: pendiente.frase, entendido: "Había que elegir entre dos pantallas", resultado: "No se entendió la elección; no se abrió nada.", url: "", porVoz, confirmacion: "sin_entender" });
          setPendiente(null);
          return true;
        }
        dialogo(texto, `No te he entendido. ¿${pendiente.opciones.map((o) => o.nombre).join(" o ")}?`, porVoz);
        setPendiente({ ...pendiente, intentos: pendiente.intentos + 1 });
        return true;
      }
      // «completar» (se esperaba el número) o «elegir» (se ofrecieron varios resguardos parecidos).
      if (dicho === "no") {
        dialogo(texto, pendiente.tipo === "elegir" ? "Vale. Dime el número del resguardo otra vez, cifra a cifra." : "Vale, lo dejamos. Dime qué necesitas.", porVoz);
        if (pendiente.tipo === "elegir") setPendiente({ tipo: "completar", intencion: pendiente.intencion, frase: pendiente.frase, intentos: 0 });
        else {
          anotar({ frase: pendiente.frase, entendido: `Orden incompleta (${pendiente.intencion})`, resultado: "La persona canceló la orden.", url: "", porVoz, confirmacion: "cancelada" });
          setPendiente(null);
        }
        return true;
      }
      const numero = extraerNumero(texto);
      if (numero) {
        const siguiente = pendiente;
        setPendiente(null);
        await decidir(completar(siguiente.intencion, numero), siguiente.frase, porVoz, confianza, texto);
        return true;
      }
      if (pareceOtraPregunta(texto)) {
        anotar({ frase: pendiente.frase, entendido: `Orden incompleta (${pendiente.intencion})`, resultado: "Se hizo otra pregunta antes de completar la orden; se dejó sin ejecutar.", url: "", porVoz, confirmacion: "cancelada" });
        setPendiente(null);
        return false;
      }
      if (pendiente.intentos + 1 >= MAX_INTENTOS) {
        dialogo(texto, "No he conseguido el número del resguardo, así que no hago nada. Cuando lo tengas, dime por ejemplo «crea un presupuesto para el resguardo 19538».", porVoz);
        anotar({ frase: pendiente.frase, entendido: `Orden incompleta (${pendiente.intencion})`, resultado: "No se obtuvo el número de resguardo; no se ejecutó nada.", url: "", porVoz, confirmacion: "sin_entender" });
        setPendiente(null);
        return true;
      }
      dialogo(texto, "No he entendido el número. Dímelo despacio, cifra a cifra, por ejemplo «uno nueve cinco tres ocho».", porVoz);
      setPendiente({ ...pendiente, intentos: pendiente.intentos + 1 });
      return true;
    }

    // 2) Frase nueva: ¿es una orden?
    const analisis = analizar(texto);
    if (!analisis) return false;
    if (analisis.tipo === "ayuda") {
      dialogo(texto, AYUDA_COMANDOS, false);
      return true;
    }
    if (analisis.tipo === "aclarar") {
      dialogo(texto, analisis.pregunta, porVoz);
      anotar({ frase: texto, entendido: "Orden poco clara: se pidió más detalle", resultado: analisis.pregunta, url: "", porVoz, confirmacion: "sin_entender" });
      return true;
    }
    if (analisis.tipo === "elegir_pantalla") {
      dialogo(texto, analisis.pregunta, porVoz);
      setPendiente({ tipo: "pantalla", opciones: analisis.opciones, frase: texto, intentos: 0 });
      return true;
    }
    if (analisis.tipo === "faltan") {
      dialogo(texto, analisis.pregunta, porVoz);
      setPendiente({ tipo: "completar", intencion: analisis.intencion, frase: texto, intentos: 0 });
      return true;
    }
    await decidir(analisis.comando, texto, porVoz, confianza, undefined, analisis.preguntar);
    return true;
  }

  async function enviar(textoPregunta: string) {
    const pregunta = textoPregunta.trim();
    const porVoz = dictadoRef.current;
    const confianza = confianzaRef.current;
    dictadoRef.current = false;
    confianzaRef.current = null;
    if (!pregunta || enviandoRef.current) return;
    voz.callar();
    // Órdenes (abrir resguardos, formularios y pantallas): se resuelven al instante, sin IA, y NUNCA se ejecutan sin estar seguros:
    //  · lo dictado por voz se confirma antes (los números son lo que más se oye mal);
    //  · si falta un dato (p. ej. el resguardo) se pregunta; si tras repreguntar sigue sin entenderse, se pide más detalle y no se hace nada.
    if (await gestionarOrden(pregunta, porVoz, confianza)) return;
    enviandoRef.current = true;
    cancelarRef.current = false;
    setFase("");
    setRespondiendo(true);
    setEntrada("");
    const historial = mensajes.filter((m) => !m.error && m.texto).slice(-6).map((m) => ({ rol: m.rol, texto: m.texto }));
    setMensajes((m) => [...m, { rol: "usuario", texto: pregunta }, { rol: "asistente", texto: "" }]);
    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta, historial, ruta, contextoPantalla: contextoPantallaActual() }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo consultar al asistente");

      let consultas = 0;
      let textoFinal = "";
      let terminado = false;
      while (!cancelarRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        if (++consultas > 600) throw new Error("La respuesta está tardando demasiado. Inténtalo de nuevo.");
        const r = await fetch(`/api/asistente/${data.jobId}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || "No se pudo leer la respuesta");
        if (typeof d.fase === "string") setFase(d.fase);
        if (d.texto) {
          ponerRespuesta(d.texto);
          textoFinal = d.texto;
        }
        if (d.estado === "error") throw new Error(d.error || "No se pudo responder");
        if (d.estado === "listo") {
          terminado = true;
          break;
        }
      }
      if (terminado && textoFinal && (porVoz || leerRespuestas)) voz.hablar(textoFinal);
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
    voz.callar();
  }

  function alternarLectura() {
    if (voz.hablando) {
      voz.callar();
      return;
    }
    const nuevo = !leerRespuestas;
    setLeerRespuestas(nuevo);
    if (!nuevo) voz.callar();
    try {
      localStorage.setItem(CLAVE_LEER, nuevo ? "1" : "0");
    } catch {
      /* ignorar */
    }
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
          className="flex h-[min(42rem,calc(100dvh-8rem))] w-[min(28rem,calc(100vw-2.5rem))] origin-bottom-right flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200"
        >
          <div className="relative flex items-center gap-3 overflow-hidden bg-primary px-5 py-4 text-primary-foreground">
            {/* Brillos decorativos de la cabecera */}
            <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-primary-foreground/10 blur-2xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-12 left-1/3 size-28 rounded-full bg-primary-foreground/10 blur-2xl" />
            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
              <IconoDestellos className="size-6" />
            </span>
            <div className="relative min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight tracking-tight">Asistente de Kelatos</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs leading-tight text-primary-foreground/85">
                <span className={`size-2 rounded-full ring-2 ring-primary-foreground/30 ${respondiendo ? "animate-pulse bg-amber-300" : "bg-emerald-300"}`} />
                {respondiendo ? "Escribiendo…" : "En línea · te ayudo con el sistema"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVerHistorial((v) => !v)}
              className={`relative rounded-xl p-2 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground ${verHistorial ? "bg-primary-foreground/20 text-primary-foreground" : "text-primary-foreground/85"}`}
              title="Historial de acciones ejecutadas"
              aria-pressed={verHistorial}
            >
              <Clock className="size-4.5" />
              {acciones.length > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-amber-300 px-1 text-[9px] font-bold leading-4 text-amber-950">{acciones.length > 9 ? "9+" : acciones.length}</span>}
            </button>
            {voz.soportaVoz && (
              <button
                type="button"
                onClick={alternarLectura}
                className={`relative rounded-xl p-2 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground ${voz.hablando || leerRespuestas ? "bg-primary-foreground/20 text-primary-foreground" : "text-primary-foreground/85"}`}
                title={voz.hablando ? "Dejar de hablar" : leerRespuestas ? "Las respuestas se leen en voz alta (pulsa para desactivarlo)" : "Leer las respuestas en voz alta"}
                aria-pressed={leerRespuestas}
              >
                {leerRespuestas || voz.hablando ? <VolumeHigh className="size-4.5" /> : <VolumeSlash className="size-4.5" />}
              </button>
            )}
            <button type="button" onClick={nuevaConversacion} disabled={respondiendo || mensajes.length === 0} className="relative rounded-xl p-2 text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground disabled:opacity-30" title="Nueva conversación">
              <Refresh2 className="size-4.5" />
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="relative rounded-xl p-2 text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground" title="Cerrar">
              <CloseCircle className="size-4.5" />
            </button>
          </div>

          <div ref={desplazableRef} className="flex-1 space-y-4 overflow-y-auto bg-muted/40 px-4 py-5 text-sm">
            {verHistorial && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Acciones ejecutadas</h3>
                  <div className="flex gap-2 text-xs">
                    {acciones.length > 0 && <button type="button" className="text-muted-foreground underline hover:text-foreground" onClick={() => guardarAcciones([])}>Borrar historial</button>}
                    <button type="button" className="font-medium text-primary underline" onClick={() => setVerHistorial(false)}>Volver al chat</button>
                  </div>
                </div>
                {acciones.length === 0 ? (
                  <p className="rounded-xl border border-dashed bg-card px-3 py-6 text-center text-[13px] text-muted-foreground">
                    Todavía no se ha ejecutado ninguna orden. Prueba con «abre el resguardo 19538».
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {acciones.map((a, i) => (
                      <li key={`${a.fecha}-${i}`} className="rounded-xl border bg-card px-3 py-2.5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-medium leading-snug">«{a.frase}»</p>
                          <span className={`shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${(ETIQUETA_CONFIRMACION[a.confirmacion] ?? ETIQUETA_CONFIRMACION.directa).clase}`}>
                            {(ETIQUETA_CONFIRMACION[a.confirmacion] ?? ETIQUETA_CONFIRMACION.directa).texto}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{fechaHoraCompleta(a.fecha)}{a.porVoz ? " · 🎤 por voz" : " · escrita"}</p>
                        <details className="mt-1 text-xs">
                          <summary className="cursor-pointer font-medium text-primary">Ver detalle</summary>
                          <dl className="mt-1.5 space-y-1 rounded-lg bg-muted/60 p-2 text-[11.5px] leading-snug">
                            <div><dt className="inline font-semibold">Lo que dijiste: </dt><dd className="inline">«{a.frase}»</dd></div>
                            <div><dt className="inline font-semibold">Lo que entendí: </dt><dd className="inline">{a.entendido || "—"}</dd></div>
                            <div><dt className="inline font-semibold">Resultado: </dt><dd className="inline">{a.resultado}</dd></div>
                            <div><dt className="inline font-semibold">Pantalla abierta: </dt><dd className="inline">{a.url || "ninguna"}</dd></div>
                            <div><dt className="inline font-semibold">Cómo se hizo: </dt><dd className="inline">{a.porVoz ? "dictado por voz" : "escrita a mano"}{a.confirmacion === "confirmada" ? ", con confirmación" : ""}</dd></div>
                          </dl>
                        </details>
                        {a.url && (
                          <button
                            type="button"
                            className="mt-1.5 text-xs font-medium text-primary underline"
                            onClick={() => {
                              router.push(a.url);
                              setAbierto(false);
                            }}
                          >
                            Volver a abrir
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {!verHistorial && mensajes.length === 0 && (
              <div className="flex min-h-full flex-col justify-center space-y-5 py-2">
                <div className="flex flex-col items-center text-center">
                  <span className="relative mb-3 flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-md">
                    <span aria-hidden className="absolute inset-0 animate-ping rounded-3xl bg-primary/20 [animation-duration:2.5s]" />
                    <IconoDestellos className="relative size-8" />
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight">¿En qué te ayudo?</h3>
                  <p className="mt-1 max-w-76 text-[13px] leading-relaxed text-muted-foreground">
                    Te explico cómo funciona cada pantalla y proceso, y consulto los datos que tu cuenta puede ver.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prueba a preguntar</p>
                  <p className="px-1 text-[11.5px] leading-snug text-muted-foreground">
                    También entiendo órdenes, escritas o habladas: «abre el resguardo 19538», «crea un presupuesto para el 19538», «registra un pedido para el 19538», «termina la reparación 19538», «nueva reparación» o «ve a Compras».
                  </p>
                  {sugerenciasPara(ruta, contextoPantallaActual()).map((s) => (
                    <button
                      key={s.pregunta}
                      type="button"
                      onClick={() => enviar(s.pregunta)}
                      className="group flex w-full items-center gap-3 rounded-2xl border bg-card px-3.5 py-2.5 text-left shadow-sm transition-all hover:-translate-y-px hover:border-primary/50 hover:shadow-md"
                    >
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${s.tipo === "datos" ? "bg-muted text-foreground" : "bg-accent text-accent-foreground"}`}>
                        {s.tipo === "datos" ? <SearchNormal1 className="size-4" /> : <Book1 className="size-4" />}
                      </span>
                      <span className="flex-1 text-[13px] font-medium leading-snug">{s.pregunta}</span>
                      <span aria-hidden className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!verHistorial && mensajes.map((m, i) =>
              m.rol === "usuario" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-[13.5px] leading-relaxed text-primary-foreground shadow-sm">
                    {m.texto}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
                          <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-primary" />
                          <span className="ml-1 text-xs">{fase || "Buscando en el sistema…"}</span>
                        </span>
                      )}
                    </div>
                    {!m.error && m.texto && !(respondiendo && i === ultimo) && <BotonCopiar texto={m.texto} />}
                    {pendiente?.tipo === "elegir" && i === ultimo && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pendiente.opciones.map((o) => (
                          <button
                            key={o.resguardo}
                            type="button"
                            onClick={() => {
                              const sig = pendiente;
                              setPendiente(null);
                              void decidirDesdeBoton(sig.intencion, o.resguardo, sig.frase, `El ${o.resguardo}`);
                            }}
                            className="rounded-xl border bg-card px-3 py-1.5 text-left text-xs font-medium shadow-sm hover:bg-accent"
                          >
                            <span className="font-semibold">{o.resguardo}</span>
                            <span className="block text-[10.5px] font-normal text-muted-foreground">{[o.cliente, o.equipo].filter(Boolean).join(" · ")}</span>
                          </button>
                        ))}
                        <button type="button" onClick={() => void gestionarOrden("ninguno, no", false, null)} className="rounded-xl border bg-card px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-accent">Ninguno</button>
                      </div>
                    )}
                    {pendiente?.tipo === "pantalla" && i === ultimo && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pendiente.opciones.map((o) => (
                          <button
                            key={o.ruta}
                            type="button"
                            onClick={() => {
                              const sig = pendiente;
                              setPendiente(null);
                              ejecutar({ tipo: "ir", ruta: o.ruta, nombre: o.nombre }, sig.frase, false, "confirmada", o.nombre);
                            }}
                            className="rounded-xl border bg-card px-3.5 py-1.5 text-xs font-semibold shadow-sm hover:bg-accent"
                          >
                            {o.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                    {pendiente?.tipo === "confirmar" && i === ultimo && (
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => void gestionarOrden("sí", false, null)} className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:brightness-110">
                          Sí, hazlo
                        </button>
                        <button type="button" onClick={() => void gestionarOrden("no", false, null)} className="rounded-xl border bg-card px-3.5 py-1.5 text-xs font-semibold shadow-sm hover:bg-accent">
                          No
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          <div className="border-t bg-card px-3.5 pb-2.5 pt-3">
            <form
              className="flex items-end gap-2 rounded-2xl border bg-background p-1.5 pl-3.5 shadow-sm transition-shadow focus-within:border-primary/60 focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/20"
              onSubmit={(e) => {
                e.preventDefault();
                if (respondiendo) detener();
                else enviar(entrada);
              }}
            >
              <textarea
                rows={1}
                value={voz.escuchando ? voz.parcial : entrada}
                maxLength={1200}
                disabled={respondiendo || voz.escuchando}
                placeholder={respondiendo ? "Respondiendo…" : voz.escuchando ? "Te escucho… pulsa el micrófono cuando termines" : "Escribe o pulsa el micrófono…"}
                onChange={(e) => setEntrada(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!respondiendo) enviar(entrada);
                  }
                }}
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
              />
              {voz.soportaMicrofono && (
                <button
                  type="button"
                  onClick={voz.escuchando ? voz.parar : voz.iniciar}
                  disabled={respondiendo}
                  title={voz.escuchando ? "Pulsa para terminar de dictar (después revisa el texto y pulsa Enviar)" : "Dictar: habla con calma, las pausas no cortan. Pulsa de nuevo al terminar"}
                  aria-pressed={voz.escuchando}
                  className={`relative flex size-9 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-40 ${voz.escuchando ? "bg-red-500 text-white shadow-md" : "bg-muted text-foreground hover:bg-accent"}`}
                >
                  {voz.escuchando && <span aria-hidden className="absolute inset-0 animate-ping rounded-xl bg-red-500/40" />}
                  <Microphone className="relative size-[17px]" />
                </button>
              )}
              <button
                type="submit"
                disabled={voz.escuchando || (!respondiendo && !entrada.trim())}
                title={respondiendo ? "Detener" : "Enviar"}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
              >
                {respondiendo ? <span className="size-3 rounded-[3px] bg-primary-foreground" /> : <Send2 className="size-[17px]" />}
              </button>
            </form>
            {voz.error && <p className="mt-2 text-center text-[11px] text-destructive">{voz.error}</p>}
            <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
              {voz.soportaMicrofono ? "Pulsa el micrófono, habla y vuelve a pulsarlo al terminar; luego revisa y pulsa Enviar. " : "Para dictar por voz usa Chrome o Edge. "}
              Las respuestas pueden contener errores: contrasta los datos importantes.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente de ayuda"}
        title="Asistente de ayuda"
        style={{
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.12)",
        }}
        className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {abierto ? <CloseCircle className="size-7" /> : <IconoDestellos className="size-7" />}
      </button>
    </div>
  );
}
