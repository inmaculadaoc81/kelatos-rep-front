"use client";

import { use, useEffect, useState } from "react";

interface Opcion { id: string; etiqueta: string }
type Estado = "cargando" | "valido" | "respondida" | "expirado" | "invalido" | "error" | "gracias";

const ESTILO: Record<string, string> = {
  muy_bueno: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
  bueno: "border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200",
  malo: "border-amber-500 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200",
  muy_malo: "border-rose-500 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-200",
};

/**
 * Encuesta pública de satisfacción (correo de reseña): una sola pregunta. Positiva → ficha de Google para dejar la reseña;
 * negativa → formulario de valoración. Abrir la página no registra nada: solo pulsar una respuesta.
 */
export default function EncuestaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [nombre, setNombre] = useState<string | null>(null);
  const [pregunta, setPregunta] = useState("");
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siguiente, setSiguiente] = useState<{ destino: string; url: string | null } | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/encuesta/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        if (!d.ok) { setEstado("error"); setError(d.error || null); return; }
        setNombre(d.nombre || null);
        setPregunta(d.pregunta || "");
        setOpciones(d.opciones || []);
        setEstado((d.estado as Estado) || "error");
      })
      .catch(() => { if (vivo) setEstado("error"); });
    return () => { vivo = false; };
  }, [token]);

  async function responder(respuesta: string) {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/encuesta/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ respuesta }) });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "No se pudo enviar");
      // Respuesta mala → directo al formulario de valoración, sin pantalla intermedia.
      if (d.destino === "formulario" && d.url) {
        window.location.assign(d.url);
        return;
      }
      setSiguiente({ destino: d.destino, url: d.url });
      setEstado("gracias");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const tarjeta = "mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

  return (
    <main className={tarjeta}>
      <header className="bg-[#1768ea] px-6 py-5 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="mx-auto inline-block rounded-md bg-white px-3 py-1.5"><img src="/logos/kelatos.png" alt="Kelatos" height={40} className="h-9 w-auto" /></span>
      </header>
      <div className="p-6">

      {estado === "cargando" && <p className="text-sm text-slate-500">Cargando…</p>}

      {estado === "valido" && (
        <>
          <h1 className="text-xl font-bold">{nombre ? `${nombre}, una sola pregunta` : "Una sola pregunta"}</h1>
          <p className="mt-3 text-base">{pregunta}</p>
          <div className="mt-5 grid gap-2.5">
            {opciones.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={enviando}
                onClick={() => responder(o.id)}
                className={`rounded-xl border px-4 py-3 text-left text-base font-medium transition disabled:opacity-60 ${ESTILO[o.id] || "border-slate-300"}`}
              >
                {o.etiqueta}
              </button>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </>
      )}

      {estado === "gracias" && siguiente && (
        <>
          {siguiente.destino === "resena" && (
            <>
              <h1 className="text-xl font-bold">¡Muchas gracias!</h1>
              <p className="mt-3 text-base">Nos alegra que haya ido bien. Si tienes un minuto, nos ayudarías mucho dejando tu opinión en nuestra ficha de Google.</p>
              <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-200">
                Por dejar una reseña en la ficha de Google tienes un <strong>5 % de descuento</strong> en tu próxima reparación: para canjearlo, presenta ese correo o una captura en el local y usa el mismo correo electrónico con el que te hemos escrito. Válido para un solo uso, no acumulable ni transferible.
              </p>
              {siguiente.url && (
                <a href={siguiente.url} className="mt-5 inline-block rounded-xl bg-[#1768ea] px-5 py-3 font-semibold text-white hover:bg-[#1254c0]">
                  Dejar mi reseña en Google
                </a>
              )}
            </>
          )}
          {siguiente.destino === "formulario" && (
            <>
              <h1 className="text-xl font-bold">Gracias por decírnoslo</h1>
              <p className="mt-3 text-base">Sentimos que la experiencia no haya sido la esperada. Cuéntanos qué pasó para que podamos mejorarlo y ponernos en contacto contigo.</p>
              {siguiente.url && (
                <a href={siguiente.url} className="mt-5 inline-block rounded-xl bg-[#1768ea] px-5 py-3 font-semibold text-white hover:bg-[#1254c0]">
                  Contarnos qué pasó
                </a>
              )}
            </>
          )}
          {siguiente.destino === "gracias" && (
            <>
              <h1 className="text-xl font-bold">¡Muchas gracias!</h1>
              <p className="mt-3 text-base">Hemos registrado tu respuesta. Nos ayuda a seguir mejorando.</p>
            </>
          )}
          {siguiente.url && <p className="mt-3 text-xs text-slate-500">También te hemos enviado este enlace por correo.</p>}
        </>
      )}

      {estado === "respondida" && (
        <>
          <h1 className="text-xl font-bold">Ya has respondido</h1>
          <p className="mt-3 text-base">Gracias: ya tenemos tu opinión sobre este servicio.</p>
        </>
      )}
      {estado === "expirado" && (
        <>
          <h1 className="text-xl font-bold">Este enlace ha caducado</h1>
          <p className="mt-3 text-base">Si quieres contarnos tu experiencia, responde al correo que te enviamos o llámanos al +34 914 468 503.</p>
        </>
      )}
      {estado === "invalido" && (
        <>
          <h1 className="text-xl font-bold">Enlace no válido</h1>
          <p className="mt-3 text-base">Revisa que has copiado el enlace completo del correo.</p>
        </>
      )}
      {estado === "error" && <p className="text-base text-rose-600">{error || "No se pudo cargar la encuesta. Inténtalo de nuevo en unos minutos."}</p>}

      <hr className="my-6 border-slate-200 dark:border-slate-800" />
      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
        <p><strong>📍 Dirección:</strong> C. de Joaquín María López, 26, Chamberí, 28015 Madrid</p>
        <p><strong>🕒 Horario:</strong> Lunes a Viernes de 9:30 a 18:00</p>
        <p><strong>📞 Fijo:</strong> +34 918 294 660 · <strong>WhatsApp (solo mensajes):</strong> +34 649 97 01 28</p>
      </div>
      </div>
      <footer className="border-t bg-slate-50 px-6 py-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950">
        Kelatos · <a href="https://kelatos.com" className="underline">https://kelatos.com</a>
      </footer>
    </main>
  );
}
