"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star1, Refresh2, SearchNormal1, Like1, Dislike, Warning2, Message, ArrowLeft2, ArrowRight2, DocumentText } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ETIQUETA_RESPUESTA, ETIQUETA_VEREDICTO, FilaResena, ReporteResenas, RespuestaEncuesta, VeredictoEncuesta,
} from "@/lib/resenas";
import { cn } from "@/lib/utils";

const POR_PAGINA = 15;
type Pestana = "respuestas" | "malas" | "formulario";

const COLOR_RESPUESTA: Record<RespuestaEncuesta, string> = {
  muy_bueno: "bg-green-500/10 text-green-700 dark:text-green-400",
  bueno: "bg-lime-500/10 text-lime-700 dark:text-lime-400",
  malo: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  muy_malo: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const COLOR_VEREDICTO: Record<VeredictoEncuesta, string> = {
  positiva: "bg-green-500/10 text-green-700 dark:text-green-400",
  negativa: "bg-red-500/10 text-red-700 dark:text-red-400",
  incompleta: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

function fechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
}

function Respuesta({ valor }: { valor: RespuestaEncuesta | null }) {
  if (!valor) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", COLOR_RESPUESTA[valor])}>{ETIQUETA_RESPUESTA[valor]}</span>;
}

function Fila({ f }: { f: FilaResena }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-sm">{fechaHora(f.ultima)}</TableCell>
      <TableCell className="max-w-48 truncate text-sm font-medium" title={f.cliente_nombre || undefined}>{f.cliente_nombre || "—"}</TableCell>
      <TableCell className="whitespace-nowrap text-sm">{f.telefono || "—"}</TableCell>
      <TableCell className="text-sm">{f.servicio || "—"}</TableCell>
      <TableCell className="whitespace-nowrap text-sm">{f.id_registro || "—"}</TableCell>
      <TableCell><Respuesta valor={f.p1} /></TableCell>
      <TableCell><Respuesta valor={f.p2} /></TableCell>
      <TableCell>
        <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", COLOR_VEREDICTO[f.veredicto])}>{ETIQUETA_VEREDICTO[f.veredicto]}</span>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm capitalize">{f.destino || "—"}</TableCell>
    </TableRow>
  );
}

export default function ReporteResenasPage() {
  const [datos, setDatos] = useState<ReporteResenas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<Pestana>("respuestas");
  const [veredicto, setVeredicto] = useState<"" | VeredictoEncuesta>("");
  const [servicio, setServicio] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const veredictoEfectivo: "" | VeredictoEncuesta = pestana === "malas" ? "negativa" : veredicto;

  useEffect(() => {
    setPagina(1);
  }, [veredictoEfectivo, servicio, desde, hasta, busquedaAplicada, pestana]);

  const cargar = useCallback(async () => {
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const p = new URLSearchParams({ limit: String(POR_PAGINA), offset: String((pagina - 1) * POR_PAGINA) });
      if (veredictoEfectivo) p.set("veredicto", veredictoEfectivo);
      if (servicio) p.set("servicio", servicio);
      if (desde) p.set("desde", desde);
      if (hasta) p.set("hasta", hasta);
      if (busquedaAplicada.trim()) p.set("q", busquedaAplicada.trim());
      const res = await fetch(`/api/resenas?${p.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as ReporteResenas & { error?: string };
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDatos(data);
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [pagina, veredictoEfectivo, servicio, desde, hasta, busquedaAplicada]);

  useEffect(() => {
    if (pestana !== "formulario") cargar();
  }, [cargar, pestana]);

  const total = datos?.totalLista ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pctPositivas = datos && datos.total > 0 ? Math.round((datos.positivas / datos.total) * 100) : 0;
  const hayFiltros = !!(veredicto || servicio || desde || hasta || busquedaAplicada);

  const kpi = (titulo: string, valor: string, sub: string, icono: React.ReactNode, color: string, activo?: boolean, onClick?: () => void) => (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      aria-pressed={activo}
      className={cn("flex items-center gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors", onClick ? "hover:bg-muted/40" : "cursor-default", activo && "ring-2 ring-primary/50")}
    >
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", color)}>{icono}</span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-muted-foreground">{titulo}</span>
        <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !datos ? "…" : valor}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{sub}</span>
      </span>
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Star1 className="size-6 shrink-0 text-amber-500 dark:text-yellow-400" />
          <div>
            <h1 className="text-lg leading-tight font-semibold">Reporte de reseñas</h1>
            <p className="text-sm text-muted-foreground">Lo que responden los clientes en la encuesta de WhatsApp, las reseñas malas y el formulario de satisfacción</p>
          </div>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar" disabled={pestana === "formulario"}>
          <Refresh2 className={cn("size-4", cargando && "animate-spin")} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {kpi("Encuestas respondidas", String(datos?.total ?? 0), "conversaciones con respuesta", <Message className="size-4" />, "bg-sky-500/10 text-sky-600 dark:text-sky-400", pestana === "respuestas" && !veredicto, () => { setPestana("respuestas"); setVeredicto(""); })}
        {kpi("Positivas", String(datos?.positivas ?? 0), `${pctPositivas}% del total`, <Like1 className="size-4" />, "bg-green-500/10 text-green-600 dark:text-green-400", pestana === "respuestas" && veredicto === "positiva", () => { setPestana("respuestas"); setVeredicto(veredicto === "positiva" ? "" : "positiva"); })}
        {kpi("Reseñas malas", String(datos?.negativas ?? 0), "alguna respuesta mala o muy mala", <Dislike className="size-4" />, "bg-red-500/10 text-red-600 dark:text-red-400", pestana === "malas", () => { setPestana("malas"); setVeredicto(""); })}
        {kpi("Sin terminar", String(datos?.incompletas ?? 0), "falta alguna respuesta", <Warning2 className="size-4" />, "bg-amber-500/10 text-amber-600 dark:text-amber-400", pestana === "respuestas" && veredicto === "incompleta", () => { setPestana("respuestas"); setVeredicto(veredicto === "incompleta" ? "" : "incompleta"); })}
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b" role="tablist">
        {([["respuestas", "Respuestas de la encuesta"], ["malas", `Reseñas malas${datos ? ` (${datos.negativas})` : ""}`], ["formulario", "Formulario de satisfacción"]] as const).map(([k, t]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={pestana === k}
            onClick={() => { setPestana(k); if (k !== "respuestas") setVeredicto(""); }}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm", pestana === k ? "border-amber-500 font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t}
          </button>
        ))}
      </div>

      {pestana !== "formulario" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar cliente, teléfono o resguardo…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <Select value={servicio || "todos"} onValueChange={(v) => setServicio(!v || v === "todos" ? "" : v)}>
              <SelectTrigger className="h-8 w-52"><SelectValue>{(v: string) => (v === "todos" ? "Todos los servicios" : v)}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los servicios</SelectItem>
                {(datos?.servicios ?? []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Desde <Input type="date" className="h-8 w-36" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Hasta <Input type="date" className="h-8 w-36" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </label>
            {hayFiltros && (
              <Button variant="ghost" size="sm" className="h-8" onClick={() => { setVeredicto(""); setServicio(""); setDesde(""); setHasta(""); setBusqueda(""); }}>
                Quitar filtros
              </Button>
            )}
          </div>

          {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Resguardo</TableHead>
                  <TableHead>Pregunta 1</TableHead>
                  <TableHead>Pregunta 2</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Destino</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 9 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))}
                {!cargando && (datos?.filas.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      {pestana === "malas" && !hayFiltros ? "No hay reseñas malas todavía." : hayFiltros ? "Ninguna encuesta coincide con los filtros" : "Todavía no hay respuestas de la encuesta."}
                    </TableCell>
                  </TableRow>
                )}
                {!cargando && datos?.filas.map((f) => <Fila key={f.conversation_id} f={f} />)}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
              <span className="text-xs font-semibold text-muted-foreground">{total.toLocaleString("es-ES")} encuesta{total === 1 ? "" : "s"}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}><ArrowLeft2 className="size-3.5" /></Button>
                <span className="px-1 text-xs whitespace-nowrap text-muted-foreground">Página {pagina} de {totalPaginas}</span>
                <Button variant="outline" size="icon-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}><ArrowRight2 className="size-3.5" /></Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Positiva: las dos respuestas son buenas o muy buenas (el cliente recibe el enlace de reseña). Mala reseña: alguna respuesta es mala o muy mala (recibe el formulario de satisfacción).
          </p>
        </>
      )}

      {pestana === "formulario" && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-14 text-center">
          <DocumentText className="size-8 text-amber-500 dark:text-yellow-400" />
          <p className="text-sm font-medium">Formulario de satisfacción</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Aquí aparecerán las respuestas del formulario que reciben los clientes que valoran mal la atención, junto a su reseña mala. Todavía no está conectado.
          </p>
        </div>
      )}
    </div>
  );
}
