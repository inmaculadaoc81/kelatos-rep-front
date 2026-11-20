"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, Call, Clock, CloseCircle, Copy, Edit2, InfoCircle, Refresh2, Send2, Setting2, TickCircle, Video, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";

interface Recordatorio { id: number; tipo: string; estado: "pendiente" | "enviado" | "fallido" | "cancelado" | "omitido"; programado_para: string; enviado_en: string | null; motivo: string | null; error: string | null }
interface Reunion {
  id: number; cal_uid: string; titulo: string; inicio: string; fin: string | null; estado: "programada" | "cancelada" | "pendiente" | "rechazada"; reprogramada: boolean;
  nombre: string | null; email: string | null; telefono_original: string | null; telefono: string | null; telefono_valido: boolean; telefono_nota: string | null; telefono_origen: string | null;
  zona_horaria: string | null; enlace: string | null; notas: string | null; ia_resumen: string | null; ia_interes: string | null; recordatorios_activos: boolean; recordatorios: Recordatorio[];
}
interface Config { modo: "pausa" | "enviar"; plantilla: string; horas: number[]; bandeja: number; tieneApiKey: boolean; ultimaSync: string | null; webhookEventos: number; webhookUltimo: string | null }
interface Respuesta { ok: boolean; reuniones: Reunion[]; ahora: string; config: Config }
interface ConfigDetalle { modo: "pausa" | "enviar"; plantilla: string; horas: number[]; tieneApiKey: boolean; ultimaSync: string | null; plantillaEstado: string; errorPlantillas: string | null }

const TZ = "Europe/Madrid";
const diaMadrid = (d: Date | string) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date(d));
const horaMadrid = (d: Date | string) => new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(d));
const fechaCorta = (d: Date | string) => new Intl.DateTimeFormat("es-ES", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(d));

function etiquetaDia(dia: string, hoy: string): string {
  const base = new Date(`${dia}T12:00:00Z`);
  const manana = new Date(new Date(`${hoy}T12:00:00Z`).getTime() + 86400000);
  const largo = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(base);
  if (dia === hoy) return `Hoy · ${largo}`;
  if (dia === diaMadrid(manana)) return `Mañana · ${largo}`;
  return largo.charAt(0).toUpperCase() + largo.slice(1);
}

function enCuanto(inicio: string, ahora: number): string {
  const ms = new Date(inicio).getTime() - ahora;
  if (ms < 0) return Math.abs(ms) < 3600_000 ? "en curso" : "ya pasó";
  const min = Math.round(ms / 60000);
  if (min < 60) return `en ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `en ${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
  const d = Math.round(ms / 86400000);
  return `en ${d} día${d !== 1 ? "s" : ""}`;
}

/** +34612345678 → +34 612 345 678 (agrupa de 3 en 3 tras el prefijo; es solo presentación). */
function bonito(tel: string | null): string {
  if (!tel) return "";
  const m = tel.match(/^\+(\d{1,3})(\d+)$/);
  if (!m) return tel;
  return `+${m[1]} ${m[2].replace(/(\d{3})(?=\d)/g, "$1 ")}`;
}

const ROTULO_TIPO = (t: string) => (t === "manual" ? "Manual" : `${t.replace("_", ",").replace("h", "")} h antes`);

const INTERES: Record<string, { texto: string; clase: string }> = {
  alto: { texto: "Interés alto", clase: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  medio: { texto: "Interés medio", clase: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  bajo: { texto: "Interés bajo", clase: "bg-muted text-muted-foreground" },
};

type Filtro = "proximas" | "hoy" | "sin_telefono" | "pasadas" | "canceladas" | "todas";

async function api(url: string, metodo: string, cuerpo?: unknown) {
  const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "Error");
  return j;
}

/** Reuniones de Cal.com (N8N Labs): próximas, con teléfono clasificado por la IA y recordatorios por WhatsApp. */
export default function ReunionesPage() {
  const esSuper = useEsSuperadmin();
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("proximas");
  const [sincronizando, setSincronizando] = useState(false);
  const [editando, setEditando] = useState<Reunion | null>(null);
  const [configAbierta, setConfigAbierta] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      setDatos((await api("/api/n8nlabs/reuniones", "GET")) as Respuesta);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
      setAhora(Date.now());
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    const i = setInterval(() => void cargar(true), 60_000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, [cargar]);

  async function sincronizar() {
    setSincronizando(true);
    try {
      const r = await api("/api/n8nlabs/reuniones/sincronizar", "POST", {});
      toast.success(`Cal.com sincronizado: ${r.leidas} reservas leídas`);
      await cargar(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo sincronizar");
    } finally {
      setSincronizando(false);
    }
  }

  const hoy = diaMadrid(new Date(ahora));
  const reuniones = useMemo(() => datos?.reuniones ?? [], [datos]);
  const vivas = useMemo(() => reuniones.filter((r) => r.estado === "programada" && new Date(r.fin || r.inicio).getTime() >= ahora - 30 * 60_000), [reuniones, ahora]);

  const kpi = useMemo(() => {
    const manana = diaMadrid(new Date(new Date(`${hoy}T12:00:00Z`).getTime() + 86400000));
    const limite = ahora + 7 * 86400_000;
    return {
      hoy: vivas.filter((r) => diaMadrid(r.inicio) === hoy).length,
      manana: vivas.filter((r) => diaMadrid(r.inicio) === manana).length,
      semana: vivas.filter((r) => new Date(r.inicio).getTime() <= limite).length,
      sinTel: vivas.filter((r) => !r.telefono_valido).length,
      pendientes: vivas.reduce((n, r) => n + r.recordatorios.filter((q) => q.estado === "pendiente").length, 0),
      enviados: reuniones.reduce((n, r) => n + r.recordatorios.filter((q) => q.estado === "enviado").length, 0),
    };
  }, [vivas, reuniones, hoy, ahora]);

  const proxima = vivas.find((r) => new Date(r.inicio).getTime() >= ahora - 30 * 60_000);

  const lista = useMemo(() => {
    const f = reuniones.filter((r) => {
      const pasada = new Date(r.fin || r.inicio).getTime() < ahora - 30 * 60_000;
      switch (filtro) {
        case "proximas": return r.estado === "programada" && !pasada;
        case "hoy": return r.estado === "programada" && diaMadrid(r.inicio) === hoy;
        case "sin_telefono": return r.estado === "programada" && !pasada && !r.telefono_valido;
        case "pasadas": return r.estado === "programada" && pasada;
        case "canceladas": return r.estado === "cancelada" || r.estado === "rechazada";
        default: return true;
      }
    });
    return filtro === "pasadas" || filtro === "canceladas" ? [...f].reverse() : f;
  }, [reuniones, filtro, hoy, ahora]);

  const porDia = useMemo(() => {
    const m = new Map<string, Reunion[]>();
    for (const r of lista) {
      const d = diaMadrid(r.inicio);
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(r);
    }
    return Array.from(m.entries());
  }, [lista]);

  const cfg = datos?.config;
  const TARJETAS: { clave: Filtro; titulo: string; valor: number; clase: string; icono: React.ElementType }[] = [
    { clave: "hoy", titulo: "Hoy", valor: kpi.hoy, clase: "text-blue-600 bg-blue-500/10", icono: Calendar },
    { clave: "proximas", titulo: "Mañana", valor: kpi.manana, clase: "text-violet-600 bg-violet-500/10", icono: Clock },
    { clave: "proximas", titulo: "Próximos 7 días", valor: kpi.semana, clase: "text-emerald-600 bg-emerald-500/10", icono: Video },
    { clave: "sin_telefono", titulo: "Sin teléfono válido", valor: kpi.sinTel, clase: kpi.sinTel ? "text-red-600 bg-red-500/10" : "text-muted-foreground bg-muted", icono: Warning2 },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold"><Calendar className="size-5" /> Reuniones</h1>
          <p className="text-sm text-muted-foreground">Las reservas de Cal.com, con su teléfono clasificado y los recordatorios por WhatsApp de Automatizaciones n8n.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={sincronizar} disabled={sincronizando}><Refresh2 className={cn("size-4", sincronizando && "animate-spin")} /> Sincronizar Cal.com</Button>
          {esSuper && <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setConfigAbierta(true)}><Setting2 className="size-4" /> Configuración</Button>}
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      {/* Estado de las conexiones */}
      {cfg && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", cfg.tieneApiKey ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300")}>
            {cfg.tieneApiKey ? <TickCircle className="size-3.5" /> : <CloseCircle className="size-3.5" />}
            {cfg.tieneApiKey ? `Cal.com conectado${cfg.ultimaSync ? ` · sincronizado ${fechaCorta(cfg.ultimaSync)}` : ""}` : "Cal.com sin conectar (falta la clave de la API)"}
          </span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", cfg.modo === "enviar" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300")}>
            <Send2 className="size-3.5" />
            {cfg.modo === "enviar" ? "Recordatorios por WhatsApp: ACTIVOS" : "Recordatorios por WhatsApp: EN PAUSA (todavía no se envía nada)"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-muted-foreground">
            <Clock className="size-3.5" /> Avisos: {cfg.horas.map((h) => `${h} h`).join(" y ")} antes
          </span>
        </div>
      )}

      {/* Tarjetas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TARJETAS.map((t) => {
          const Ico = t.icono;
          return (
            <button key={t.titulo} type="button" onClick={() => setFiltro(t.clave)} className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md">
              <span className={cn("flex size-10 items-center justify-center rounded-lg", t.clase)}><Ico className="size-5" /></span>
              <div>
                <div className="text-2xl leading-none font-semibold tabular-nums">{cargando && !datos ? "–" : t.valor}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.titulo}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Próxima reunión */}
      {proxima && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="text-center">
            <div className="text-[10px] font-bold tracking-wider text-primary uppercase">Próxima reunión</div>
            <div className="text-2xl font-semibold tabular-nums">{horaMadrid(proxima.inicio)}</div>
            <div className="text-xs text-muted-foreground">{diaMadrid(proxima.inicio) === hoy ? "hoy" : etiquetaDia(diaMadrid(proxima.inicio), hoy)}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold">{proxima.nombre || "Sin nombre"} <span className="ml-1 text-sm font-medium text-primary">{enCuanto(proxima.inicio, ahora)}</span></div>
            <div className="text-xs text-muted-foreground">{proxima.email}{proxima.telefono ? ` · ${bonito(proxima.telefono)}` : ""}</div>
            {proxima.ia_resumen && <div className="mt-1 text-sm">{proxima.ia_resumen}</div>}
          </div>
          {proxima.enlace && <Button size="sm" variant="outline" nativeButton={false} render={<a href={proxima.enlace} target="_blank" rel="noopener noreferrer" />}><Video className="size-4" /> Abrir reunión</Button>}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([["proximas", "Próximas"], ["hoy", "Hoy"], ["sin_telefono", "Sin teléfono"], ["pasadas", "Pasadas"], ["canceladas", "Canceladas"], ["todas", "Todas"]] as [Filtro, string][]).map(([c, t]) => (
          <button key={c} type="button" onClick={() => setFiltro(c)} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", filtro === c ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")}>{t}</button>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">{lista.length} reunión{lista.length !== 1 ? "es" : ""}</span>
      </div>

      {/* Lista por días */}
      {cargando && !datos ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : porDia.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">No hay reuniones en esta lista.</div>
      ) : (
        <div className="space-y-5">
          {porDia.map(([dia, rs]) => (
            <section key={dia} className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn("rounded-md px-2 py-0.5", dia === hoy ? "bg-primary text-primary-foreground" : "bg-muted")}>{etiquetaDia(dia, hoy)}</span>
                <span className="text-xs font-normal text-muted-foreground">{rs.length} reunión{rs.length !== 1 ? "es" : ""}</span>
              </h2>
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                {rs.map((r, i) => (
                  <FilaReunion key={r.id} r={r} ahora={ahora} modo={cfg?.modo ?? "pausa"} primera={i === 0} esSuper={esSuper} onEditar={() => setEditando(r)} onCambio={() => cargar(true)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {kpi.pendientes} recordatorio{kpi.pendientes !== 1 ? "s" : ""} programado{kpi.pendientes !== 1 ? "s" : ""} · {kpi.enviados} enviado{kpi.enviados !== 1 ? "s" : ""}. Las reservas se sincronizan solas con Cal.com cada pocos minutos. Horas en hora de España.
      </p>

      {editando && <EditarTelefono r={editando} onCerrar={() => setEditando(null)} onGuardado={async () => { setEditando(null); await cargar(true); }} />}
      {configAbierta && <ConfigDialog onCerrar={() => setConfigAbierta(false)} onCambio={() => cargar(true)} />}
    </div>
  );
}

function FilaReunion({ r, ahora, modo, primera, esSuper, onEditar, onCambio }: { r: Reunion; ahora: number; modo: "pausa" | "enviar"; primera: boolean; esSuper: boolean; onEditar: () => void; onCambio: () => Promise<void> }) {
  const [trabajando, setTrabajando] = useState(false);
  const pasada = new Date(r.fin || r.inicio).getTime() < ahora - 30 * 60_000;
  const cancelada = r.estado === "cancelada" || r.estado === "rechazada";
  const interes = r.ia_interes ? INTERES[r.ia_interes] : undefined;

  async function alternar(v: boolean) {
    setTrabajando(true);
    try { await api(`/api/n8nlabs/reuniones/${r.id}`, "PATCH", { recordatoriosActivos: v }); await onCambio(); } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo cambiar"); } finally { setTrabajando(false); }
  }
  async function enviarAhora() {
    if (!window.confirm(`Se enviará YA por WhatsApp el recordatorio a ${r.nombre || "este cliente"} (${bonito(r.telefono)}). ¿Enviar?`)) return;
    setTrabajando(true);
    try { await api(`/api/n8nlabs/reuniones/${r.id}/enviar-ahora`, "POST", {}); toast.success("Recordatorio enviado"); await onCambio(); } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo enviar"); } finally { setTrabajando(false); }
  }

  return (
    <div className={cn("grid gap-3 px-4 py-3 md:grid-cols-[88px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]", !primera && "border-t", (cancelada || pasada) && "opacity-60")}>
      {/* Hora */}
      <div>
        <div className="text-lg leading-tight font-semibold tabular-nums">{horaMadrid(r.inicio)}</div>
        <div className={cn("text-[11px] font-medium", cancelada ? "text-red-600" : pasada ? "text-muted-foreground" : "text-primary")}>{cancelada ? (r.estado === "cancelada" ? "Cancelada" : "Rechazada") : enCuanto(r.inicio, ahora)}</div>
        {r.reprogramada && !cancelada && <div className="text-[10px] text-amber-600">reprogramada</div>}
      </div>

      {/* Cliente + IA */}
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{r.nombre || "Sin nombre"}</div>
        <div className="truncate text-xs text-muted-foreground">{r.email || "sin correo"}</div>
        {(r.ia_resumen || interes) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {interes && <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", interes.clase)}>{interes.texto}</span>}
            {r.ia_resumen && <span className="text-xs text-muted-foreground">{r.ia_resumen}</span>}
          </div>
        )}
      </div>

      {/* Teléfono */}
      <div className="min-w-0">
        {r.telefono_valido ? (
          <div className="flex items-center gap-1.5 text-sm"><Call className="size-3.5 text-emerald-600" /> <span className="tabular-nums">{bonito(r.telefono)}</span></div>
        ) : r.telefono ? (
          <div className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300"><Warning2 className="size-3.5" /> <span className="tabular-nums">{bonito(r.telefono)}</span></div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-red-600"><Warning2 className="size-3.5" /> {r.telefono_original ? <span className="truncate">{r.telefono_original}</span> : "Sin teléfono"}</div>
        )}
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {r.telefono_valido ? `${r.telefono_origen === "cal" ? "dato de Cal.com" : r.telefono_origen === "notas" ? "sacado de las notas" : r.telefono_origen === "ia" ? "rescatado por la IA" : r.telefono_origen === "manual" ? "corregido a mano" : "dato de la reserva"}` : r.telefono_nota || "no se puede avisar por WhatsApp"}
        </div>
      </div>

      {/* Recordatorios */}
      <div className="flex flex-col gap-1">
        {r.recordatorios.length === 0 ? (
          <span className="text-xs text-muted-foreground">{cancelada ? "—" : pasada ? "—" : !r.telefono_valido ? "Sin aviso: falta un teléfono válido" : !r.recordatorios_activos ? "Avisos desactivados" : "Sin avisos programados"}</span>
        ) : (
          r.recordatorios.map((q) => <ChipRecordatorio key={q.id} q={q} modo={modo} />)
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 md:justify-end">
        {!cancelada && !pasada && (
          <>
            <Button variant="ghost" size="icon" className="size-8" title="Corregir el teléfono" onClick={onEditar}><Edit2 className="size-4" /></Button>
            <Switch checked={r.recordatorios_activos} disabled={trabajando} onCheckedChange={(v) => alternar(v === true)} title={r.recordatorios_activos ? "Desactivar los avisos de esta reunión" : "Activar los avisos de esta reunión"} />
            {esSuper && r.telefono_valido && <Button variant="ghost" size="icon" className="size-8" title="Enviar el recordatorio ahora" disabled={trabajando} onClick={enviarAhora}><Send2 className="size-4" /></Button>}
          </>
        )}
        {r.enlace && <Button variant="ghost" size="icon" className="size-8" title="Abrir la reunión" nativeButton={false} render={<a href={r.enlace} target="_blank" rel="noopener noreferrer" />}><Video className="size-4" /></Button>}
      </div>
    </div>
  );
}

function ChipRecordatorio({ q, modo }: { q: Recordatorio; modo: "pausa" | "enviar" }) {
  const rot = ROTULO_TIPO(q.tipo);
  const base = "inline-flex w-fit max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium";
  if (q.estado === "enviado") return <span className={cn(base, "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}><TickCircle className="size-3.5" /> {rot}: enviado {q.enviado_en ? fechaCorta(q.enviado_en) : ""}</span>;
  if (q.estado === "pendiente") return <span className={cn(base, modo === "enviar" ? "bg-blue-500/15 text-blue-700 dark:text-blue-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300")} title={q.error || undefined}><Clock className="size-3.5" /> {rot}: {modo === "enviar" ? "se enviará" : "programado (en pausa)"} {fechaCorta(q.programado_para)}{q.error ? " ⚠" : ""}</span>;
  if (q.estado === "fallido") return <span className={cn(base, "bg-red-500/15 text-red-700 dark:text-red-300")} title={q.error || undefined}><CloseCircle className="size-3.5" /> {rot}: falló{q.error ? ` · ${q.error}` : ""}</span>;
  return <span className={cn(base, "bg-muted text-muted-foreground")} title={q.motivo || undefined}>{rot}: {q.estado === "omitido" ? "omitido" : "cancelado"}{q.motivo ? ` · ${q.motivo}` : ""}</span>;
}

function EditarTelefono({ r, onCerrar, onGuardado }: { r: Reunion; onCerrar: () => void; onGuardado: () => Promise<void> }) {
  const [tel, setTel] = useState(r.telefono || r.telefono_original || "");
  const [guardando, setGuardando] = useState(false);
  async function guardar() {
    setGuardando(true);
    try { await api(`/api/n8nlabs/reuniones/${r.id}`, "PATCH", { telefono: tel }); toast.success("Teléfono guardado"); await onGuardado(); } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo guardar"); } finally { setGuardando(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Teléfono de {r.nombre || "la reunión"}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>WhatsApp / teléfono con prefijo internacional</Label>
          <Input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="+34 612 345 678" autoFocus />
          <p className="text-[11px] text-muted-foreground">Si no pones prefijo y son 9 cifras, se entiende que es de España (+34). Al guardarlo se programan los avisos de esta reunión.</p>
          {r.notas && <p className="rounded-md bg-muted/50 p-2 text-xs"><span className="font-medium">Notas de la reserva:</span> {r.notas}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TEXTO_PLANTILLA = "Hola {{1}}, te recordamos tu reunión con N8N Labs el {{2}} a las {{3}}.\n\nEnlace para conectarte: {{4}}\n\nSi no puedes asistir, responde a este mensaje y la reprogramamos. ¡Te esperamos!";

function ConfigDialog({ onCerrar, onCambio }: { onCerrar: () => void; onCambio: () => Promise<void> }) {
  const [c, setC] = useState<ConfigDetalle | null>(null);
  const [clave, setClave] = useState("");
  const [horas, setHoras] = useState("");
  const [plantilla, setPlantilla] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const j = (await api("/api/n8nlabs/reuniones/config", "GET")) as ConfigDetalle;
      setC(j);
      setHoras(j.horas.join(","));
      setPlantilla(j.plantilla);
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo leer la configuración"); }
  }, []);
  useEffect(() => { const t = setTimeout(() => void cargar(), 0); return () => clearTimeout(t); }, [cargar]);

  async function guardar(cambios: Record<string, unknown>, ok: string) {
    setGuardando(true);
    try { await api("/api/n8nlabs/reuniones/config", "PUT", cambios); toast.success(ok); setClave(""); await cargar(); await onCambio(); } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo guardar"); } finally { setGuardando(false); }
  }

  const aprobada = c?.plantillaEstado?.toUpperCase() === "APPROVED";
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Configuración de reuniones y recordatorios</DialogTitle></DialogHeader>
        {!c ? <Skeleton className="h-40 w-full" /> : (
          <div className="space-y-5">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">1 · Cal.com</h3>
              <p className="text-xs text-muted-foreground">{c.tieneApiKey ? "Conectado con una clave de API." : "Falta la clave de API."} Se crea en Cal.com → Ajustes → Desarrollador → Claves API.</p>
              <div className="flex gap-2">
                <Input type="password" placeholder={c.tieneApiKey ? "•••••• (pega una nueva para cambiarla)" : "cal_live_…"} value={clave} onChange={(e) => setClave(e.target.value)} />
                <Button size="sm" disabled={!clave.trim() || guardando} onClick={() => guardar({ calcomApiKey: clave }, "Clave guardada")}>Guardar</Button>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">2 · Cuándo avisar</h3>
              <div className="flex gap-2">
                <Input value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="24,2" className="w-40" />
                <Button size="sm" variant="outline" disabled={guardando} onClick={() => guardar({ horas }, "Horas guardadas")}>Guardar</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Horas antes de la reunión, separadas por comas. «24,2» = un día antes y 2 horas antes. Si alguien reserva con menos antelación, ese aviso se omite.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">3 · Plantilla de WhatsApp</h3>
              <p className="text-xs text-muted-foreground">Un mensaje que empieza la empresa necesita una plantilla aprobada por Meta. Estado actual de «{c.plantilla}»:{" "}
                <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", aprobada ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300")}>
                  {c.plantillaEstado === "NO_EXISTE" ? "no existe todavía" : c.plantillaEstado}
                </span>
              </p>
              {c.errorPlantillas && <p className="text-xs text-red-600">No se pudo consultar Chatwoot: {c.errorPlantillas}</p>}
              <div className="flex gap-2">
                <Input value={plantilla} onChange={(e) => setPlantilla(e.target.value)} className="w-72" />
                <Button size="sm" variant="outline" disabled={guardando} onClick={() => guardar({ plantilla }, "Plantilla guardada")}>Guardar</Button>
              </div>
              {!aprobada && (
                <div className="rounded-md border bg-muted/40 p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between font-medium">Texto para crear la plantilla (categoría Utilidad, idioma español de España)
                    <Button variant="ghost" size="icon" className="size-6" title="Copiar" onClick={() => { void navigator.clipboard.writeText(TEXTO_PLANTILLA); toast.success("Texto copiado"); }}><Copy className="size-3.5" /></Button>
                  </div>
                  <pre className="font-sans whitespace-pre-wrap text-muted-foreground">{TEXTO_PLANTILLA}</pre>
                  <p className="mt-2 text-muted-foreground">Variables: {"{{1}}"} nombre · {"{{2}}"} fecha · {"{{3}}"} hora · {"{{4}}"} enlace. Nombre sugerido: <span className="font-medium">recordatorio_reunion_n8nlabs</span>. Se crea en Chatwoot (bandeja Automatizaciones n8n) o en el administrador de WhatsApp de Meta y suele aprobarse en minutos u horas.</p>
                </div>
              )}
            </section>

            <section className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Send2 className="size-4" /> Enviar recordatorios reales</h3>
                  <p className="text-xs text-muted-foreground">{c.modo === "enviar" ? "ACTIVO: los avisos se envían solos por WhatsApp a la hora programada." : "EN PAUSA: se programan y se ven en la tabla, pero no se envía nada."}</p>
                </div>
                <Switch
                  checked={c.modo === "enviar"}
                  disabled={guardando || (c.modo !== "enviar" && (!aprobada || !c.tieneApiKey))}
                  onCheckedChange={(v) => {
                    if (v && !window.confirm("A partir de ahora se enviarán WhatsApp REALES a los clientes que reservaron en Cal.com a las horas programadas. ¿Activar?")) return;
                    void guardar({ modo: v ? "enviar" : "pausa", confirmarEnvio: v }, v ? "Envío activado" : "Envío en pausa");
                  }}
                />
              </div>
              {c.modo !== "enviar" && !aprobada && <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300"><InfoCircle className="mt-0.5 size-3.5 shrink-0" /> No se puede activar hasta que la plantilla esté aprobada por Meta.</p>}
            </section>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onCerrar}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
