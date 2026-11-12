"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Call, Refresh2, SearchNormal1, ArrowLeft2, ArrowRight2, DocumentText, Clock } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSoftphone } from "../softphone";
import { DetalleLlamada, ETIQUETA_ESTADO, FilaLlamada, ListadoLlamadas, duracionTexto, tiempoTotalTexto } from "@/lib/llamadas";

const POR_PAGINA = 25;
const CLASE_SELECT = "h-9 rounded-md border bg-background px-2 text-sm";

const COLOR_ESTADO: Record<string, string> = {
  completada: "bg-green-500/10 text-green-700 dark:text-green-400",
  contestada: "bg-green-500/10 text-green-700 dark:text-green-400",
  iniciada: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  no_contesta: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ocupado: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  fallida: "bg-red-500/10 text-red-700 dark:text-red-400",
};

/** Número marcable: acepta espacios y guiones; un móvil/fijo español de 9 cifras se completa con +34; «00…» pasa a «+…». */
function numeroMarcable(texto: string): string {
  const limpio = texto.replace(/[^\d+]/g, "");
  if (limpio.startsWith("+")) return limpio;
  if (limpio.startsWith("00")) return "+" + limpio.slice(2);
  return /^[6789]\d{8}$/.test(limpio) ? "+34" + limpio : limpio;
}

function fechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
}

function Insignia({ texto, clase }: { texto: string; clase: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", clase)}>{texto}</span>;
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

function DetalleDialog({ id, busca, onCerrar }: { id: string; busca: string; onCerrar: () => void }) {
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
  const trabajando = !!det && !hayTexto && faseTranscripcion !== "error" && faseTranscripcion !== "sin_voz" && recarga < 45 && (faseTranscripcion === "procesando" || ["iniciada", "contestada"].includes(det.estado) || (!det.grabacion_url && det.estado === "completada"));
  useEffect(() => {
    if (!trabajando) return;
    const t = setInterval(() => setRecarga((n) => n + 1), 4000);
    return () => clearInterval(t);
  }, [trabajando]);

  const turnos = det?.transcripcion_json && det.transcripcion_json.length > 0 ? det.transcripcion_json : null;
  const esCliente = (h?: string) => /cliente|customer|user/i.test(h || "");

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="flex items-center gap-2"><Call className="size-5 text-primary" /> Llamada {det ? `· ${fechaHora(det.inicio)}` : ""}</DialogTitle>
        <DialogDescription className="sr-only">Datos de la llamada y su transcripción</DialogDescription>
        {cargando && <div className="space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-24 w-full" /></div>}
        {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        {det && (
          <div className="space-y-4">
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 rounded-xl border p-3 text-sm">
              <dt className="text-muted-foreground">Origen</dt><dd>{det.origen === "ia" ? "Agente de IA" : "Persona"} · {det.direccion === "entrante" ? "Entrante" : "Saliente"} · {det.proveedor}</dd>
              <dt className="text-muted-foreground">{det.origen === "ia" ? "Agente" : "Usuario"}</dt><dd>{det.usuario || "—"}</dd>
              <dt className="text-muted-foreground">Cliente</dt><dd>{det.cliente_nombre || "—"}{det.resguardo ? ` · resguardo ${det.resguardo}` : ""}</dd>
              <dt className="text-muted-foreground">Teléfono</dt><dd>{det.telefono || "—"}</dd>
              <dt className="text-muted-foreground">Duración</dt><dd>{duracionTexto(det.duracion_seg)}</dd>
              <dt className="text-muted-foreground">Estado</dt><dd>{ETIQUETA_ESTADO[det.estado] || det.estado}{det.sentimiento ? ` · sentimiento ${det.sentimiento}` : ""}</dd>
            </dl>
            {det.grabacion_url && (
              <div>
                <h4 className="mb-1 text-sm font-semibold text-primary">Grabación</h4>
                <audio controls preload="none" src={/^https?:/i.test(det.grabacion_url) ? det.grabacion_url : `/api/llamadas/${det.id}/audio`} className="w-full" />
              </div>
            )}
            {det.resumen && (
              <div>
                <h4 className="mb-1 text-sm font-semibold text-primary">Resumen</h4>
                <p className="rounded-xl border bg-muted/30 p-3 text-sm">{det.resumen}</p>
              </div>
            )}
            <div>
              <h4 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary"><DocumentText className="size-4" /> Transcripción</h4>
              {turnos ? (
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
      </DialogContent>
    </Dialog>
  );
}

export default function LlamadasPage() {
  const softphone = useSoftphone();
  const [numeroPrueba, setNumeroPrueba] = useState("");
  const [datos, setDatos] = useState<ListadoLlamadas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [usuario, setUsuario] = useState("");
  const [origen, setOrigen] = useState("");
  const [direccion, setDireccion] = useState("");
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [minDur, setMinDur] = useState("");
  const [soloTranscripcion, setSoloTranscripcion] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState<string | null>(null);
  const reqId = useRef(0);

  const cargar = useCallback(async (pag: number) => {
    const mio = ++reqId.current;
    setCargando(true); setError(null);
    try {
      const p = new URLSearchParams({ limit: String(POR_PAGINA), offset: String((pag - 1) * POR_PAGINA) });
      if (q.trim()) p.set("q", q.trim());
      if (usuario) p.set("usuario", usuario);
      if (origen) p.set("origen", origen);
      if (direccion) p.set("direccion", direccion);
      if (estado) p.set("estado", estado);
      if (desde) p.set("desde", desde);
      if (hasta) p.set("hasta", hasta);
      if (Number(minDur) > 0) p.set("duracionMin", String(Math.round(Number(minDur) * 60)));
      if (soloTranscripcion) p.set("conTranscripcion", "true");
      const r = await fetch(`/api/llamadas?${p.toString()}`, { cache: "no-store" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      if (mio === reqId.current) setDatos(d as ListadoLlamadas);
    } catch (e) {
      if (mio === reqId.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (mio === reqId.current) setCargando(false);
    }
  }, [q, usuario, origen, direccion, estado, desde, hasta, minDur, soloTranscripcion]);

  useEffect(() => {
    const t = setTimeout(() => { setPagina(1); cargar(1); }, 350);
    return () => clearTimeout(t);
  }, [cargar]);

  // La lista se actualiza sola: cada 8 s con la pestaña visible, y al colgar una llamada.
  const ocupadoLlamada = softphone.ocupado;
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") cargar(pagina); }, 8000);
    return () => clearInterval(t);
  }, [cargar, pagina]);
  useEffect(() => {
    if (ocupadoLlamada) return;
    const t = setTimeout(() => cargar(pagina), 1500);
    return () => clearTimeout(t);
  }, [ocupadoLlamada, cargar, pagina]);

  const hayFiltros = !!(q || usuario || origen || direccion || estado || desde || hasta || minDur || soloTranscripcion);
  const limpiar = () => { setQ(""); setUsuario(""); setOrigen(""); setDireccion(""); setEstado(""); setDesde(""); setHasta(""); setMinDur(""); setSoloTranscripcion(false); };
  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const irA = (p: number) => { setPagina(p); cargar(p); };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Call className="size-5" /></span>
          <div>
            <h1 className="text-lg font-semibold">Llamadas</h1>
            <p className="text-sm text-muted-foreground">Llamadas de personas y de agentes de IA, con su transcripción. Solo administradores.</p>
          </div>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={() => cargar(pagina)} title="Actualizar"><Refresh2 className={cn("size-4", cargando && "animate-spin")} /></Button>
      </div>

      {softphone.disponible && (
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Llamada de prueba (si es de España, basta con el número; fuera de España, con prefijo +…)</label>
            <Input className="w-64" placeholder="600 111 222" value={numeroPrueba} onChange={(e) => setNumeroPrueba(e.target.value)} />
          </div>
          <Button size="sm" disabled={softphone.ocupado || !/^\+\d{8,15}$/.test(numeroMarcable(numeroPrueba))} onClick={() => void softphone.llamar({ telefono: numeroMarcable(numeroPrueba) })}>
            <Call className="size-4" /> Llamar
          </Button>
          <span className="text-xs text-muted-foreground">Sale con el número de la empresa y se graba.</span>
        </div>
      )}

      {datos && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { t: "Hoy", v: datos.resumen.hoy },
            { t: "Últimos 7 días", v: datos.resumen.semana },
            { t: "Tiempo (7 días)", v: tiempoTotalTexto(datos.resumen.segundos_semana) },
            { t: "Total registradas", v: datos.resumen.total_global },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border bg-card p-3 shadow-sm">
              <div className="text-xs text-muted-foreground">{c.t}</div>
              <div className="text-xl font-semibold tabular-nums">{c.v}</div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
        <div className="relative">
          <SearchNormal1 className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar en la transcripción, teléfono, resguardo…" className="w-72 pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Usuario / agente</label>
          <select className={cn(CLASE_SELECT, "w-52")} value={usuario} onChange={(e) => setUsuario(e.target.value)} aria-label="Usuario">
            <option value="">Todos</option>
            {datos?.usuarios.map((u) => <option key={u.usuario} value={u.usuario}>{u.usuario} ({u.n})</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Origen</label>
          <select className={CLASE_SELECT} value={origen} onChange={(e) => setOrigen(e.target.value)} aria-label="Origen">
            <option value="">Todos</option><option value="persona">Personas</option><option value="ia">Agentes de IA</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Dirección</label>
          <select className={CLASE_SELECT} value={direccion} onChange={(e) => setDireccion(e.target.value)} aria-label="Dirección">
            <option value="">Todas</option><option value="saliente">Salientes</option><option value="entrante">Entrantes</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Estado</label>
          <select className={CLASE_SELECT} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
            <option value="">Todos</option>
            {datos?.estados.map((e) => <option key={e.estado} value={e.estado}>{ETIQUETA_ESTADO[e.estado] || e.estado} ({e.n})</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
          <Input type="date" className="w-36" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
          <Input type="date" className="w-36" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Duración mín. (min)</label>
          <Input type="number" min="0" step="1" className="w-28" value={minDur} onChange={(e) => setMinDur(e.target.value)} />
        </div>
        <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={soloTranscripcion} onChange={(e) => setSoloTranscripcion(e.target.checked)} /> Solo con transcripción</label>
        {hayFiltros && <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={limpiar}>Limpiar filtros</Button>}
        {datos && <span className="ml-auto inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{total.toLocaleString("es-ES")} llamadas</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Fecha / hora</TableHead>
              <TableHead>Usuario / agente</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead className="whitespace-nowrap">Duración</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Transcripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && !datos && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {datos && datos.registros.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">{hayFiltros ? "Ninguna llamada con esos filtros" : "Todavía no hay llamadas registradas"}</TableCell></TableRow>
            )}
            {datos?.registros.map((f: FilaLlamada) => (
              <TableRow key={f.id} className="cursor-pointer align-top hover:bg-muted/40" onClick={() => setAbierta(f.id)}>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{fechaHora(f.inicio)}</TableCell>
                <TableCell className="text-sm">
                  <div>{f.usuario || "—"}</div>
                  <Insignia texto={f.origen === "ia" ? "IA" : "Persona"} clase={f.origen === "ia" ? "bg-violet-500/10 text-violet-700 dark:text-violet-400" : "bg-sky-500/10 text-sky-700 dark:text-sky-400"} />
                </TableCell>
                <TableCell className="text-sm">
                  <div>{f.cliente_nombre || "—"}</div>
                  {f.resguardo && <div className="text-xs text-muted-foreground">Resguardo {f.resguardo}</div>}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">{f.telefono || "—"}</TableCell>
                <TableCell className="text-sm">{f.direccion === "entrante" ? "Entrante" : "Saliente"}</TableCell>
                <TableCell className="text-sm whitespace-nowrap"><span className="inline-flex items-center gap-1"><Clock className="size-3.5 text-muted-foreground" />{duracionTexto(f.duracion_seg)}</span></TableCell>
                <TableCell><Insignia texto={ETIQUETA_ESTADO[f.estado] || f.estado} clase={COLOR_ESTADO[f.estado] || "bg-slate-500/10 text-slate-600 dark:text-slate-300"} /></TableCell>
                <TableCell className="max-w-xs text-sm">
                  {f.tiene_transcripcion ? <span className="line-clamp-2 text-muted-foreground">{f.resumen || "Ver transcripción"}</span> : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {datos && paginas > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => irA(pagina - 1)}><ArrowLeft2 className="size-3.5" /> Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {pagina} de {paginas}</span>
          <Button variant="outline" size="sm" disabled={pagina >= paginas} onClick={() => irA(pagina + 1)}>Siguiente <ArrowRight2 className="size-3.5" /></Button>
        </div>
      )}

      {abierta && <DetalleDialog key={abierta} id={abierta} busca={q} onCerrar={() => setAbierta(null)} />}
    </div>
  );
}
