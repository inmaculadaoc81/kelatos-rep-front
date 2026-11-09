"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Lock, Send2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSondeoVisible } from "@/hooks/use-sondeo-visible";
import { cn } from "@/lib/utils";
import { ConversacionWa, ESTADOS_WA, MensajeWa, horaCompletaWa } from "@/lib/whatsapp";

type Estado = { cargando: boolean; sinAcceso: boolean; error: string | null; conversaciones: ConversacionWa[] };
const INICIAL: Estado = { cargando: true, sinAcceso: false, error: null, conversaciones: [] };

/** Conversaciones de WhatsApp del cliente de una reparación (se buscan por el teléfono). */
export function useWhatsappCliente(telefono: string | null | undefined) {
  const tel = String(telefono || "").trim();
  const [estado, setEstado] = useState<Estado>(INICIAL);

  useEffect(() => {
    if (!tel) { setEstado({ ...INICIAL, cargando: false }); return; }
    let activo = true;
    setEstado(INICIAL);
    fetch(`/api/whatsapp/por-telefono?telefono=${encodeURIComponent(tel)}`, { cache: "no-store" })
      .then(async (r): Promise<Estado> => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 403) return { cargando: false, sinAcceso: true, error: null, conversaciones: [] };
        if (!d.ok) return { cargando: false, sinAcceso: false, error: d.error || "No se pudo cargar WhatsApp", conversaciones: [] };
        return { cargando: false, sinAcceso: false, error: null, conversaciones: d.conversaciones as ConversacionWa[] };
      })
      .catch((): Estado => ({ cargando: false, sinAcceso: false, error: "No se pudo cargar WhatsApp", conversaciones: [] }))
      .then((e) => { if (activo) setEstado(e); });
    return () => { activo = false; };
  }, [tel]);

  const sinLeer = estado.conversaciones.reduce((s, c) => s + (c.noLeidos || 0), 0);
  return { ...estado, sinLeer, telefono: tel };
}

export function PanelWhatsapp({ datos }: { datos: ReturnType<typeof useWhatsappCliente> }) {
  const [elegida, setElegida] = useState<number | null>(null);
  const [mensajes, setMensajes] = useState<MensajeWa[]>([]);
  const [cargandoHilo, setCargandoHilo] = useState(false);
  const [errorHilo, setErrorHilo] = useState<string | null>(null);
  const [puedeResponder, setPuedeResponder] = useState(true);
  const [texto, setTexto] = useState("");
  const [modoNota, setModoNota] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const idActual = useRef<number | null>(null);

  const conversaciones = datos.conversaciones;
  const idEfectivo = elegida ?? conversaciones[0]?.id ?? null;
  const conv = conversaciones.find((c) => c.id === idEfectivo) ?? null;

  const cargarHilo = useCallback(async (id: number, inicial: boolean) => {
    if (inicial) { setCargandoHilo(true); setErrorHilo(null); setMensajes([]); }
    try {
      const r = await fetch(`/api/whatsapp/conversaciones/${id}/mensajes${inicial ? "?leer=1" : ""}`, { cache: "no-store" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      if (idActual.current !== id) return;
      setMensajes(d.mensajes as MensajeWa[]);
      if (d.conversacion) setPuedeResponder((d.conversacion as ConversacionWa).puedeResponder);
      setErrorHilo(null);
    } catch (e) {
      if (idActual.current === id) setErrorHilo(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (inicial) setCargandoHilo(false);
    }
  }, []);

  useEffect(() => {
    idActual.current = idEfectivo;
    if (idEfectivo) cargarHilo(idEfectivo, true);
  }, [idEfectivo, cargarHilo]);

  useSondeoVisible(() => { if (idActual.current) cargarHilo(idActual.current, false); }, 15_000, idEfectivo !== null);
  useEffect(() => { fin.current?.scrollIntoView({ block: "end" }); }, [mensajes.length, idEfectivo]);

  async function enviar() {
    if (!idEfectivo || !texto.trim() || enviando) return;
    setEnviando(true);
    try {
      const r = await fetch(`/api/whatsapp/conversaciones/${idEfectivo}/mensajes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto, privado: modoNota }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "No se pudo enviar");
      setTexto("");
      setMensajes((prev) => [...prev, d.mensaje as MensajeWa]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar el mensaje");
    } finally {
      setEnviando(false);
    }
  }

  if (datos.cargando) return <Skeleton className="h-24 w-full" />;
  if (datos.sinAcceso) return <p className="text-sm text-muted-foreground">Tu usuario no tiene acceso a los mensajes de WhatsApp.</p>;
  if (datos.error) return <p className="text-sm text-destructive">{datos.error}</p>;
  if (!datos.telefono) return <p className="text-sm text-muted-foreground">Esta reparación no tiene teléfono del cliente.</p>;
  if (!conv) {
    return (
      <p className="text-sm text-muted-foreground">
        Este cliente ({datos.telefono}) no tiene ninguna conversación de WhatsApp. Aparecerá aquí cuando escriba al WhatsApp de Kelatos (WhatsApp no permite iniciar la conversación sin una plantilla aprobada).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {conversaciones.map((c) => (
            <button key={c.id} type="button" onClick={() => setElegida(c.id)}
              className={cn("rounded-full border px-2.5 py-0.5 text-xs", c.id === idEfectivo ? "border-emerald-600 bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-300" : "hover:bg-accent")}>
              {c.bandeja || "WhatsApp"} · {ESTADOS_WA[c.estado] ?? c.estado}{c.noLeidos > 0 ? ` · ${c.noLeidos} sin leer` : ""}
            </button>
          ))}
        </div>
        <Link href="/whatsapp/bandeja" className="text-xs text-muted-foreground underline-offset-2 hover:underline">Abrir en WhatsApp</Link>
      </div>

      <div className="max-h-80 min-h-32 space-y-1.5 overflow-y-auto rounded-lg border bg-muted/20 px-3 py-2">
        {cargandoHilo && <Skeleton className="h-10 w-1/2" />}
        {errorHilo && <p className="text-sm text-destructive">{errorHilo}</p>}
        {mensajes.map((m) => m.tipo === "actividad" ? (
          <p key={m.id} className="py-0.5 text-center text-[11px] text-muted-foreground">{m.texto} · {horaCompletaWa(m.ts)}</p>
        ) : (
          <div key={m.id} className={cn("flex", m.tipo === "entrante" ? "justify-start" : "justify-end")}>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-3 py-1.5 text-sm shadow-sm",
              m.privado ? "rounded-br-sm border border-amber-400/60 bg-amber-100 text-amber-950 dark:bg-amber-900/30 dark:text-amber-50"
                : m.tipo === "entrante" ? "rounded-bl-sm bg-card" : "rounded-br-sm bg-emerald-100 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-50")}>
              {m.privado && <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"><Lock className="size-3" /> Nota privada</p>}
              {m.adjuntos.map((a, i) => a.tipo === "image" && a.url
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img key={i} src={a.miniatura || a.url} alt="Imagen" className="mb-1 max-h-48 rounded-lg" />
                : <a key={i} href={a.url || "#"} target="_blank" rel="noopener noreferrer" className="mb-1 block text-xs underline">📎 {a.tipo === "audio" ? "Audio" : a.tipo === "video" ? "Vídeo" : "Archivo adjunto"}</a>)}
              {m.texto && <p className="break-words whitespace-pre-wrap">{m.texto}</p>}
              <p className="mt-0.5 text-right text-[10px] text-muted-foreground">{m.tipo !== "entrante" && m.autor ? `${m.autor} · ` : ""}{horaCompletaWa(m.ts)}</p>
            </div>
          </div>
        ))}
        <div ref={fin} />
      </div>

      <div>
        <div className="mb-1.5 inline-flex rounded-md border p-0.5 text-xs">
          <button type="button" onClick={() => setModoNota(false)} className={cn("rounded px-3 py-1", !modoNota ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Responder</button>
          <button type="button" onClick={() => setModoNota(true)} className={cn("inline-flex items-center gap-1 rounded px-3 py-1", modoNota ? "bg-amber-500 text-white" : "text-muted-foreground")}><Lock className="size-3" /> Nota privada</button>
        </div>
        {!modoNota && !puedeResponder && (
          <p className="mb-1.5 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300">
            Han pasado más de 24 horas desde el último mensaje del cliente: WhatsApp solo permite escribirle con una plantilla aprobada (se envía desde Chatwoot). Aquí puedes dejar notas privadas.
          </p>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            className={cn(modoNota && "border-amber-400 bg-amber-50 dark:bg-amber-950/20")}
            placeholder={modoNota ? "Nota privada para el equipo… (el cliente no la verá)" : "Escribe un mensaje de WhatsApp… (Enter envía, Mayús+Enter salto de línea)"}
            value={texto}
            disabled={enviando || (!modoNota && !puedeResponder)}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          />
          <Button className={cn("gap-1.5", modoNota && "bg-amber-500 hover:bg-amber-600")} disabled={!texto.trim() || enviando || (!modoNota && !puedeResponder)} onClick={enviar}>
            <Send2 className="size-4" /> {enviando ? "Enviando…" : modoNota ? "Guardar nota" : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
