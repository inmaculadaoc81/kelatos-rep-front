"use client";

import { Fragment, useEffect, useState } from "react";
import { DocumentText, Refresh2, TickCircle, CloseCircle, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AnalisisLlamada, DetalleLlamada, ETIQUETA_DECISION, ETIQUETA_ESTADO, ETIQUETA_MOTIVO, duracionTexto } from "@/lib/llamadas";

export const COLOR_ESTADO: Record<string, string> = {
  completada: "bg-green-500/10 text-green-700 dark:text-green-400",
  contestada: "bg-green-500/10 text-green-700 dark:text-green-400",
  iniciada: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  no_contesta: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ocupado: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  fallida: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export function fechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
}

/** Resalta en el texto lo que se ha buscado (sin romper caracteres especiales). */
function Resaltado({ texto, busca }: { texto: string; busca: string }) {
  const b = busca.trim();
  if (!b) return <>{texto}</>;
  const partes = texto.split(new RegExp(`(${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {partes.map((p, i) =>
        p.toLowerCase() === b.toLowerCase() ? <mark key={i} className="rounded bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-500/40">{p}</mark> : <Fragment key={i}>{p}</Fragment>
      )}
    </>
  );
}

function MensajeTranscripcion({ fase, estado, trabajando, grabada }: { fase?: string; estado: string; trabajando: boolean; grabada: boolean }) {
  if (fase === "error") return <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">La transcripción falló. El audio está guardado; se puede volver a intentar.</p>;
  if (fase === "sin_voz") return <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">No se detectó voz en la grabación, así que no hay nada que transcribir.</p>;
  if (!trabajando) return <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">Esta llamada no tiene transcripción.</p>;
  const enCurso = ["iniciada", "contestada"].includes(estado) && !grabada;
  const pasos = ["Llamada", "Audio subido", "Transcribiendo", "Listo"];
  const actual = fase === "procesando" ? 2 : grabada ? 2 : enCurso ? 0 : 1;
  return (
    <div className="space-y-2 rounded-xl border p-3 text-sm">
      <div className="flex items-center gap-2 font-medium"><span className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />{enCurso ? "La llamada sigue en curso…" : actual === 1 ? "Esperando que termine de subirse el audio…" : "Transcribiendo y resumiendo la llamada…"}</div>
      <ol className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {pasos.map((p, i) => <li key={p} className={cn(i < actual && "text-primary", i === actual && "font-semibold text-foreground")}>{i < actual ? "✓" : i === actual ? "●" : "○"} {p}</li>)}
      </ol>
      <p className="text-xs text-muted-foreground">Suele tardar de uno a dos minutos tras colgar. Esta ventana se actualiza sola.</p>
    </div>
  );
}

function Chip({ ok, texto }: { ok: boolean | null; texto: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", ok === true ? "bg-green-500/10 text-green-700 dark:text-green-400" : ok === false ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-muted text-muted-foreground")}>
      {ok === true ? <TickCircle className="size-3.5" /> : ok === false ? <CloseCircle className="size-3.5" /> : <span className="px-0.5">?</span>}
      {texto}
    </span>
  );
}

/** Análisis automático de la llamada: motivo, decisión del presupuesto, queja, acuerdos (con botón para crear tarea), datos citados y checklist. */
function AnalisisLlamadaPanel({ det, onCambio }: { det: DetalleLlamada; onCambio: () => void }) {
  const a = det.datos?.analisis as AnalisisLlamada | null | undefined;
  const [creadas, setCreadas] = useState<Record<number, boolean>>({});
  const [ocupada, setOcupada] = useState<number | "queja" | null>(null);
  if (!a) return null;

  const espera = typeof det.datos?.espera_seg === "number" ? (det.datos.espera_seg as number) : null;
  const quejaRevisada = det.datos?.queja_revisada === true;
  const separada = det.datos?.separada_por_voz === true;
  const dc = a.datos_cliente || { telefono: null, email: null, direccion: null, nombre: null };
  const datosCitados = (Object.entries(dc) as [string, string | null][]).filter(([, v]) => !!v);
  const hayAlgo = a.queja?.hay || a.decision_presupuesto !== "no_aplica" || a.acuerdos?.length || datosCitados.length || a.motivo;

  async function crearTarea(i: number) {
    const x = a!.acuerdos[i];
    setOcupada(i);
    try {
      const r = await fetch(`/api/llamadas/${encodeURIComponent(det.id)}/tarea`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: x.texto, plazo: x.plazo }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "No se pudo crear");
      setCreadas((c) => ({ ...c, [i]: true }));
      toast.success("Tarea creada en el módulo Tareas");
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo crear la tarea"); }
    finally { setOcupada(null); }
  }

  async function marcarRevisada() {
    setOcupada("queja");
    try {
      const r = await fetch(`/api/llamadas/${encodeURIComponent(det.id)}/revisada`, { method: "POST" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "No se pudo marcar");
      onCambio();
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo marcar"); }
    finally { setOcupada(null); }
  }

  if (!hayAlgo) return null;
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-primary">Análisis de la llamada</h4>

      {a.queja?.hay && (
        <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm", quejaRevisada ? "border-muted bg-muted/30 text-muted-foreground" : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400")}>
          <Warning2 className="size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{quejaRevisada ? "Queja revisada" : "El cliente parece molesto: conviene llamarle"}</div>
            {a.queja.motivo && <div className="text-xs opacity-90">{a.queja.motivo}</div>}
          </div>
          {!quejaRevisada && <Button size="sm" variant="outline" className="h-7 bg-background text-xs" disabled={ocupada === "queja"} onClick={marcarRevisada}>Marcar como revisada</Button>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {a.motivo && <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">Motivo: {ETIQUETA_MOTIVO[a.motivo] || a.motivo}</span>}
        {a.decision_presupuesto && a.decision_presupuesto !== "no_aplica" && (
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 font-medium", a.decision_presupuesto === "acepta" ? "bg-green-500/10 text-green-700 dark:text-green-400" : a.decision_presupuesto === "rechaza" ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>{ETIQUETA_DECISION[a.decision_presupuesto]}</span>
        )}
        {espera != null && <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground">Tardó {espera} s en contestar</span>}
      </div>

      {a.acuerdos?.length > 0 && (
        <div className="rounded-xl border p-3">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acuerdos y tareas</div>
          <ul className="space-y-1.5">
            {a.acuerdos.map((x, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-0 flex-1">{x.texto}{x.plazo ? <span className="text-muted-foreground"> · {x.plazo}</span> : null}<span className="ml-1 text-xs text-muted-foreground">({x.quien})</span></span>
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={ocupada === i || creadas[i]} onClick={() => crearTarea(i)}>{creadas[i] ? "Tarea creada" : "Crear tarea"}</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {datosCitados.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">El cliente dio datos nuevos — revisa la ficha</div>
          <ul className="space-y-0.5">{datosCitados.map(([k, v]) => <li key={k}><span className="text-muted-foreground">{{ telefono: "Teléfono", email: "Correo", direccion: "Dirección", nombre: "Nombre" }[k] || k}:</span> {v}</li>)}</ul>
        </div>
      )}

      {separada && a.checklist && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atención</span>
          <Chip ok={a.checklist.se_presento} texto="Se presentó" />
          <Chip ok={a.checklist.aviso_grabacion} texto="Avisó de la grabación" />
          <Chip ok={a.checklist.dio_plazo} texto="Dio un plazo" />
        </div>
      )}
    </div>
  );
}

/** Contenido del detalle de una llamada (resumen, audio, transcripción). Solo superadmins: lo exigen las rutas /api/llamadas. */
export function DetalleLlamadaContenido({ id, busca = "" }: { id: string; busca?: string }) {
  const [det, setDet] = useState<DetalleLlamada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/llamadas/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!vivo) return; if (!d.ok) throw new Error(d.error || "No se pudo cargar"); setDet(d.llamada as DetalleLlamada); })
      .catch((e) => { if (vivo) setError(e instanceof Error ? e.message : "Error desconocido"); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [id, recarga]);

  // Mientras la llamada sigue en curso o se está transcribiendo, se vuelve a consultar sola.
  const faseTranscripcion = det?.datos?.transcripcion_estado as string | undefined;
  const hayTexto = !!(det?.transcripcion || (det?.transcripcion_json && det.transcripcion_json.length > 0));
  const trabajando = !!det && (faseTranscripcion === "procesando" || !hayTexto) && faseTranscripcion !== "error" && faseTranscripcion !== "sin_voz" && recarga < 45 && (faseTranscripcion === "procesando" || ["iniciada", "contestada"].includes(det.estado) || (!det.grabacion_url && det.estado === "completada"));
  useEffect(() => {
    if (!trabajando) return;
    const t = setInterval(() => setRecarga((n) => n + 1), 4000);
    return () => clearInterval(t);
  }, [trabajando]);

  const [reintentando, setReintentando] = useState(false);
  const retranscribir = async () => {
    setReintentando(true); setError(null);
    try {
      const r = await fetch(`/api/llamadas/${encodeURIComponent(id)}/retranscribir`, { method: "POST" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "No se pudo iniciar");
      setDet((x) => (x ? { ...x, datos: { ...x.datos, transcripcion_estado: "procesando" } } : x));
      setRecarga(0);
    } catch (e) { setError(e instanceof Error ? e.message : "Error desconocido"); }
    finally { setReintentando(false); }
  };
  const turnos = det?.transcripcion_json && det.transcripcion_json.length > 0 ? det.transcripcion_json : null;
  const esCliente = (h?: string) => /cliente|customer|user/i.test(h || "");

  return (
    <>
    {cargando && <div className="space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-24 w-full" /></div>}
    {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
    {det && (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", COLOR_ESTADO[det.estado] || "bg-muted text-muted-foreground")}>{ETIQUETA_ESTADO[det.estado] || det.estado}</span>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{det.origen === "ia" ? "Agente de IA" : "Persona"}</span>
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{det.direccion === "entrante" ? "Entrante" : "Saliente"} · {det.proveedor}</span>
          {det.sentimiento && <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Sentimiento {det.sentimiento}</span>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { t: det.origen === "ia" ? "Agente" : "Usuario", v: det.usuario || "—" },
            { t: "Cliente", v: `${det.cliente_nombre || "—"}${det.resguardo ? ` · ${det.resguardo}` : ""}` },
            { t: "Teléfono", v: det.telefono || "—" },
            { t: "Duración", v: duracionTexto(det.duracion_seg) },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border bg-muted/30 p-2.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{x.t}</div>
              <div className="mt-0.5 break-words text-sm font-semibold">{x.v}</div>
            </div>
          ))}
        </div>
        {det.grabacion_url && (
          <div>
            <h4 className="mb-1 text-sm font-semibold text-primary">Grabación</h4>
            <audio controls preload="none" src={/^https?:/i.test(det.grabacion_url) ? det.grabacion_url : `/api/llamadas/${det.id}/audio`} className="w-full" />
          </div>
        )}
        {det.resumen && (
          <div>
            <h4 className="mb-1 text-sm font-semibold text-primary">Resumen</h4>
            <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed">{det.resumen}</p>
          </div>
        )}
        <AnalisisLlamadaPanel det={det} onCambio={() => setRecarga((n) => n + 1)} />
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-primary"><DocumentText className="size-4" /> Transcripción</h4>
            {det.grabacion_url && faseTranscripcion !== "procesando" && (
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={reintentando} onClick={retranscribir} title="Vuelve a procesar el audio con la limpieza de ruido">
                <Refresh2 className={cn("mr-1 size-3.5", reintentando && "animate-spin")} /> Volver a transcribir
              </Button>
            )}
          </div>
          {faseTranscripcion === "procesando" ? (
            <MensajeTranscripcion fase={faseTranscripcion} estado={det.estado} trabajando grabada={!!det.grabacion_url} />
          ) : turnos ? (
            <div className="space-y-2 rounded-xl border p-3">
              {turnos.map((t, i) => (
                <div key={i} className={cn("flex", esCliente(t.hablante) ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", esCliente(t.hablante) ? "bg-primary/10" : "bg-muted")}>
                    <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">{t.hablante || "—"}{typeof t.inicio_seg === "number" ? ` · ${Math.floor(t.inicio_seg / 60)}:${String(Math.floor(t.inicio_seg % 60)).padStart(2, "0")}` : ""}</div>
                    <Resaltado texto={t.texto} busca={busca} />
                  </div>
                </div>
              ))}
            </div>
          ) : det.transcripcion ? (
            <p className="whitespace-pre-wrap rounded-xl border p-3 text-sm"><Resaltado texto={det.transcripcion} busca={busca} /></p>
          ) : (
            <MensajeTranscripcion fase={faseTranscripcion} estado={det.estado} trabajando={trabajando} grabada={!!det.grabacion_url} />
          )}
        </div>
      </div>
    )}
    </>
  );
}
