"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Refresh2, SearchNormal1, TickCircle, CloseCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Puntos { total: number; ok: number; porcentaje: number; autoOk: number; autoTotal: number; manOk: number; manTotal: number }
interface FilaWeb extends Puntos {
  id: number; nombre: string; tipo: string; dominio: string | null; analizada: boolean; analizadoEn: string | null;
  puntuacionSeo: number | null; gsc: boolean | null; ga: boolean | null; blog: boolean | null; manualesMarcados: number;
}
interface CheckAuto { clave: string; etiqueta: string; ok: boolean; gravedad: "alta" | "media" | "baja" | null; detalle: string | null; noVerificable?: boolean }
interface Analisis { ok: boolean; motivo?: string; dominio?: string; puntuacionSeo: number | null; checks: CheckAuto[]; ultimaEntradaBlog: string | null; analizadoEn: string }
interface CheckManual { grupo: string; clave: string; etiqueta: string; consejo: string }
type EstadoManual = "si" | "no" | "na";
interface Detalle {
  web: { id: number; nombre: string; tipo: string; dominio: string | null; url: string | null };
  analisis: Analisis | null;
  manuales: Record<string, { estado: EstadoManual; nota: string | null; usuario: string | null; actualizadoEn: string }>;
  catalogo: CheckManual[];
  puntuacion: Puntos;
}
type Tri = "todas" | "si" | "no";
interface Lote { activo: boolean; hechas: number; total: number }

const color = (p: number) => (p >= 75 ? "bg-emerald-500" : p >= 45 ? "bg-amber-500" : "bg-red-500");
const fechaCorta = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—");

function Grupo({ etiqueta, valor, onCambio }: { etiqueta: string; valor: Tri; onCambio: (v: Tri) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{etiqueta}</span>
      <div className="flex overflow-hidden rounded-md border">
        {([["todas", "Todas"], ["si", "Con"], ["no", "Sin"]] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => onCambio(v)} className={cn("px-2 py-1 transition", valor === v ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{t}</button>
        ))}
      </div>
    </div>
  );
}

function Marca({ v }: { v: boolean | null }) {
  if (v === null) return <span className="text-muted-foreground">—</span>;
  return v ? <TickCircle className="mx-auto size-4 text-emerald-600" /> : <CloseCircle className="mx-auto size-4 text-red-500" />;
}

function Barra({ p, className }: { p: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className={cn("h-full", color(p))} style={{ width: `${p}%` }} /></div>
      <span className="w-9 text-right text-xs font-semibold tabular-nums">{p}%</span>
    </div>
  );
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "Error");
  return j as T;
}

export default function PanelSeoPage() {
  const [filas, setFilas] = useState<FilaWeb[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fGsc, setFGsc] = useState<Tri>("todas");
  const [fGa, setFGa] = useState<Tri>("todas");
  const [fBlog, setFBlog] = useState<Tri>("todas");
  const [fNivel, setFNivel] = useState<"todos" | "bajo" | "medio" | "alto" | "sin">("todos");
  const [lote, setLote] = useState<Lote | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const sondeo = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    try {
      const d = await api<{ webs: FilaWeb[]; lote: Lote }>("/api/webs-kelatos/seo/resumen");
      setFilas(d.webs);
      setLote(d.lote);
      setError(null);
      return d.lote.activo;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      return false;
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);
  useEffect(() => () => { if (sondeo.current) clearInterval(sondeo.current); }, []);

  async function analizarTodas() {
    try {
      await api("/api/webs-kelatos/seo/analizar-todas", { method: "POST" });
      toast.success("Analizando todas las webs en segundo plano (unos 3 s por web)");
      if (sondeo.current) clearInterval(sondeo.current);
      sondeo.current = setInterval(async () => {
        const sigue = await cargar();
        if (!sigue && sondeo.current) { clearInterval(sondeo.current); sondeo.current = null; }
      }, 5000);
      void cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo lanzar el análisis");
    }
  }

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    const tri = (v: boolean | null, f: Tri) => f === "todas" || (f === "si" ? v === true : v === false);
    return (filas ?? []).filter((f) =>
      (!t || f.nombre.toLowerCase().includes(t) || (f.dominio ?? "").toLowerCase().includes(t)) &&
      tri(f.gsc, fGsc) && tri(f.ga, fGa) && tri(f.blog, fBlog) &&
      (fNivel === "todos" || (fNivel === "sin" ? !f.analizada : f.analizada && (fNivel === "bajo" ? f.porcentaje < 45 : fNivel === "medio" ? f.porcentaje >= 45 && f.porcentaje < 75 : f.porcentaje >= 75)))
    );
  }, [filas, q, fGsc, fGa, fBlog, fNivel]);
  const hayFiltros = fGsc !== "todas" || fGa !== "todas" || fBlog !== "todas" || fNivel !== "todos" || q.trim() !== "";

  const resumen = useMemo(() => {
    const a = (filas ?? []).filter((f) => f.analizada);
    return {
      analizadas: a.length,
      total: filas?.length ?? 0,
      sinGsc: a.filter((f) => f.gsc === false).length,
      sinGa: a.filter((f) => f.ga === false).length,
      sinBlog: a.filter((f) => f.blog === false).length,
      media: a.length ? Math.round(a.reduce((n, f) => n + f.porcentaje, 0) / a.length) : 0,
    };
  }, [filas]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Panel SEO de las webs</h1>
          <p className="text-sm text-muted-foreground">Por cada web: qué está bien y qué falta para salir mejor en Google. Lo automático lo comprueba el sistema; lo demás (fichas, directorios, redes) lo marca una persona.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar web o dominio…" className="h-8 pl-7 text-xs" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" className="h-8 gap-1.5" onClick={analizarTodas} disabled={lote?.activo}>
            <Refresh2 className={cn("size-4", lote?.activo && "animate-spin")} /> {lote?.activo ? `Analizando… ${lote.hechas}/${lote.total}` : "Analizar todas"}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      {filas && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { t: "Webs analizadas", v: `${resumen.analizadas} de ${resumen.total}`, s: resumen.analizadas === 0 ? "Pulsa «Analizar todas»" : "" },
            { t: "Cumplimiento medio", v: `${resumen.media}%`, s: "de las comprobaciones" },
            { t: "Sin Search Console", v: String(resumen.sinGsc), s: "webs sin dar de alta" },
            { t: "Sin Analytics", v: String(resumen.sinGa), s: "webs sin conectar" },
            { t: "Blog sin actualizar", v: String(resumen.sinBlog), s: "más de 60 días o sin blog" },
          ].map((k) => (
            <div key={k.t} className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">{k.t}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{k.v}</p>
              <p className="text-[11px] text-muted-foreground">{k.s}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <Grupo etiqueta="Search Console" valor={fGsc} onCambio={setFGsc} />
        <Grupo etiqueta="Analytics" valor={fGa} onCambio={setFGa} />
        <Grupo etiqueta="Blog al día" valor={fBlog} onCambio={setFBlog} />
        <label className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Cumplimiento</span>
          <select className="h-7 rounded-md border bg-background px-2" value={fNivel} onChange={(e) => setFNivel(e.target.value as typeof fNivel)}>
            <option value="todos">Todos</option>
            <option value="bajo">Bajo (menos de 45 %)</option>
            <option value="medio">Medio (45–74 %)</option>
            <option value="alto">Alto (75 % o más)</option>
            <option value="sin">Sin analizar</option>
          </select>
        </label>
        {hayFiltros && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setQ(""); setFGsc("todas"); setFGa("todas"); setFBlog("todas"); setFNivel("todos"); }}>Quitar filtros</Button>}
        <span className="ml-auto text-muted-foreground">{visibles.length} de {filas?.length ?? 0} webs</span>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Web</TableHead>
              <TableHead>Cumplimiento</TableHead>
              <TableHead className="text-center">SEO de la web</TableHead>
              <TableHead className="text-center">Search Console</TableHead>
              <TableHead className="text-center">Analytics</TableHead>
              <TableHead className="text-center">Blog al día</TableHead>
              <TableHead className="text-center">Marcado a mano</TableHead>
              <TableHead>Analizada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filas && Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)}
            {visibles.map((f) => (
              <TableRow key={f.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setAbierta(f.id)}>
                <TableCell>
                  <div className="text-sm font-medium">{f.nombre}</div>
                  <div className="text-[11px] text-muted-foreground">{f.dominio || "sin dominio"}</div>
                </TableCell>
                <TableCell>{f.total > 0 ? <Barra p={f.porcentaje} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-center text-sm tabular-nums">{f.puntuacionSeo ?? "—"}</TableCell>
                <TableCell className="text-center"><Marca v={f.gsc} /></TableCell>
                <TableCell className="text-center"><Marca v={f.ga} /></TableCell>
                <TableCell className="text-center"><Marca v={f.blog} /></TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{f.manualesMarcados}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{fechaCorta(f.analizadoEn)}</TableCell>
              </TableRow>
            ))}
            {filas && visibles.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Ninguna web coincide.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {abierta !== null && <DetalleWeb id={abierta} onCerrar={() => setAbierta(null)} onCambio={() => void cargar()} />}
    </div>
  );
}

function DetalleWeb({ id, onCerrar, onCambio }: { id: number; onCerrar: () => void; onCambio: () => void }) {
  const [d, setD] = useState<Detalle | null>(null);
  const [analizando, setAnalizando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setD(await api<Detalle>(`/api/webs-kelatos/seo/sitio/${id}`));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }, [id]);
  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);

  async function analizar() {
    setAnalizando(true);
    try {
      await api(`/api/webs-kelatos/seo/sitio/${id}/analizar`, { method: "POST" });
      await cargar();
      onCambio();
      toast.success("Web analizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo analizar");
    } finally {
      setAnalizando(false);
    }
  }

  async function marcar(clave: string, estado: EstadoManual | null) {
    try {
      await api(`/api/webs-kelatos/seo/sitio/${id}/check`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave, estado }) });
      await cargar();
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  // Lo más urgente: lo automático que falla (gravedad alta primero) y lo manual aún sin marcar o en «No».
  const pendientes = useMemo(() => {
    if (!d) return [] as { texto: string; consejo: string; peso: number }[];
    const orden = { alta: 0, media: 1, baja: 2 } as const;
    const auto = (d.analisis?.checks ?? []).filter((c) => !c.ok && !c.noVerificable).map((c) => ({ texto: c.etiqueta, consejo: c.detalle ?? "", peso: orden[c.gravedad ?? "baja"] }));
    const man = d.catalogo
      .filter((c) => d.manuales[c.clave]?.estado !== "si" && d.manuales[c.clave]?.estado !== "na")
      .map((c) => ({ texto: c.etiqueta, consejo: c.consejo, peso: d.manuales[c.clave]?.estado === "no" ? 1 : 2 }));
    return [...auto, ...man].sort((a, b) => a.peso - b.peso).slice(0, 6);
  }, [d]);

  const grupos = useMemo(() => {
    const m = new Map<string, CheckManual[]>();
    for (const c of d?.catalogo ?? []) {
      if (!m.has(c.grupo)) m.set(c.grupo, []);
      m.get(c.grupo)!.push(c);
    }
    return [...m.entries()];
  }, [d]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 py-3 pr-12">
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>{d?.web.nombre ?? "…"} <span className="text-sm font-normal text-muted-foreground">{d?.web.dominio}</span></span>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={analizar} disabled={analizando || !d?.web.dominio}>
              <Refresh2 className={cn("size-4", analizando && "animate-spin")} /> {analizando ? "Analizando…" : "Analizar ahora"}
            </Button>
          </DialogTitle>
          {d && (
            <div className="flex items-center gap-3 pt-1">
              <Barra p={d.puntuacion.porcentaje} />
              <span className="text-xs text-muted-foreground">{d.puntuacion.ok} de {d.puntuacion.total} comprobaciones cumplidas</span>
            </div>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {!d && <Skeleton className="h-40 w-full" />}
          {d && (
            <>
              {pendientes.length > 0 && (
                <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <h3 className="text-sm font-semibold">Qué hacer primero</h3>
                  <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm">
                    {pendientes.map((p) => <li key={p.texto}><span className="font-medium">{p.texto}.</span> <span className="text-muted-foreground">{p.consejo}</span></li>)}
                  </ol>
                </section>
              )}

              <section>
                <h3 className="mb-1.5 text-sm font-semibold">
                  Comprobaciones automáticas {d.analisis && <span className="text-xs font-normal text-muted-foreground">· analizada el {fechaCorta(d.analisis.analizadoEn)}</span>}
                </h3>
                {!d.analisis ? (
                  <p className="text-sm text-muted-foreground">Todavía no se ha analizado esta web: pulsa «Analizar ahora».</p>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    {d.analisis.checks.map((c) => (
                      <div key={c.clave} className="flex items-start gap-2 border-t px-3 py-1.5 first:border-t-0">
                        {c.noVerificable ? (
                          <span className="mt-0.5 w-4 shrink-0 text-center text-muted-foreground">?</span>
                        ) : c.ok ? (
                          <TickCircle className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        ) : (
                          <CloseCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                        )}
                        <div className="min-w-0 flex-1 text-sm">
                          {c.etiqueta}
                          {!c.ok && c.detalle && <p className="text-[11px] text-muted-foreground">{c.detalle}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Comprobaciones a mano <span className="text-xs font-normal text-muted-foreground">· marca lo que ya está hecho</span></h3>
                {grupos.map(([grupo, lista]) => (
                  <div key={grupo} className="overflow-hidden rounded-md border">
                    <div className="bg-muted/40 px-3 py-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{grupo}</div>
                    {lista.map((c) => {
                      const m = d.manuales[c.clave];
                      return (
                        <div key={c.clave} className="flex flex-wrap items-center gap-2 border-t px-3 py-1.5">
                          <div className="min-w-0 flex-1 text-sm">
                            {c.etiqueta}
                            {m ? <p className="text-[11px] text-muted-foreground">{m.usuario ?? ""} · {fechaCorta(m.actualizadoEn)}</p> : <p className="text-[11px] text-muted-foreground">{c.consejo}</p>}
                          </div>
                          <div className="flex shrink-0 overflow-hidden rounded-md border text-xs">
                            {(["si", "no", "na"] as const).map((e) => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => marcar(c.clave, m?.estado === e ? null : e)}
                                className={cn("px-2.5 py-1 transition", m?.estado === e ? (e === "si" ? "bg-emerald-600 text-white" : e === "no" ? "bg-red-500 text-white" : "bg-muted-foreground text-white") : "hover:bg-muted")}
                              >
                                {e === "si" ? "Sí" : e === "no" ? "No" : "No aplica"}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
