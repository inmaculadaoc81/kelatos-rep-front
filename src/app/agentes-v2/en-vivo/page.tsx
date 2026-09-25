"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CloseCircle, TickCircle } from "@/lib/icons";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Task, TaskContent, TaskItem, TaskTrigger } from "@/components/ai-elements/task";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Cabecera, ErrorCaja } from "@/components/agentes-v2/componentes";
import { fechaHora } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

interface Tarea {
  id: string;
  type: string;
  title: string;
  state: "running" | "done" | "error";
  started_at: string;
  finished_at: string | null;
  events: number;
  summary: string | null;
}

interface Evento {
  n: number;
  at: string;
  kind: "step" | "llm" | "error" | "note";
  key?: string;
  title?: string;
  state?: string;
  detail?: string;
  status?: string;
  purpose?: string;
  label?: string;
  prompt_chars?: number;
  system?: string;
  user?: string;
  duration_ms?: number;
  model?: string;
  output_chars?: number;
  output?: string;
  error?: string;
  text?: string;
}

const TIPO: Record<string, string> = { "seo.escribir": "Escribir artículo", "seo.descubrir": "Buscar temas", "seo.publicar": "Publicar", cmo: "AI CMO" };

/** Consulta periódica de un recurso; al cambiar la ruta se reinicia. */
function useSondeo<T>(ruta: string | null, cadaMs: number, activo = true) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!ruta) return;
    let vivo = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/agentes-v2/${ruta}`, { cache: "no-store" });
        const data = await res.json();
        if (!vivo) return;
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        setDatos(data as T);
        setError(null);
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : "Error desconocido");
      }
    };
    tick();
    if (!activo) return () => { vivo = false; };
    const t = setInterval(tick, cadaMs);
    return () => { vivo = false; clearInterval(t); };
  }, [ruta, cadaMs, activo]);
  return { datos, error };
}

function segundos(desde: string, hasta?: string | null, ahora = Date.now()): number {
  return Math.max(0, Math.round(((hasta ? new Date(hasta).getTime() : ahora) - new Date(desde).getTime()) / 1000));
}

const mmss = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

function Icono({ estado }: { estado: string }) {
  if (estado === "done") return <TickCircle className="size-4 text-green-600" />;
  if (estado === "error") return <CloseCircle className="size-4 text-red-600" />;
  return <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="En curso" />;
}

interface ElementoLinea {
  n: number;
  tipo: "paso" | "llm" | "error";
  paso?: Evento;
  inicio?: Evento;
  fin?: Evento;
  error?: Evento;
}

/** Ordena los eventos en una línea de tiempo: cada paso una vez (con su último estado) y cada llamada a la IA con su inicio y su fin. */
function construirLinea(eventos: Evento[]): ElementoLinea[] {
  const pasos = new Map<string, ElementoLinea>();
  const llamadas: ElementoLinea[] = [];
  const linea: ElementoLinea[] = [];
  let abierta: ElementoLinea | null = null;
  for (const e of eventos) {
    if (e.kind === "step" && e.key) {
      const previo = pasos.get(e.key);
      if (previo) previo.paso = e;
      else {
        const it: ElementoLinea = { n: e.n, tipo: "paso", paso: e };
        pasos.set(e.key, it);
        linea.push(it);
      }
    } else if (e.kind === "llm" && e.state === "start") {
      abierta = { n: e.n, tipo: "llm", inicio: e };
      llamadas.push(abierta);
      linea.push(abierta);
    } else if (e.kind === "llm" && e.state === "end") {
      const objetivo = [...llamadas].reverse().find((l) => !l.fin && l.inicio?.purpose === e.purpose && l.inicio?.label === e.label) ?? abierta;
      if (objetivo) objetivo.fin = e;
    } else if (e.kind === "error") {
      linea.push({ n: e.n, tipo: "error", error: e });
    }
  }
  return linea;
}

function Salida({ texto }: { texto: string }) {
  const limpio = texto.trim();
  if (limpio.startsWith("{") || limpio.startsWith("[")) {
    let bonito = limpio;
    try {
      bonito = JSON.stringify(JSON.parse(limpio), null, 2);
    } catch {
      /* se muestra tal cual */
    }
    return (
      <CodeBlock code={bonito} language="json">
        <CodeBlockCopyButton />
      </CodeBlock>
    );
  }
  return <MessageResponse>{limpio}</MessageResponse>;
}

function LlamadaIa({ it, ahora }: { it: ElementoLinea; ahora: number }) {
  const ini = it.inicio as Evento;
  const fin = it.fin;
  const trabajando = !fin;
  const seg = fin?.duration_ms !== undefined ? Math.round(fin.duration_ms / 1000) : segundos(ini.at, null, ahora);
  return (
    <div className="space-y-3">
      <Message from="user">
        <MessageContent>
          <p className="text-sm font-medium">{ini.label || "Petición a la IA"}</p>
          <details className="mt-1 text-xs text-muted-foreground">
            <summary className="cursor-pointer">Lo que se le pide ({ini.prompt_chars ?? 0} caracteres)</summary>
            <p className="mt-2 font-medium">Instrucciones</p>
            <p className="whitespace-pre-wrap">{ini.system}{(ini.system?.length ?? 0) >= 900 ? "…" : ""}</p>
            <p className="mt-2 font-medium">Petición</p>
            <p className="whitespace-pre-wrap">{ini.user}{(ini.user?.length ?? 0) >= 1500 ? "…" : ""}</p>
          </details>
        </MessageContent>
      </Message>

      {trabajando ? (
        <Reasoning isStreaming defaultOpen>
          <ReasoningTrigger getThinkingMessage={() => <Shimmer duration={1}>{`La IA está generando la respuesta… ${mmss(seg)}`}</Shimmer>} />
          <ReasoningContent>
            La IA de Kelatos trabaja en esta petición. No muestra su razonamiento interno ni envía la respuesta por partes: verás el resultado completo en cuanto llegue.
          </ReasoningContent>
        </Reasoning>
      ) : fin?.status === "ok" ? (
        <Message from="assistant">
          <MessageContent>
            <p className="mb-2 text-xs text-muted-foreground">
              Respondió en {mmss(seg)} · {fin.output_chars ?? 0} caracteres{fin.model ? ` · ${fin.model}` : ""}
            </p>
            <Salida texto={fin.output ?? ""} />
            {(fin.output_chars ?? 0) > (fin.output?.length ?? 0) && <p className="mt-2 text-xs text-muted-foreground">Se muestra el principio de la respuesta.</p>}
          </MessageContent>
        </Message>
      ) : (
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700">
          {fin?.status === "timeout" ? "La IA no respondió a tiempo" : "La IA devolvió un error"} tras {mmss(seg)}{fin?.error ? `: ${fin.error}` : ""}
        </p>
      )}
    </div>
  );
}

function LineaDeTiempo({ eventos, enCurso, ahora }: { eventos: Evento[]; enCurso: boolean; ahora: number }) {
  const linea = useMemo(() => construirLinea(eventos), [eventos]);
  return (
    <Conversation className="h-[68vh] rounded-lg border">
      <ConversationContent>
        {linea.length === 0 ? (
          <ConversationEmptyState title="Sin actividad todavía" description="Los pasos y las respuestas de la IA aparecerán aquí según ocurren." />
        ) : (
          linea.map((it) => {
            if (it.tipo === "paso" && it.paso) {
              const p = it.paso;
              return (
                <Task key={`p${it.n}`} defaultOpen={p.state !== "done"}>
                  <TaskTrigger title={p.title ?? ""}>
                    <div className="flex w-full cursor-pointer items-center gap-2 text-sm">
                      <Icono estado={p.state ?? "running"} />
                      <span className={cn("font-medium", p.state === "error" && "text-red-700")}>{p.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{new Date(p.at).toLocaleTimeString("es-ES")}</span>
                    </div>
                  </TaskTrigger>
                  {p.detail ? (
                    <TaskContent>
                      <TaskItem className={cn(p.state === "error" && "text-red-700")}>{p.detail}</TaskItem>
                    </TaskContent>
                  ) : null}
                </Task>
              );
            }
            if (it.tipo === "llm" && it.inicio) return <LlamadaIa key={`l${it.n}`} it={it} ahora={ahora} />;
            if (it.tipo === "error" && it.error) return <p key={`e${it.n}`} className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700">{it.error.text}</p>;
            return null;
          })
        )}
        {enCurso && linea.length > 0 && <Shimmer className="text-xs">Trabajando…</Shimmer>}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

/** Qué está haciendo la IA ahora mismo: pasos, lo que se le pide y lo que responde. */
export default function EnVivoPage() {
  const lista = useSondeo<{ ok: boolean; tasks: Tarea[] }>("live/tasks", 2000);
  const [elegida, setElegida] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const auto = useRef(true);

  const tareas = lista.datos?.tasks ?? [];
  const actual = elegida ?? tareas[0]?.id ?? null;
  const tarea = tareas.find((t) => t.id === actual) ?? null;
  const enCurso = tarea?.state === "running";

  // La tarea más reciente se sigue sola, salvo que el usuario elija otra
  useEffect(() => {
    if (auto.current && tareas[0]) setElegida(tareas[0].id);
  }, [tareas]);

  // Eventos acumulados de la tarea elegida (petición incremental con ?after=)
  const [eventos, setEventos] = useState<Evento[]>([]);
  const cursor = useRef(0);
  useEffect(() => {
    setEventos([]);
    cursor.current = 0;
  }, [actual]);
  useEffect(() => {
    if (!actual) return;
    let vivo = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/agentes-v2/live/tasks/${actual}?after=${cursor.current}`, { cache: "no-store" });
        const data = await res.json();
        if (!vivo || !data.ok || !data.events.length) return;
        cursor.current = data.events[data.events.length - 1].n;
        setEventos((prev) => [...prev, ...data.events]);
      } catch {
        /* se reintenta en el siguiente ciclo */
      }
    };
    tick();
    const t = setInterval(tick, enCurso ? 1000 : 4000);
    return () => { vivo = false; clearInterval(t); };
  }, [actual, enCurso]);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <Cabecera titulo="En vivo" descripcion="Lo que está haciendo la IA ahora mismo: cada paso, lo que se le pide y lo que responde. Se actualiza solo." />
      {lista.error && <ErrorCaja mensaje={lista.error} />}
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Tareas recientes</h2>
          {tareas.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Todavía no hay actividad desde el último reinicio del servidor. Lanza «Buscar temas» o «Escribir un artículo» en el departamento de SEO, o pídele algo al AI CMO, y aparecerá aquí.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {tareas.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => { auto.current = t.id === tareas[0].id; setElegida(t.id); }}
                    aria-pressed={actual === t.id}
                    className={cn("w-full rounded-lg border p-2.5 text-left transition-colors", actual === t.id ? "border-primary bg-primary/5" : "hover:bg-muted/40")}
                  >
                    <div className="flex items-center gap-2">
                      <Icono estado={t.state} />
                      <span className="text-xs font-medium text-muted-foreground">{TIPO[t.type] ?? t.type}</span>
                      <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{mmss(segundos(t.started_at, t.finished_at, ahora))}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm">{t.title}</p>
                    {t.summary && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.summary}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="min-w-0 space-y-3">
          {tarea ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{tarea.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Empezó {fechaHora(tarea.started_at)} · {enCurso ? `lleva ${mmss(segundos(tarea.started_at, null, ahora))}` : `duró ${mmss(segundos(tarea.started_at, tarea.finished_at))}`}
                  </p>
                </div>
                <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", tarea.state === "running" ? "bg-blue-500/10 text-blue-700" : tarea.state === "done" ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700")}>
                  {tarea.state === "running" ? "En curso" : tarea.state === "done" ? "Terminada" : "Con error"}
                </span>
              </div>
              <LineaDeTiempo eventos={eventos} enCurso={!!enCurso} ahora={ahora} />
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Elige una tarea de la izquierda.</div>
          )}
        </section>
      </div>
    </div>
  );
}
