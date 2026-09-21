"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Refresh2, SearchNormal1, Sms, Send2, CloseCircle, Notification, Paperclip2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Buzon, ContadoresMensajes, MensajeDetalle, MensajeLista, nombreOCorreo } from "@/lib/mails";

const ZONA = "Europe/Madrid";
const PAGINA = 50;

type Vista = "entrada" | "salida" | "rebotes";

function fechaCorta(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: ZONA });
  const dia = d.toLocaleDateString("sv-SE", { timeZone: ZONA });
  if (dia === hoy) return d.toLocaleTimeString("es-ES", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false });
  return d.toLocaleDateString("es-ES", { timeZone: ZONA, day: "2-digit", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "2-digit" });
}

function fechaLarga(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES", { timeZone: ZONA, dateStyle: "full", timeStyle: "short" });
}

/** El cuerpo HTML de un correo es contenido no fiable: va en un iframe sin
    scripts ni acceso al resto de la página, y con una política que bloquea
    imágenes remotas (píxeles de seguimiento) y cualquier carga externa. */
function documentoSeguro(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: cid:; style-src 'unsafe-inline'; font-src data:">
<base target="_blank">
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.5;margin:16px;color:#1f2937;word-break:break-word}img{max-width:100%;height:auto}table{max-width:100%}blockquote{border-left:3px solid #d1d5db;margin:8px 0;padding-left:12px;color:#4b5563}</style>
</head><body>${html}</body></html>`;
}

export default function BandejaPage() {
  const [buzones, setBuzones] = useState<Buzon[]>([]);
  const [cargandoBuzones, setCargandoBuzones] = useState(true);
  const [buzonSel, setBuzonSel] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista>("entrada");
  const [soloSinLeer, setSoloSinLeer] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [mensajes, setMensajes] = useState<MensajeLista[]>([]);
  const [total, setTotal] = useState(0);
  const [contadores, setContadores] = useState<ContadoresMensajes>({ entrada: 0, salida: 0, rebotes: 0, sin_leer: 0 });
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<MensajeDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [verTexto, setVerTexto] = useState(false);
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargarBuzones = useCallback(async () => {
    try {
      const res = await fetch("/api/mails/buzones");
      const data = await res.json();
      if (data.ok) setBuzones(data.buzones as Buzon[]);
    } catch {
      /* la lista de buzones es secundaria: la bandeja sigue funcionando */
    } finally {
      setCargandoBuzones(false);
    }
  }, []);

  useEffect(() => {
    cargarBuzones();
  }, [cargarBuzones]);

  const parametros = useCallback(
    (offset: number) => {
      const p = new URLSearchParams({ limit: String(PAGINA), offset: String(offset) });
      if (buzonSel) p.set("buzon", String(buzonSel));
      if (vista === "entrada") {
        p.set("direccion", "entrada");
        p.set("rebote", "no");
      } else if (vista === "salida") {
        p.set("direccion", "salida");
      } else {
        p.set("rebote", "si");
      }
      if (soloSinLeer && vista === "entrada") p.set("sinLeer", "true");
      if (busquedaAplicada.trim()) p.set("q", busquedaAplicada.trim());
      return p.toString();
    },
    [buzonSel, vista, soloSinLeer, busquedaAplicada]
  );

  const cargar = useCallback(async () => {
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/mails/mensajes?${parametros(0)}`);
      const data = await res.json();
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setMensajes(data.mensajes as MensajeLista[]);
      setTotal(data.total as number);
      setContadores(data.contadores as ContadoresMensajes);
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [parametros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function mostrarMas() {
    const id = consulta.current;
    setCargandoMas(true);
    try {
      const res = await fetch(`/api/mails/mensajes?${parametros(mensajes.length)}`);
      const data = await res.json();
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setMensajes((prev) => {
        const vistos = new Set(prev.map((m) => m.id));
        return [...prev, ...(data.mensajes as MensajeLista[]).filter((m) => !vistos.has(m.id))];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargandoMas(false);
    }
  }

  async function abrir(m: MensajeLista) {
    setSeleccionado(m.id);
    setDetalle(null);
    setVerTexto(false);
    setCargandoDetalle(true);
    try {
      const res = await fetch(`/api/mails/mensajes/${m.id}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDetalle(data.mensaje as MensajeDetalle);
      if (!m.leido) {
        setMensajes((prev) => prev.map((x) => (x.id === m.id ? { ...x, leido: true } : x)));
        if (m.direccion === "entrada" && !m.es_rebote) setContadores((c) => ({ ...c, sin_leer: Math.max(0, c.sin_leer - 1) }));
        setBuzones((prev) => prev.map((b) => (b.id === m.buzon_id ? { ...b, sin_leer: Math.max(0, b.sin_leer - 1) } : b)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargandoDetalle(false);
    }
  }

  const buzonActual = useMemo(() => buzones.find((b) => b.id === buzonSel) || null, [buzones, buzonSel]);
  const totalSinLeerBuzones = buzones.reduce((a, b) => a + b.sin_leer, 0);

  const claseKpi = (activo: boolean) =>
    `rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/40 ${activo ? "ring-2 ring-primary/50" : ""}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Bandeja</h1>
          <p className="text-sm text-muted-foreground">
            {buzonActual ? buzonActual.email : "Todos los buzones"} · entrada, enviados y rebotes
          </p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={() => { cargar(); cargarBuzones(); }} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" aria-pressed={vista === "entrada" && !soloSinLeer} onClick={() => { setVista("entrada"); setSoloSinLeer(false); }} className={claseKpi(vista === "entrada" && !soloSinLeer)}>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Sms className="size-3.5" /> Entrada</p>
          <p className="text-lg font-semibold tabular-nums">{cargando ? "…" : contadores.entrada.toLocaleString("es-ES")}</p>
        </button>
        <button type="button" aria-pressed={vista === "entrada" && soloSinLeer} onClick={() => { setVista("entrada"); setSoloSinLeer((v) => !(v && vista === "entrada")); }} className={claseKpi(vista === "entrada" && soloSinLeer)}>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Notification className="size-3.5" /> Sin leer</p>
          <p className="text-lg font-semibold tabular-nums text-primary">{cargando ? "…" : contadores.sin_leer.toLocaleString("es-ES")}</p>
        </button>
        <button type="button" aria-pressed={vista === "salida"} onClick={() => { setVista("salida"); setSoloSinLeer(false); }} className={claseKpi(vista === "salida")}>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Send2 className="size-3.5" /> Enviados</p>
          <p className="text-lg font-semibold tabular-nums">{cargando ? "…" : contadores.salida.toLocaleString("es-ES")}</p>
        </button>
        <button type="button" aria-pressed={vista === "rebotes"} onClick={() => { setVista("rebotes"); setSoloSinLeer(false); }} className={claseKpi(vista === "rebotes")}>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CloseCircle className="size-3.5" /> Rebotes</p>
          <p className="text-lg font-semibold tabular-nums text-red-600">{cargando ? "…" : contadores.rebotes.toLocaleString("es-ES")}</p>
        </button>
      </div>

      {!cargandoBuzones && buzones.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Todavía no hay buzones. <Link href="/mails/buzones" className="font-medium text-primary underline-offset-2 hover:underline">Añade el primero</Link> para ver aquí su bandeja de entrada y sus enviados.
        </div>
      )}

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="grid min-h-[60vh] gap-3 lg:grid-cols-[15rem_minmax(20rem,26rem)_1fr]">
        {/* Buzones */}
        <div className="rounded-lg border bg-card">
          <p className="border-b px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Buzones</p>
          <div className="max-h-[70vh] overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => setBuzonSel(null)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${buzonSel === null ? "bg-muted font-medium" : ""}`}
            >
              <span>Todos los buzones</span>
              {totalSinLeerBuzones > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{totalSinLeerBuzones}</span>}
            </button>
            {cargandoBuzones && <Skeleton className="m-2 h-6" />}
            {buzones.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBuzonSel(b.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${buzonSel === b.id ? "bg-muted font-medium" : ""} ${b.activo ? "" : "opacity-50"}`}
                title={b.ultimo_error || b.email}
              >
                <span className="min-w-0">
                  <span className="block truncate">{b.nombre}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{b.email}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {b.ultimo_error && <span className="size-1.5 rounded-full bg-red-500" title={b.ultimo_error} />}
                  {b.sin_leer > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{b.sin_leer}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex flex-col rounded-lg border bg-card">
          <div className="relative border-b p-2">
            <SearchNormal1 className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Asunto, remitente o destinatario…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="max-h-[70vh] flex-1 overflow-y-auto">
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5 border-b p-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            {!cargando && mensajes.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {busquedaAplicada ? "Ningún mensaje coincide con la búsqueda" : "No hay mensajes en esta vista"}
              </p>
            )}
            {!cargando &&
              mensajes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => abrir(m)}
                  className={`block w-full border-b px-3 py-2.5 text-left hover:bg-muted/50 ${seleccionado === m.id ? "bg-muted" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${m.leido ? "" : "font-semibold"}`}>
                      {m.direccion === "salida" ? `Para: ${m.destinatarios || "—"}` : nombreOCorreo(m)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{fechaCorta(m.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!m.leido && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className={`truncate text-sm ${m.leido ? "text-muted-foreground" : "font-medium"}`}>{m.asunto || "(sin asunto)"}</span>
                    {m.tiene_adjuntos && <Paperclip2 className="size-3.5 shrink-0 text-muted-foreground" />}
                    {m.es_rebote && <span className="shrink-0 rounded bg-red-500/10 px-1 text-[10px] font-medium text-red-600">Rebote</span>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{m.resumen}</p>
                  {!buzonSel && <p className="truncate text-[11px] text-muted-foreground/70">{m.buzon_email}</p>}
                </button>
              ))}
            {!cargando && mensajes.length < total && (
              <div className="p-3 text-center">
                <Button variant="outline" size="sm" disabled={cargandoMas} onClick={mostrarMas}>
                  {cargandoMas ? "Cargando…" : `Mostrar ${PAGINA} más (${mensajes.length.toLocaleString("es-ES")} de ${total.toLocaleString("es-ES")})`}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Lectura */}
        <div className="flex min-h-[40vh] flex-col rounded-lg border bg-card">
          {!seleccionado && <p className="m-auto p-6 text-sm text-muted-foreground">Elige un mensaje para leerlo</p>}
          {seleccionado && cargandoDetalle && (
            <div className="space-y-3 p-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {seleccionado && !cargandoDetalle && detalle && (
            <>
              <div className="space-y-1 border-b p-4">
                <h2 className="text-base font-semibold">{detalle.asunto || "(sin asunto)"}</h2>
                <p className="text-sm">
                  <span className="text-muted-foreground">De: </span>
                  {detalle.remitente_nombre ? `${detalle.remitente_nombre} <${detalle.remitente}>` : detalle.remitente}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Para: </span>
                  {detalle.destinatarios || "—"}
                </p>
                {detalle.cc && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">CC: </span>
                    {detalle.cc}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {fechaLarga(detalle.fecha)} · Buzón {detalle.buzon_email} · {detalle.carpeta}
                </p>
                {detalle.adjuntos.length > 0 && (
                  <p className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                    <Paperclip2 className="size-3.5" />
                    {detalle.adjuntos.map((a, i) => (
                      <span key={i} className="rounded bg-muted px-1.5 py-0.5">
                        {a.nombre}
                      </span>
                    ))}
                  </p>
                )}
                {detalle.cuerpo_html && detalle.cuerpo_texto && (
                  <Button variant="ghost" size="sm" className="mt-1 h-6 px-2 text-xs" onClick={() => setVerTexto((v) => !v)}>
                    {verTexto ? "Ver formato original" : "Ver como texto"}
                  </Button>
                )}
              </div>
              {detalle.cuerpo_html && !verTexto ? (
                <iframe
                  title="Contenido del correo"
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  srcDoc={documentoSeguro(detalle.cuerpo_html)}
                  referrerPolicy="no-referrer"
                  className="h-[60vh] w-full flex-1 border-0"
                />
              ) : (
                <pre className="max-h-[60vh] flex-1 overflow-auto whitespace-pre-wrap p-4 font-sans text-sm">{detalle.cuerpo_texto || "(mensaje sin contenido)"}</pre>
              )}
              {detalle.truncado && <p className="border-t px-4 py-2 text-xs text-muted-foreground">Mensaje muy largo: se guardó recortado.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
