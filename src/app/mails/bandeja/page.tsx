"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Refresh2, SearchNormal1, Sms, Send2, CloseCircle, Notification, Paperclip2, Edit2, Star, Trash, Folder2, RotateLeft, Eye, Category, Forward, Copy } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Buzon, CONTADORES_VACIOS, ContadoresMensajes, MensajeDetalle, MensajeHilo, MensajeLista, Vista, COLOR_ESTADO_LEAD, nombreOCorreo } from "@/lib/mails";
import { codigoClienteFormateado } from "@/lib/clientes";
import { useSondeoVisible } from "@/hooks/use-sondeo-visible";
import { BorradorCorreo, RedactarDialog } from "./redactar-dialog";
import { SeleccionarBuzonDialog } from "./seleccionar-buzon-dialog";
import { CuerpoMensaje, LinksAdjuntos, fechaCorta, fechaLarga } from "../componentes-correo";

const PAGINA = 40;
const REFRESCO_MS = 60_000;
// La tarjeta "Buzones" solo enseña estos de entrada; con más, el botón
// "Buscar buzón…" abre el modal con todos (si no, la tarjeta crece sin límite).
const BUZONES_VISIBLES = 5;

const CARPETAS: { vista: Vista; etiqueta: string; icono: typeof Sms; contador: keyof ContadoresMensajes; color: string }[] = [
  { vista: "todos", etiqueta: "Todos", icono: Category, contador: "todos", color: "from-slate-500 to-slate-600" },
  { vista: "entrada", etiqueta: "Entrada", icono: Sms, contador: "entrada", color: "from-blue-500 to-blue-600" },
  { vista: "destacados", etiqueta: "Destacados", icono: Star, contador: "destacados", color: "from-amber-500 to-amber-600" },
  { vista: "enviados", etiqueta: "Enviados", icono: Send2, contador: "enviados", color: "from-indigo-500 to-indigo-600" },
  { vista: "archivo", etiqueta: "Archivo", icono: Folder2, contador: "archivo", color: "from-violet-500 to-violet-600" },
  { vista: "rebotes", etiqueta: "Rebotes", icono: CloseCircle, contador: "rebotes", color: "from-red-500 to-red-600" },
  { vista: "papelera", etiqueta: "Papelera", icono: Trash, contador: "papelera", color: "from-zinc-500 to-zinc-600" },
];

const BORRADOR_VACIO: BorradorCorreo = { buzonId: null, para: "", cc: "", asunto: "", texto: "", respondeA: null };

/** Prepara la respuesta a un correo recibido: destinatario, "Re:" y el original citado. */
function borradorRespuesta(d: Pick<MensajeHilo, "id" | "buzon_id" | "asunto" | "remitente" | "remitente_nombre" | "cuerpo_texto" | "fecha">): BorradorCorreo {
  const asunto = /^\s*(re|rv)\s*:/i.test(d.asunto) ? d.asunto : `Re: ${d.asunto || ""}`.trim();
  const quien = d.remitente_nombre ? `${d.remitente_nombre} <${d.remitente}>` : d.remitente;
  const cita = (d.cuerpo_texto || "")
    .slice(0, 4000)
    .split("\n")
    .slice(0, 60)
    .map((l) => `> ${l}`)
    .join("\n");
  return { buzonId: d.buzon_id, para: d.remitente, cc: "", asunto, texto: `\n\n${fechaLarga(d.fecha)}, ${quien} escribió:\n${cita}`, respondeA: d.id };
}

/** Prepara el reenvío de un correo (recibido o enviado): sin destinatario
    prellenado, "Fwd:" y el original citado con su cabecera. A diferencia de
    responder, no encadena la conversación (respondeA: null) y no restringe
    la dirección del mensaje original. */
function borradorReenvio(
  d: Pick<MensajeHilo, "buzon_id" | "asunto" | "remitente" | "remitente_nombre" | "destinatarios" | "cuerpo_texto" | "fecha">
): BorradorCorreo {
  const asunto = /^\s*fwd\s*:/i.test(d.asunto) ? d.asunto : `Fwd: ${d.asunto || ""}`.trim();
  const quien = d.remitente_nombre ? `${d.remitente_nombre} <${d.remitente}>` : d.remitente;
  const cita = (d.cuerpo_texto || "")
    .slice(0, 4000)
    .split("\n")
    .slice(0, 60)
    .join("\n");
  const cabecera = `---------- Mensaje reenviado ----------\nDe: ${quien}\nFecha: ${fechaLarga(d.fecha)}\nPara: ${d.destinatarios || "—"}\nAsunto: ${d.asunto || "(sin asunto)"}`;
  return { buzonId: d.buzon_id, para: "", cc: "", asunto, texto: `\n\n${cabecera}\n\n${cita}`, respondeA: null, esReenvio: true };
}

async function copiarAlPortapapeles(texto: string, etiqueta: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(`${etiqueta} copiado`);
  } catch {
    toast.error("No se pudo copiar");
  }
}

interface FiltroExterno {
  cliente: string | null;
  lead: string | null;
  email: string | null;
}

export default function CentroMailsPage() {
  const [buzones, setBuzones] = useState<Buzon[]>([]);
  const [cargandoBuzones, setCargandoBuzones] = useState(true);
  // Enviar/responder es solo del superadmin (el backend lo vuelve a comprobar).
  const [puedeEnviar, setPuedeEnviar] = useState(false);
  const [redactar, setRedactar] = useState<{ abierto: boolean; n: number; borrador: BorradorCorreo }>({ abierto: false, n: 0, borrador: BORRADOR_VACIO });
  const [listo, setListo] = useState(false); // los filtros de la URL ya se leyeron
  const [buzonSel, setBuzonSel] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista>("entrada");
  const [soloSinLeer, setSoloSinLeer] = useState(false);
  const [agrupar, setAgrupar] = useState(true);
  const [externo, setExterno] = useState<FiltroExterno>({ cliente: null, lead: null, email: null });
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [mensajes, setMensajes] = useState<MensajeLista[]>([]);
  const [total, setTotal] = useState(0);
  const [contadores, setContadores] = useState<ContadoresMensajes>(CONTADORES_VACIOS);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<MensajeLista | null>(null);
  const [hilo, setHilo] = useState<MensajeHilo[] | null>(null);
  const [detalle, setDetalle] = useState<MensajeDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());
  const [seleccionarBuzonAbierto, setSeleccionarBuzonAbierto] = useState(false);
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Filtros que llegan por la URL (/mails/bandeja?buzon=3&cliente=01079&lead=7&email=a@b.com&vista=enviados).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const buzon = Number(p.get("buzon"));
    if (Number.isInteger(buzon) && buzon > 0) setBuzonSel(buzon);
    const v = p.get("vista") as Vista | null;
    const externoUrl: FiltroExterno = { cliente: p.get("cliente"), lead: p.get("lead"), email: p.get("email") };
    if (v && CARPETAS.some((c) => c.vista === v)) setVista(v);
    else if (externoUrl.cliente || externoUrl.lead || externoUrl.email) setVista("todos");
    setExterno(externoUrl);
    setListo(true);
  }, []);

  const cargarBuzones = useCallback(async () => {
    try {
      const res = await fetch("/api/mails/buzones");
      const data = await res.json();
      if (data.ok) {
        setBuzones(data.buzones as Buzon[]);
        setPuedeEnviar(!!data.puedeGestionar);
      }
    } catch {
      /* la lista de buzones es secundaria: el centro sigue funcionando */
    } finally {
      setCargandoBuzones(false);
    }
  }, []);

  useEffect(() => {
    cargarBuzones();
  }, [cargarBuzones]);

  const parametros = useCallback(
    (offset: number, limit = PAGINA) => {
      const p = new URLSearchParams({ vista, limit: String(limit), offset: String(offset) });
      if (buzonSel) p.set("buzon", String(buzonSel));
      if (soloSinLeer) p.set("sinLeer", "true");
      if (agrupar) p.set("agrupar", "si");
      if (busquedaAplicada.trim()) p.set("q", busquedaAplicada.trim());
      if (externo.cliente) p.set("cliente", externo.cliente);
      if (externo.lead) p.set("lead", externo.lead);
      if (externo.email) p.set("email", externo.email);
      return p.toString();
    },
    [vista, buzonSel, soloSinLeer, agrupar, busquedaAplicada, externo]
  );

  const cargar = useCallback(
    async (silencioso = false, limit = PAGINA) => {
      // Una recarga silenciosa (la automática) no invalida la carga en curso: solo la sustituye una carga nueva.
      const id = silencioso ? consulta.current : ++consulta.current;
      if (!silencioso) {
        setCargando(true);
        setError(null);
      }
      try {
        const res = await fetch(`/api/mails/mensajes?${parametros(0, limit)}`);
        const data = await res.json();
        if (id !== consulta.current) return;
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        setMensajes(data.mensajes as MensajeLista[]);
        setTotal(data.total as number);
        setContadores(data.contadores as ContadoresMensajes);
      } catch (e) {
        if (id === consulta.current && !silencioso) setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        if (id === consulta.current && !silencioso) setCargando(false);
      }
    },
    [parametros]
  );

  useEffect(() => {
    if (listo) cargar();
  }, [listo, cargar]);

  // Actualización automática: cada minuto, solo con la pestaña a la vista, sin parpadeos.
  useSondeoVisible(
    () => {
      if (!listo) return;
      cargar(true, Math.min(200, Math.max(PAGINA, mensajes.length)));
      cargarBuzones();
    },
    REFRESCO_MS,
    listo
  );

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

  /** Acciones locales (leído, destacado, archivo, papelera). El buzón real no se toca. */
  async function accion(ids: number[], acc: string, opciones: { conHilo?: boolean; mensaje?: string } = {}) {
    try {
      const res = await fetch("/api/mails/mensajes/accion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, accion: acc, conHilo: opciones.conHilo === true }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (opciones.mensaje) toast.success(opciones.mensaje);
      await Promise.all([cargar(true, Math.min(200, Math.max(PAGINA, mensajes.length))), cargarBuzones()]);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
      return false;
    }
  }

  async function abrir(m: MensajeLista) {
    setSeleccionado(m);
    setDetalle(null);
    setHilo(null);
    setCargandoDetalle(true);
    try {
      if (agrupar && m.n_mensajes > 1) {
        const res = await fetch(`/api/mails/mensajes/${m.id}/hilo`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        const lista = data.mensajes as MensajeHilo[];
        setHilo(lista);
        // El último mensaje va abierto; el resto, plegado.
        setAbiertos(new Set([lista[lista.length - 1]?.id]));
        // Lo recibido sin leer se marca como leído, como al abrir un mensaje suelto.
        const sinLeer = lista.filter((x) => !x.leido && x.direccion === "entrada").map((x) => x.id);
        if (sinLeer.length) await accion(sinLeer, "leido");
      } else {
        const res = await fetch(`/api/mails/mensajes/${m.id}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        setDetalle(data.mensaje as MensajeDetalle);
        if (!m.leido && m.direccion === "entrada" && !m.es_rebote) {
          setMensajes((prev) => prev.map((x) => (x.id === m.id ? { ...x, leido: true, no_leidos: 0 } : x)));
          setContadores((c) => ({ ...c, sin_leer: Math.max(0, c.sin_leer - 1) }));
          setBuzones((prev) => prev.map((b) => (b.id === m.buzon_id ? { ...b, sin_leer: Math.max(0, b.sin_leer - 1) } : b)));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function accionSeleccion(acc: string, mensaje: string, sale = false) {
    if (!seleccionado) return;
    const ids = hilo ? hilo.map((x) => x.id) : [seleccionado.id];
    const ok = await accion(ids, acc, { conHilo: true, mensaje });
    if (!ok) return;
    if (sale) {
      setSeleccionado(null);
      setDetalle(null);
      setHilo(null);
    }
  }

  const buzonActual = useMemo(() => buzones.find((b) => b.id === buzonSel) || null, [buzones, buzonSel]);
  const totalSinLeerBuzones = buzones.reduce((a, b) => a + b.sin_leer, 0);
  const hayFiltroExterno = !!(externo.cliente || externo.lead || externo.email);
  const etiquetaFiltro = useMemo(() => {
    if (externo.cliente) {
      const c = mensajes.flatMap((m) => m.clientes || []).find((x) => x.codigo === externo.cliente);
      return c ? c.nombre : `cliente nº ${codigoClienteFormateado(externo.cliente)}`;
    }
    if (externo.lead) {
      const l = mensajes.flatMap((m) => m.leads || []).find((x) => String(x.id) === externo.lead);
      return l ? l.nombre : `lead #${externo.lead}`;
    }
    return externo.email || "";
  }, [externo, mensajes]);

  const enPapelera = vista === "papelera";
  const mensajeActivo = hilo ? hilo[hilo.length - 1] : detalle;
  const filaDestacada = seleccionado ? mensajes.find((m) => m.id === seleccionado.id)?.destacado ?? false : false;

  function abrirRedactar(borrador: BorradorCorreo) {
    setRedactar((r) => ({ abierto: true, n: r.n + 1, borrador }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-rose-500 to-pink-600 text-white">
            <Sms className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Centro de mails</h1>
            <p className="text-sm text-muted-foreground">{buzonActual ? buzonActual.email : "Todos los buzones"} · se actualiza solo cada minuto</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {puedeEnviar && buzones.some((b) => b.activo) && (
            <Button size="sm" className="gap-1.5" onClick={() => abrirRedactar({ ...BORRADOR_VACIO, buzonId: buzonSel })}>
              <Edit2 className="size-4" /> Redactar
            </Button>
          )}
          <Button variant="outline" size="icon" className="size-8" onClick={() => { cargar(); cargarBuzones(); }} title="Actualizar ahora">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {!cargandoBuzones && buzones.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Todavía no hay buzones. <Link href="/mails/buzones" className="font-medium text-primary underline-offset-2 hover:underline">Añade el primero</Link> para ver aquí todos sus correos.
        </div>
      )}

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="grid min-h-[65vh] gap-3 lg:grid-cols-[17rem_minmax(20rem,27rem)_1fr]">
        {/* Carpetas y buzones */}
        <div className="space-y-3">
          <div className="rounded-lg border bg-card p-1">
            {CARPETAS.map((c) => {
              const Icono = c.icono;
              const activa = vista === c.vista && !soloSinLeer;
              const n = contadores[c.contador];
              return (
                <button
                  key={c.vista}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => { setVista(c.vista); setSoloSinLeer(false); }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${activa ? "bg-muted font-medium" : ""}`}
                >
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-md bg-linear-to-br text-white ${c.color}`}>
                    <Icono className="size-3.5" />
                  </span>
                  <span className="flex-1">{c.etiqueta}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{cargando && !mensajes.length ? "…" : n.toLocaleString("es-ES")}</span>
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={soloSinLeer}
              onClick={() => { setVista("entrada"); setSoloSinLeer((v) => !(v && vista === "entrada")); }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${soloSinLeer ? "bg-muted font-medium" : ""}`}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-rose-500 to-red-600 text-white">
                <Notification className="size-3.5" />
              </span>
              <span className="flex-1">Sin leer</span>
              <span className="text-xs font-semibold tabular-nums text-primary">{contadores.sin_leer.toLocaleString("es-ES")}</span>
            </button>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <Sms className="size-3.5 text-rose-500" /> Buzones
              </p>
              {buzones.length > BUZONES_VISIBLES && (
                <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => setSeleccionarBuzonAbierto(true)}>
                  <SearchNormal1 className="size-3" /> Buscar
                </button>
              )}
            </div>
            <div className="p-1">
              <button
                type="button"
                onClick={() => setBuzonSel(null)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${buzonSel === null ? "bg-muted font-medium" : ""}`}
              >
                <span>Todos los buzones</span>
                {totalSinLeerBuzones > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{totalSinLeerBuzones}</span>}
              </button>
              {cargandoBuzones && <Skeleton className="m-2 h-6" />}
              {buzones.slice(0, BUZONES_VISIBLES).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBuzonSel(b.id === buzonSel ? null : b.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${buzonSel === b.id ? "bg-muted font-medium" : ""} ${b.activo ? "" : "opacity-60"}`}
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
              {buzones.length > BUZONES_VISIBLES && (
                <button
                  type="button"
                  onClick={() => setSeleccionarBuzonAbierto(true)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <SearchNormal1 className="size-3.5" /> Ver los {buzones.length} buzones…
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="flex flex-col rounded-lg border bg-card">
          <div className="space-y-1.5 border-b p-2">
            <div className="relative">
              <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar en asunto, remitente y contenido…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 px-0.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="size-3.5"
                checked={agrupar}
                onChange={(e) => { setAgrupar(e.target.checked); setSeleccionado(null); setDetalle(null); setHilo(null); }}
              />
              Agrupar por conversación
            </label>
          </div>
          {hayFiltroExterno && (
            <div className="flex items-center justify-between gap-2 border-b bg-cyan-500/5 px-3 py-1.5 text-xs">
              <span className="min-w-0 truncate">
                Correos de <strong className="font-semibold">{etiquetaFiltro}</strong>
              </span>
              <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setExterno({ cliente: null, lead: null, email: null })}>
                Quitar filtro
              </button>
            </div>
          )}
          <div className="max-h-[70vh] flex-1 overflow-y-auto">
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5 border-b p-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            {!cargando && mensajes.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">{busquedaAplicada ? "Ningún mensaje coincide con la búsqueda" : "No hay mensajes en esta carpeta"}</p>
            )}
            {!cargando &&
              mensajes.map((m) => {
                const sinLeer = m.no_leidos > 0;
                return (
                  <div key={m.id} className={`flex items-start gap-1 border-b hover:bg-muted/50 ${seleccionado?.id === m.id ? "bg-muted" : ""}`}>
                    <button
                      type="button"
                      title={m.destacado ? "Quitar de destacados" : "Destacar"}
                      onClick={() => accion([m.id], m.destacado ? "quitar_destacado" : "destacar", { conHilo: true })}
                      className="mt-2.5 shrink-0 pl-2 text-muted-foreground hover:text-amber-500"
                    >
                      <Star className={`size-4 ${m.destacado ? "fill-amber-400 text-amber-500" : ""}`} />
                    </button>
                    <button type="button" onClick={() => abrir(m)} className="block min-w-0 flex-1 px-2 py-2.5 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm ${sinLeer ? "font-semibold" : ""}`}>
                          {m.direccion === "salida" ? `Para: ${m.destinatarios || "—"}` : nombreOCorreo(m)}
                          {agrupar && m.n_mensajes > 1 && <span className="ml-1 text-xs font-normal text-muted-foreground">({m.n_mensajes})</span>}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{fechaCorta(m.fecha)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {sinLeer && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                        <span className={`truncate text-sm ${sinLeer ? "font-medium" : "text-muted-foreground"}`}>{m.asunto || "(sin asunto)"}</span>
                        {m.tiene_adjuntos && <Paperclip2 className="size-3.5 shrink-0 text-muted-foreground" />}
                        {m.es_rebote && <span className="shrink-0 rounded bg-red-500/10 px-1 text-[10px] font-medium text-red-600">Rebote</span>}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{m.resumen}</p>
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px]">
                        {m.leads?.length > 0 && (
                          <span className={`rounded px-1 font-medium ${COLOR_ESTADO_LEAD[m.leads[0].estado]}`} title={`Lead: ${m.leads[0].estado}`}>
                            {m.leads[0].nombre}
                          </span>
                        )}
                        {m.clientes?.length > 0 && (
                          <span className="truncate font-medium text-cyan-700 dark:text-cyan-400">
                            Cliente: {m.clientes[0].nombre}
                            {m.clientes.length > 1 ? ` (+${m.clientes.length - 1})` : ""}
                          </span>
                        )}
                        {!buzonSel && <span className="truncate text-muted-foreground/70">{m.buzon_email}</span>}
                      </div>
                    </button>
                  </div>
                );
              })}
            {!cargando && mensajes.length < total && (
              <div className="p-3 text-center">
                <Button variant="outline" size="sm" disabled={cargandoMas} onClick={mostrarMas}>
                  {cargandoMas ? "Cargando…" : `Mostrar más (${mensajes.length.toLocaleString("es-ES")} de ${total.toLocaleString("es-ES")})`}
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
          {seleccionado && !cargandoDetalle && mensajeActivo && (
            <>
              <div className="flex flex-wrap items-center gap-1 border-b px-3 py-2">
                {puedeEnviar && seleccionado.direccion === "entrada" && !mensajeActivo.es_rebote && buzones.some((b) => b.id === mensajeActivo.buzon_id && b.activo) && (
                  <Button
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={() => abrirRedactar(borradorRespuesta(hilo ? [...hilo].reverse().find((x) => x.direccion === "entrada") || mensajeActivo : mensajeActivo))}
                  >
                    <Send2 className="size-3.5" /> Responder
                  </Button>
                )}
                {puedeEnviar && !mensajeActivo.es_rebote && buzones.some((b) => b.id === mensajeActivo.buzon_id && b.activo) && (
                  <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => abrirRedactar(borradorReenvio(mensajeActivo))}>
                    <Forward className="size-3.5" /> Reenviar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1"
                  title="Copiar dirección del remitente"
                  onClick={() => copiarAlPortapapeles(mensajeActivo.remitente, "Correo")}
                >
                  <Copy className="size-3.5" /> Copiar correo
                </Button>
                {!enPapelera && (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => accionSeleccion("no_leido", "Marcado como no leído")}>
                      <Eye className="size-3.5" /> No leído
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1"
                      onClick={() => accionSeleccion(filaDestacada ? "quitar_destacado" : "destacar", filaDestacada ? "Quitado de destacados" : "Destacado")}
                    >
                      <Star className={`size-3.5 ${filaDestacada ? "fill-amber-400 text-amber-500" : ""}`} /> {filaDestacada ? "Quitar destacado" : "Destacar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1"
                      onClick={() => accionSeleccion(vista === "archivo" ? "desarchivar" : "archivar", vista === "archivo" ? "Devuelto a la bandeja" : "Archivado", true)}
                    >
                      <Folder2 className="size-3.5" /> {vista === "archivo" ? "Desarchivar" : "Archivar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-destructive hover:text-destructive"
                      onClick={() => accionSeleccion("papelera", "Enviado a la papelera (se puede restaurar)", true)}
                    >
                      <Trash className="size-3.5" /> Borrar
                    </Button>
                  </>
                )}
                {enPapelera && (
                  <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => accionSeleccion("restaurar", "Restaurado", true)}>
                    <RotateLeft className="size-3.5" /> Restaurar
                  </Button>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">Solo cambia en el app; el buzón no se toca</span>
              </div>

              {/* Conversación */}
              {hilo && (
                <div className="flex-1 overflow-y-auto">
                  <div className="border-b p-4">
                    <h2 className="text-base font-semibold">{hilo[0]?.asunto || "(sin asunto)"}</h2>
                    <p className="text-xs text-muted-foreground">{hilo.length} mensajes en la conversación</p>
                  </div>
                  {hilo.map((x) => {
                    const abierto = abiertos.has(x.id);
                    return (
                      <div key={x.id} className="border-b">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left hover:bg-muted/40"
                          onClick={() =>
                            setAbiertos((prev) => {
                              const n = new Set(prev);
                              if (n.has(x.id)) n.delete(x.id);
                              else n.add(x.id);
                              return n;
                            })
                          }
                        >
                          <span className="min-w-0 truncate text-sm">
                            <span className={`mr-2 rounded px-1 text-[10px] font-medium ${x.direccion === "salida" ? "bg-blue-500/10 text-blue-600" : "bg-green-500/10 text-green-600"}`}>
                              {x.direccion === "salida" ? "Enviado" : "Recibido"}
                            </span>
                            {x.direccion === "salida" ? `Para ${x.destinatarios}` : x.remitente_nombre || x.remitente}
                            {x.adjuntos.length > 0 && <Paperclip2 className="ml-1.5 inline size-3.5 text-muted-foreground" />}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{fechaLarga(x.fecha)}</span>
                        </button>
                        {abierto && (
                          <div>
                            <div className="space-y-0.5 px-4 pb-1 text-xs text-muted-foreground">
                              <p>De: {x.remitente_nombre ? `${x.remitente_nombre} <${x.remitente}>` : x.remitente}</p>
                              <p>
                                Para: {x.destinatarios || "—"}
                                {x.cc ? ` · CC: ${x.cc}` : ""}
                              </p>
                              {x.enviado_por && <p>Enviado desde el app por {x.enviado_por}</p>}
                              <LinksAdjuntos adjuntos={x.adjuntos} />
                            </div>
                            <CuerpoMensaje m={x} altura="h-[45vh]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mensaje suelto */}
              {detalle && (
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
                    {detalle.en_respuesta_a && (
                      <p className="text-xs text-muted-foreground">
                        En respuesta a: <span className="font-medium text-foreground">{detalle.en_respuesta_a.asunto || "(sin asunto)"}</span>
                        {detalle.en_respuesta_a.fecha ? ` (${fechaLarga(detalle.en_respuesta_a.fecha)})` : ""}
                      </p>
                    )}
                    {detalle.leads?.length > 0 && (
                      <p className="flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="text-muted-foreground">Lead: </span>
                        {detalle.leads.map((l) => (
                          <Link key={l.id} href={`/mails/leads/${l.id}`} className={`rounded px-1.5 py-0.5 text-xs font-medium hover:underline ${COLOR_ESTADO_LEAD[l.estado]}`}>
                            {l.nombre} · {l.estado}
                          </Link>
                        ))}
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={() => setExterno({ cliente: null, lead: String(detalle.leads[0].id), email: null })}
                        >
                          Ver sus correos
                        </button>
                      </p>
                    )}
                    {detalle.clientes?.length > 0 && (
                      <p className="flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="text-muted-foreground">Cliente: </span>
                        {detalle.clientes.map((c) => (
                          <span key={c.codigo} className="inline-flex items-center gap-1.5 rounded bg-cyan-500/10 px-1.5 py-0.5 text-xs">
                            <Link
                              href={`/clientes?buscar=${encodeURIComponent(c.email || c.nombre)}`}
                              target="_blank"
                              className="font-medium text-cyan-700 hover:underline dark:text-cyan-400"
                              title="Abrir en Clientes"
                            >
                              {c.nombre} · nº {codigoClienteFormateado(c.codigo)}
                            </Link>
                            {externo.cliente !== c.codigo && (
                              <button
                                type="button"
                                className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                                onClick={() => setExterno({ cliente: c.codigo, lead: null, email: null })}
                              >
                                Ver sus correos
                              </button>
                            )}
                          </span>
                        ))}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {fechaLarga(detalle.fecha)} · Buzón {detalle.buzon_email} ·{" "}
                      {detalle.carpeta === "__APP__" ? "Enviado desde el app" : detalle.carpeta === "__N8N__" ? "Enviado por n8n" : detalle.carpeta}
                      {detalle.enviado_por && detalle.carpeta !== "__N8N__" ? ` por ${detalle.enviado_por}` : ""}
                    </p>
                    <LinksAdjuntos adjuntos={detalle.adjuntos} />
                  </div>
                  <CuerpoMensaje m={detalle} altura="h-[60vh] flex-1" />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {puedeEnviar && (
        <RedactarDialog
          key={redactar.n}
          buzones={buzones}
          borrador={redactar.borrador}
          open={redactar.abierto}
          onOpenChange={(o) => setRedactar((r) => ({ ...r, abierto: o }))}
          onEnviado={() => { cargar(); cargarBuzones(); }}
        />
      )}

      <SeleccionarBuzonDialog buzones={buzones} open={seleccionarBuzonAbierto} onOpenChange={setSeleccionarBuzonAbierto} onElegir={setBuzonSel} />
    </div>
  );
}
