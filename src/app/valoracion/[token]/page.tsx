"use client";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";

interface Motivo {
  id: string;
  etiqueta: string;
}

type Estado = "cargando" | "valido" | "usado" | "expirado" | "invalido" | "enviado" | "error";

const MAX_COMENTARIO = 1500;

// Inicio de sesión con Google (Google Identity Services), como Google Forms: el
// correo sale de la cuenta del cliente y el servidor lo verifica. No crea sesión
// ni cookie en este sitio.
type GoogleId = {
  initialize: (o: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  prompt: () => void;
  disableAutoSelect: () => void;
};
const gis = () => (window as unknown as { google?: { accounts?: { id?: GoogleId } } }).google?.accounts?.id;

function leerPayload(jwt: string): { email?: string; name?: string } {
  const b64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Formulario público de valoración. Sin cabecera, menú ni enlaces al
 * dashboard: una sola tarjeta. El enlace es de un solo uso y el correo
 * con el que se envía queda registrado (no se puede repetir).
 */
export default function ValoracionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [nombre, setNombre] = useState<string | null>(null);
  const [anonimo, setAnonimo] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [credencial, setCredencial] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleNombre, setGoogleNombre] = useState("");
  const [gisListo, setGisListo] = useState(false);
  const [gisError, setGisError] = useState<string | null>(null);
  const botonGoogle = useRef<HTMLDivElement>(null);
  const [nombreEscrito, setNombreEscrito] = useState("");
  const [telefono, setTelefono] = useState("");
  const [resguardo, setResguardo] = useState("");
  const [motivosDisponibles, setMotivosDisponibles] = useState<Motivo[]>([]);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [comentario, setComentario] = useState("");
  const [email, setEmail] = useState("");
  const [contactar, setContactar] = useState(false);
  const [trampa, setTrampa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/valoracion/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        if (!d.ok) {
          setError(d.error || "No se pudo cargar el formulario");
          setEstado("error");
          return;
        }
        setNombre(d.nombre ?? null);
        setAnonimo(d.anonimo === true);
        setGoogleClientId(typeof d.googleClientId === "string" ? d.googleClientId : null);
        setMotivosDisponibles(d.motivos ?? []);
        setEstado(d.estado as Estado);
      })
      .catch(() => {
        if (!vivo) return;
        setError("No se pudo cargar el formulario. Revisa tu conexión e inténtalo de nuevo.");
        setEstado("error");
      });
    return () => {
      vivo = false;
    };
  }, [token]);

  function recibirCredencial(jwt: string) {
    try {
      const p = leerPayload(jwt);
      setCredencial(jwt);
      setGoogleEmail(String(p.email || ""));
      const n = String(p.name || "");
      setGoogleNombre(n);
      if (n) setNombreEscrito((prev) => prev || n);
      setGisError(null);
      setError(null);
    } catch {
      setGisError("No se pudo leer tu cuenta de Google. Inténtalo de nuevo.");
    }
  }

  function otraCuenta() {
    gis()?.disableAutoSelect();
    setCredencial(null);
    setGoogleEmail("");
    setGoogleNombre("");
  }

  useEffect(() => {
    if (!googleClientId || estado !== "valido") return;
    let cancelado = false;
    const iniciar = () => {
      const id = gis();
      if (!id || cancelado) return;
      id.initialize({
        client_id: googleClientId,
        nonce: token,
        ux_mode: "popup",
        auto_select: false,
        callback: (r: { credential?: string }) => {
          if (r.credential) recibirCredencial(r.credential);
        },
      });
      setGisListo(true);
    };
    if (gis()) {
      iniciar();
    } else {
      let s = document.querySelector<HTMLScriptElement>("script[data-gis]");
      if (!s) {
        s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.defer = true;
        s.dataset.gis = "1";
        s.onerror = () => setGisError("No se pudo cargar el inicio de sesión de Google. Desactiva el bloqueador de contenido e inténtalo de nuevo.");
        document.head.appendChild(s);
      }
      s.addEventListener("load", iniciar);
    }
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleClientId, estado, token]);

  useEffect(() => {
    if (!gisListo || credencial) return;
    const el = botonGoogle.current;
    const id = gis();
    if (el && id) {
      el.innerHTML = "";
      id.renderButton(el, { theme: "outline", size: "large", text: "continue_with", shape: "rectangular", logo_alignment: "left", width: 300, locale: "es" });
      id.prompt();
    }
  }, [gisListo, credencial]);

  function alternarMotivo(id: string) {
    setMotivos((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setError(null);
    if (googleClientId) {
      if (!credencial) return setError("Inicia sesión con tu cuenta de Google para enviar la valoración");
    } else if (!email.trim()) return setError("Escribe tu correo electrónico");
    if (!motivos.length && !comentario.trim()) return setError("Marca al menos un motivo o escribe un comentario");
    setEnviando(true);
    try {
      const res = await fetch(`/api/valoracion/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), credential: credencial || undefined, motivos, comentario: comentario.trim(), contactar, website: trampa, nombre: nombreEscrito.trim(), telefono: telefono.trim(), resguardo: resguardo.trim() }),
      });
      const d = await res.json();
      if (!d.ok) {
        const msg: string = d.error || "No se pudo enviar";
        if (msg === "Este enlace ya se ha usado") return setEstado("usado");
        if (msg === "Este enlace ha caducado") return setEstado("expirado");
        if (msg === "Este enlace no es válido") return setEstado("invalido");
        if (msg.startsWith("No se pudo verificar tu cuenta de Google")) setCredencial(null);
        return setError(msg);
      }
      setEstado("enviado");
    } catch {
      setError("No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const mensajeFinal: Partial<Record<Estado, { titulo: string; texto: string }>> = {
    usado: { titulo: "Ya recibimos tu valoración", texto: "Este enlace ya se ha utilizado. Gracias por tu tiempo." },
    expirado: { titulo: "Este enlace ha caducado", texto: "Si todavía quieres contarnos tu experiencia, escríbenos por WhatsApp y te ayudamos." },
    invalido: { titulo: "Enlace no válido", texto: "No hemos encontrado este formulario. Comprueba que has abierto el enlace completo." },
    enviado: { titulo: "Gracias por contárnoslo", texto: "Hemos recibido tu valoración y la revisaremos. Sentimos que la experiencia no haya sido la esperada." },
  };
  const final = mensajeFinal[estado];

  return (
    <main className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex justify-center">
        <div className="rounded-md bg-white px-3 py-2 shadow-sm">
          <Image src="/logos/kelatos.png" alt="Kelatos" width={290} height={82} priority unoptimized className="h-9 w-auto" />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        {estado === "cargando" && <p className="py-10 text-center text-sm text-slate-500">Cargando…</p>}

        {estado === "error" && (
          <div className="py-8 text-center">
            <p className="text-base font-semibold">No se pudo abrir el formulario</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </div>
        )}

        {final && (
          <div className="py-8 text-center">
            <p className="text-lg font-semibold">{final.titulo}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{final.texto}</p>
          </div>
        )}

        {estado === "valido" && (
          <form onSubmit={enviar} className="space-y-5" noValidate>
            <div>
              <h1 className="text-xl font-semibold">{nombre ? `${nombre}, cuéntanos qué salió mal` : "Cuéntanos qué salió mal"}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Lamentamos que tu experiencia no fuera buena. Tu opinión nos ayuda a mejorar y la lee una persona de nuestro equipo.
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">¿Qué no te gustó?</legend>
              {motivosDisponibles.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <input type="checkbox" className="size-4 accent-amber-500" checked={motivos.includes(m.id)} onChange={() => alternarMotivo(m.id)} />
                  {m.etiqueta}
                </label>
              ))}
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor="comentario" className="text-sm font-medium">Cuéntanos más (opcional)</label>
              <textarea
                id="comentario"
                value={comentario}
                onChange={(e) => setComentario(e.target.value.slice(0, MAX_COMENTARIO))}
                rows={5}
                className="w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-950"
                placeholder="¿Qué ocurrió? ¿Qué podríamos haber hecho mejor?"
              />
              <p className="text-right text-xs text-slate-400">{comentario.length}/{MAX_COMENTARIO}</p>
            </div>

            {anonimo && (
              <div className="space-y-3 rounded-lg border border-dashed p-3 dark:border-slate-700">
                <p className="text-sm font-medium">¿Quién eres? <span className="font-normal text-slate-500">(opcional, nos ayuda a localizar tu caso)</span></p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="nombre" className="text-xs text-slate-500">Nombre</label>
                    <input id="nombre" value={nombreEscrito} onChange={(e) => setNombreEscrito(e.target.value)} maxLength={120} autoComplete="name" className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-950" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="telefono" className="text-xs text-slate-500">Teléfono con el que nos escribiste</label>
                    <input id="telefono" type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={30} autoComplete="tel" className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-950" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="resguardo" className="text-xs text-slate-500">Nº de resguardo (si lo tienes)</label>
                    <input id="resguardo" value={resguardo} onChange={(e) => setResguardo(e.target.value)} maxLength={40} className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-950" />
                  </div>
                </div>
              </div>
            )}

            {googleClientId ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Tu correo electrónico</p>
                {credencial ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950/30">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{googleEmail}</p>
                      <p className="text-xs text-green-700 dark:text-green-400">Verificado con tu cuenta de Google{googleNombre ? ` · ${googleNombre}` : ""}</p>
                    </div>
                    <button type="button" onClick={otraCuenta} className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400">Usar otra cuenta</button>
                  </div>
                ) : (
                  <div>
                    <div ref={botonGoogle} className="min-h-11" />
                    {gisError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{gisError}</p>}
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Usamos el correo de tu cuenta de Google para comprobar que eres tú y evitar envíos repetidos (solo se puede enviar una valoración por cuenta). No compartimos tu correo con nadie ni accedemos a nada más de tu cuenta.
                </p>
              </div>
            ) : (
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Tu correo electrónico</label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-950"
                placeholder="nombre@correo.com"
                maxLength={254}
              />
              <p className="text-xs text-slate-500">
                Solo se puede enviar una valoración por correo y por enlace. Lo usamos para evitar envíos repetidos y, si lo pides, para responderte.
              </p>
            </div>
            )}

            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-amber-500" checked={contactar} onChange={(e) => setContactar(e.target.checked)} />
              Quiero que se pongan en contacto conmigo para solucionarlo
            </label>

            {/* Trampa para bots: una persona nunca ve ni rellena este campo. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                No rellenar
                <input type="text" tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} />
              </label>
            </div>

            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {enviando ? "Enviando…" : "Enviar mi valoración"}
            </button>
          </form>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">Kelatos Informática · Este enlace es personal y de un solo uso</p>
    </main>
  );
}
