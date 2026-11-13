"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Room, RoomEvent, Track, type RemoteParticipant, type RemoteTrack } from "livekit-client";
import { toast } from "sonner";
import { Call } from "@/lib/icons";

/**
 * TELÉFONO DEL DASHBOARD. El empleado habla desde el navegador (micrófono y auriculares) y el cliente recibe la llamada con el número de la empresa.
 * Dos motores, según lo que esté configurado en el servidor:
 *   - «sip»: el navegador se registra DIRECTAMENTE en la Línea SIP de Netelip por WebRTC (WSS) con SIP.js. Sin intermediarios ni coste extra.
 *   - «livekit»: puente (LiveKit) que marca por el SIP Trunk de Netelip. Reserva por si Netelip no admite el motor directo.
 * El propio navegador graba las dos voces (mezcla para escuchar + cada voz por separado para transcribir) y las sube al terminar.
 * Si la telefonía no está activada en el servidor, `disponible` es false y la ficha sigue usando el enlace «tel:».
 */

type Fase = "reposo" | "conectando" | "llamando" | "en_llamada" | "terminando";
type Resultado = "completada" | "no_contesta" | "ocupado" | "fallida";
/** `contactoId`: llamada desde el panel Comercial (contacto de una lista). `alTerminar` se llama al colgar, con el id de la llamada, para registrar su resultado. */
export interface ResumenFinLlamada { llamadaId: string | null; contestada: boolean; duracionSeg: number }
export interface OpcionesLlamada { telefono: string; resguardo?: string; nombre?: string; contactoId?: number; alTerminar?: (r: ResumenFinLlamada) => void }
interface Contexto { disponible: boolean; ocupado: boolean; llamar: (o: OpcionesLlamada) => Promise<void> }
interface Motor { colgar: () => Promise<void>; silenciar: (silenciado: boolean) => Promise<void> }
interface RespuestaIniciar {
  id: string; modo: "sip" | "livekit";
  url?: string; token?: string;                                                   // livekit
  sip?: { wss: string; dominio: string; usuario: string; clave: string }; numeroMarcado?: string;   // sip
}

const SoftphoneContext = createContext<Contexto>({ disponible: false, ocupado: false, llamar: async () => {} });
export const useSoftphone = () => useContext(SoftphoneContext);

const SEGUNDOS_SIN_CONTESTAR = 60;

async function post<T>(url: string, cuerpo?: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo ?? {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.ok === false) throw new Error(d.error || `Error ${r.status}`);
  return d as T;
}

function aBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
    lector.onerror = reject;
    lector.readAsDataURL(blob);
  });
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

interface Grabadora { clave: "mezcla" | "empleado" | "cliente"; rec: MediaRecorder; trozos: Blob[] }

export function SoftphoneProvider({ children }: { children: ReactNode }) {
  const [disponible, setDisponible] = useState(false);
  const [fase, setFase] = useState<Fase>("reposo");
  const [info, setInfo] = useState<OpcionesLlamada | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [segundos, setSegundos] = useState(0);
  const [silenciado, setSilenciado] = useState(false);

  const motor = useRef<Motor | null>(null);
  const idLlamada = useRef<string | null>(null);
  const contestada = useRef(false);
  const inicioConversacion = useRef(0);
  const inicioMarcado = useRef(0);
  const esperaSeg = useRef<number | null>(null);
  const alTerminarRef = useRef<((r: ResumenFinLlamada) => void) | null>(null);
  const terminada = useRef(false);
  const remoto = useRef<MediaStreamTrack | null>(null);
  const pistaMic = useRef<MediaStreamTrack | null>(null);
  const grabadoras = useRef<Grabadora[]>([]);
  const contexto = useRef<AudioContext | null>(null);
  const temporizador = useRef<ReturnType<typeof setInterval> | null>(null);
  const esperaContestar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elementosAudio = useRef<HTMLMediaElement[]>([]);

  useEffect(() => {
    let vivo = true;
    fetch("/api/telefonia/config").then((r) => r.json()).then((d) => { if (vivo) setDisponible(!!d.activo); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const limpiarTemporizadores = useCallback(() => {
    if (temporizador.current) clearInterval(temporizador.current);
    if (esperaContestar.current) clearTimeout(esperaContestar.current);
    temporizador.current = null; esperaContestar.current = null;
  }, []);

  const empezarGrabacion = useCallback(() => {
    const pistaRemota = remoto.current;
    const pistaPropia = pistaMic.current;
    if (!pistaRemota || !pistaPropia || grabadoras.current.length) return;
    try {
      const ctx = new AudioContext();
      const destino = ctx.createMediaStreamDestination();
      ctx.createMediaStreamSource(new MediaStream([pistaPropia])).connect(destino);
      ctx.createMediaStreamSource(new MediaStream([pistaRemota])).connect(destino);
      contexto.current = ctx;
      const tipo = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const crear = (clave: Grabadora["clave"], flujo: MediaStream): Grabadora => {
        const rec = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined);
        const g: Grabadora = { clave, rec, trozos: [] };
        rec.ondataavailable = (e) => { if (e.data.size) g.trozos.push(e.data); };
        rec.start(1000);
        return g;
      };
      grabadoras.current = [crear("mezcla", destino.stream), crear("empleado", new MediaStream([pistaPropia])), crear("cliente", new MediaStream([pistaRemota]))];
    } catch (e) {
      console.error("No se pudo empezar la grabación", e);
    }
  }, []);

  const pararGrabacion = useCallback(async (): Promise<Record<string, { base64: string; mime: string }> | null> => {
    const gs = grabadoras.current;
    grabadoras.current = [];
    if (!gs.length) return null;
    await Promise.all(gs.map((g) => new Promise<void>((res) => { g.rec.onstop = () => res(); if (g.rec.state !== "inactive") g.rec.stop(); else res(); })));
    contexto.current?.close().catch(() => {}); contexto.current = null;
    const salida: Record<string, { base64: string; mime: string }> = {};
    for (const g of gs) {
      if (!g.trozos.length) continue;
      const blob = new Blob(g.trozos, { type: g.rec.mimeType || "audio/webm" });
      salida[g.clave] = { base64: await aBase64(blob), mime: blob.type };
    }
    return Object.keys(salida).length ? salida : null;
  }, []);

  const terminar = useCallback(async (resultado: Resultado, aviso?: string) => {
    if (terminada.current) return;
    terminada.current = true;
    limpiarTemporizadores();
    setFase("terminando");
    setMensaje(aviso || "Terminando la llamada…");
    const duracion = contestada.current ? Math.max(0, Math.round((Date.now() - inicioConversacion.current) / 1000)) : 0;
    const id = idLlamada.current;
    const audios = await pararGrabacion();
    try { await motor.current?.colgar(); } catch { /* ya estaba colgada */ }
    elementosAudio.current.forEach((el) => el.remove()); elementosAudio.current = [];
    motor.current = null; remoto.current = null; pistaMic.current = null;
    if (id) {
      try { await post(`/api/telefonia/${id}/fin`, { resultado, duracionSeg: duracion, esperaSeg: contestada.current ? esperaSeg.current : null }); } catch (e) { console.error(e); }
      if (audios && contestada.current) {
        setMensaje("Guardando la grabación…");
        try {
          await post(`/api/telefonia/${id}/audio`, { mezcla: audios.mezcla, empleado: audios.empleado, cliente: audios.cliente, duracionSeg: duracion });
          toast.success("Llamada guardada. En unos segundos tendrá transcripción en Informes → Llamadas.");
        } catch (e) {
          toast.error("La llamada terminó pero no se pudo guardar la grabación: " + (e instanceof Error ? e.message : "error"));
        }
      }
    }
    setFase("reposo"); setInfo(null); setMensaje(""); setSegundos(0); setSilenciado(false);
    idLlamada.current = null;
    const aviso2 = alTerminarRef.current; alTerminarRef.current = null;
    try { aviso2?.({ llamadaId: id, contestada: contestada.current, duracionSeg: duracion }); } catch { /* el aviso no debe romper el cierre */ }
  }, [limpiarTemporizadores, pararGrabacion]);

  const alContestar = useCallback(() => {
    if (contestada.current || terminada.current) return;
    contestada.current = true;
    inicioConversacion.current = Date.now();
    esperaSeg.current = inicioMarcado.current ? Math.max(0, Math.round((Date.now() - inicioMarcado.current) / 1000)) : null;
    if (esperaContestar.current) clearTimeout(esperaContestar.current);
    setFase("en_llamada"); setMensaje("");
    temporizador.current = setInterval(() => setSegundos(Math.round((Date.now() - inicioConversacion.current) / 1000)), 500);
    empezarGrabacion();
  }, [empezarGrabacion]);

  const esperarRespuesta = useCallback(() => {
    esperaContestar.current = setTimeout(() => { if (!contestada.current) void terminar("no_contesta", "El cliente no ha contestado"); }, SEGUNDOS_SIN_CONTESTAR * 1000);
  }, [terminar]);

  // ── Motor directo con Netelip (SIP.js, WebRTC sobre WebSocket)
  const llamarSip = useCallback(async (ini: RespuestaIniciar) => {
    const { UserAgent, Inviter, SessionState } = await import("sip.js");
    const s = ini.sip!;
    const uri = UserAgent.makeURI(`sip:${s.usuario}@${s.dominio}`);
    if (!uri) throw new Error("La configuración SIP no es válida (usuario o dominio)");
    const ua = new UserAgent({
      uri, transportOptions: { server: s.wss }, authorizationUsername: s.usuario, authorizationPassword: s.clave, logLevel: "error",
      sessionDescriptionHandlerFactoryOptions: { peerConnectionConfiguration: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] } },
    });
    setMensaje("Conectando con la centralita…");
    await ua.start();
    const destino = UserAgent.makeURI(`sip:${ini.numeroMarcado}@${s.dominio}`);
    if (!destino) throw new Error("Número no válido");
    const inviter = new Inviter(ua, destino, { sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } } });
    motor.current = {
      colgar: async () => {
        try { if (inviter.state === SessionState.Established) await inviter.bye(); else if (inviter.state === SessionState.Initial || inviter.state === SessionState.Establishing) await inviter.cancel(); } catch { /* ya terminada */ }
        try { await ua.stop(); } catch { /* ya parada */ }
      },
      silenciar: async (silenciar) => { if (pistaMic.current) pistaMic.current.enabled = !silenciar; },
    };
    inviter.stateChange.addListener((estado) => {
      if (estado === SessionState.Established) {
        const pc = (inviter.sessionDescriptionHandler as unknown as { peerConnection?: RTCPeerConnection } | undefined)?.peerConnection;
        const rx = pc?.getReceivers().find((r) => r.track?.kind === "audio")?.track;
        const tx = pc?.getSenders().find((x) => x.track?.kind === "audio")?.track;
        if (rx) {
          const el = document.createElement("audio");
          el.autoplay = true; el.srcObject = new MediaStream([rx]); el.style.display = "none";
          document.body.appendChild(el); elementosAudio.current.push(el);
          remoto.current = rx;
        }
        pistaMic.current = tx ?? null;
        alContestar();
      }
      if (estado === SessionState.Terminated) void terminar(contestada.current ? "completada" : "no_contesta", contestada.current ? undefined : "El cliente no ha contestado");
    });
    setFase("llamando"); setMensaje("Marcando…");
    await inviter.invite({
      requestDelegate: {
        onProgress: () => setMensaje("Sonando…"),
        onReject: (resp) => {
          const codigo = resp.message.statusCode;
          void terminar(codigo === 486 || codigo === 600 || codigo === 603 ? "ocupado" : "fallida", codigo === 486 || codigo === 600 ? "El número está ocupado" : `No se pudo completar la llamada (${codigo} ${resp.message.reasonPhrase || ""})`);
        },
      },
    });
    esperarRespuesta();
  }, [alContestar, esperarRespuesta, terminar]);

  // ── Motor puente (LiveKit)
  const llamarLiveKit = useCallback(async (ini: RespuestaIniciar) => {
    const room = new Room({ audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    motor.current = { colgar: async () => { await room.disconnect(); }, silenciar: async (silenciar) => { await room.localParticipant.setMicrophoneEnabled(!silenciar); } };
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, participante: RemoteParticipant) => {
      if (track.kind !== Track.Kind.Audio) return;
      const el = track.attach() as HTMLMediaElement;
      el.style.display = "none"; document.body.appendChild(el); elementosAudio.current.push(el);
      if (participante.identity === "cliente") { remoto.current = track.mediaStreamTrack; if (contestada.current) empezarGrabacion(); }
    });
    room.on(RoomEvent.ParticipantAttributesChanged, (_cambios, participante) => {
      if (participante.identity !== "cliente") return;
      const estado = participante.attributes["sip.callStatus"];
      if (estado === "ringing" || estado === "dialing") setMensaje("Sonando…");
      if (estado === "active") { pistaMic.current = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack ?? null; alContestar(); }
      if (estado === "hangup") void terminar(contestada.current ? "completada" : "no_contesta", contestada.current ? undefined : "El cliente no ha contestado");
    });
    room.on(RoomEvent.ParticipantDisconnected, (p) => { if (p.identity === "cliente") void terminar(contestada.current ? "completada" : "no_contesta", contestada.current ? undefined : "El cliente no ha contestado"); });
    room.on(RoomEvent.Disconnected, () => { void terminar(contestada.current ? "completada" : "fallida"); });
    await room.connect(ini.url!, ini.token!);
    await room.localParticipant.setMicrophoneEnabled(true);
    setFase("llamando"); setMensaje("Marcando…");
    await post(`/api/telefonia/${ini.id}/marcar`);
    esperarRespuesta();
  }, [alContestar, empezarGrabacion, esperarRespuesta, terminar]);

  const llamar = useCallback(async (o: OpcionesLlamada) => {
    if (fase !== "reposo") { toast.info("Ya hay una llamada en curso."); return; }
    terminada.current = false; contestada.current = false; esperaSeg.current = null; inicioMarcado.current = Date.now(); setSegundos(0); setSilenciado(false);
    setInfo(o); setFase("conectando"); setMensaje("Conectando…");
    try {
      try { (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach((t) => t.stop()); }
      catch { throw new Error("Hace falta permitir el micrófono del navegador (icono del candado, junto a la dirección)."); }
      alTerminarRef.current = o.alTerminar ?? null;
      const ini = await post<RespuestaIniciar>("/api/telefonia/iniciar", { telefono: o.telefono, resguardo: o.resguardo, contactoId: o.contactoId });
      idLlamada.current = ini.id;
      if (ini.modo === "sip") await llamarSip(ini); else await llamarLiveKit(ini);
    } catch (e) {
      const texto = e instanceof Error ? e.message : "No se pudo llamar";
      toast.error(texto);
      await terminar("fallida", texto);
    }
  }, [fase, llamarSip, llamarLiveKit, terminar]);

  const colgar = useCallback(() => { void terminar(contestada.current ? "completada" : "no_contesta", contestada.current ? undefined : "Llamada cancelada"); }, [terminar]);

  const alternarSilencio = useCallback(async () => {
    const nuevo = !silenciado;
    await motor.current?.silenciar(nuevo);
    setSilenciado(nuevo);
  }, [silenciado]);

  useEffect(() => () => { limpiarTemporizadores(); void motor.current?.colgar(); }, [limpiarTemporizadores]);

  const valor = useMemo<Contexto>(() => ({ disponible, ocupado: fase !== "reposo", llamar }), [disponible, fase, llamar]);

  return (
    <SoftphoneContext.Provider value={valor}>
      {children}
      {fase !== "reposo" && info && (
        <div className="fixed right-4 bottom-4 z-50 w-80 rounded-2xl border bg-card p-4 shadow-2xl" role="dialog" aria-label="Llamada en curso">
          <div className="flex items-center gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${fase === "en_llamada" ? "bg-green-500/15 text-green-600" : "bg-primary/10 text-primary"}`}><Call className="size-5" /></span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{info.nombre || info.telefono}</div>
              <div className="truncate text-xs text-muted-foreground">{info.nombre ? info.telefono : info.resguardo ? `Resguardo ${info.resguardo}` : ""}</div>
            </div>
            <div className="ml-auto text-lg font-semibold tabular-nums">{fase === "en_llamada" ? mmss(segundos) : ""}</div>
          </div>
          <div className="mt-3 text-sm">{fase === "en_llamada" ? <span className="font-medium text-green-600">En llamada</span> : mensaje}</div>
          {fase === "en_llamada" && (
            <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
              Esta llamada se está grabando. Avisa al cliente: «Esta llamada puede ser grabada».
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={alternarSilencio} disabled={fase === "terminando" || fase === "conectando"} className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
              {silenciado ? "Activar micro" : "Silenciar"}
            </button>
            <button type="button" onClick={colgar} disabled={fase === "terminando"} className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {fase === "terminando" ? "Un momento…" : "Colgar"}
            </button>
          </div>
        </div>
      )}
    </SoftphoneContext.Provider>
  );
}
