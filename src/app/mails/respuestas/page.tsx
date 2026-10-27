"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Refresh2, SearchNormal1, TickCircle, CloseCircle, Warning2, Flash, ArrowLeft2, ArrowRight2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fechaHora } from "../componentes-correo";

type Revision = "correcta" | "incorrecta" | null;

type Fila = {
  id: number;
  mensaje_id: number;
  fecha_mensaje: string | null;
  remitente: string | null;
  remitente_nombre: string | null;
  asunto: string | null;
  estado: "analizado" | "ignorado" | "error";
  decision: "Aceptado" | "Aviso" | null;
  tipo_aviso: string | null;
  intencion: string | null;
  resumen: string | null;
  motivos: string[] | null;
  numero_presupuesto: string | null;
  resguardo: string | null;
  importe: string | null;
  n_candidatos: number;
  original_estado: string | null;
  revision: Revision;
  error: string | null;
  n8n_estado: string | null;
  n8n_numero: string | null;
  n8n_motivo: string | null;
};

type Kpis = {
  total: number; analizadas: number; ignoradas: number; errores: number; aceptaria: number; avisos: number; con_original: number;
  correctas: number; incorrectas: number; comparables_n8n: number; coinciden_n8n: number;
};

type Detalle = {
  id: number; fecha_mensaje: string | null; remitente: string | null; remitente_nombre: string | null; asunto: string | null;
  estado: string; decision: string | null; tipo_aviso: string | null; intencion: string | null; motivos: string[] | null; error: string | null;
  revision: Revision; revision_nota: string | null; revisado_por: string | null;
  ia: Record<string, unknown> | null; recuperacion: Record<string, unknown> | null;
  respuesta_cliente: string | null;
  candidatos: Array<Record<string, unknown>>;
  numero_presupuesto: string | null; opcion: string | null; importe: number | string | null; resguardo: string | null;
  motivo_seleccion: string | null; problemas: string[]; explicacion: string | null;
  original: { asunto: string | null; fecha: string | null } | null;
  n8n: { estado: string; numero_presupuesto: string | null; motivo: string | null; fecha: string } | null;
};

const POR_PAGINA = 25;

const ORIGEN: Record<string, string> = {
  ORIGINAL_RECUPERADO: "Original encontrado",
  ORIGINAL_NO_ENCONTRADO: "Original no encontrado",
  SIN_REFERENCIAS_DE_RESPUESTA: "Sin referencias de hilo",
  MENSAJE_NO_APLICABLE: "No aplicable",
  SOLO_PRESUPUESTO_CITADO_SIN_ORIGINAL: "Solo presupuesto citado",
  VARIOS_ENVIOS_DE_PRESUPUESTO_REQUIEREN_REVISION: "Varios envíos",
  MENSAJES_ENCONTRADOS_SIN_FORMATO_PRESUPUESTO: "Sin formato de presupuesto",
};

const humano = (s: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) : "—");

function DecisionBadge({ f }: { f: Pick<Fila, "estado" | "decision" | "tipo_aviso"> }) {
  if (f.estado === "error") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Error</Badge>;
  if (f.estado === "ignorado") return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Ignorado</Badge>;
  if (f.decision === "Aceptado") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aceptaría</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Aviso · {humano(f.tipo_aviso)}</Badge>;
}

function Kpi({ titulo, valor, detalle }: { titulo: string; valor: string | number; detalle?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-2xl font-semibold leading-tight">{valor}</p>
      {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
    </div>
  );
}

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");

export default function RespuestasPresupuestoPage() {
  const [items, setItems] = useState<Fila[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [tipos, setTipos] = useState<Array<{ tipo_aviso: string | null; n: number }>>([]);
  const [modo, setModo] = useState("");
  const [estado, setEstado] = useState("analizado");
  const [decision, setDecision] = useState("");
  const [n8n, setN8n] = useState("");
  const [revision, setRevision] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<number | null>(null);
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    setPagina(1);
  }, [estado, decision, n8n, revision, busquedaAplicada]);

  const cargar = useCallback(async () => {
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const p = new URLSearchParams({ limit: String(POR_PAGINA), offset: String((pagina - 1) * POR_PAGINA) });
      if (estado) p.set("estado", estado);
      if (decision) p.set("decision", decision);
      if (n8n) p.set("n8n", n8n);
      if (revision) p.set("revision", revision);
      if (busquedaAplicada.trim()) p.set("q", busquedaAplicada.trim());
      const res = await fetch(`/api/mails/respuestas-presupuesto?${p}`);
      const data = await res.json();
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setItems(data.items as Fila[]);
      setKpis(data.kpis as Kpis);
      setTipos(data.tipos_aviso as Array<{ tipo_aviso: string | null; n: number }>);
      setModo(data.modo as string);
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [pagina, estado, decision, n8n, revision, busquedaAplicada]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const total = kpis?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const valoradas = (kpis?.correctas ?? 0) + (kpis?.incorrectas ?? 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-indigo-600 text-white">
            <Flash className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Respuestas a presupuestos</h1>
            <p className="text-xs text-muted-foreground">
              Lo que la automatización entendió de cada respuesta de cliente.{" "}
              {modo === "sombra" ? "Modo sombra: solo registra, no acepta ni avisa." : modo === "activo" ? "Modo activo: acepta los presupuestos y crea los avisos de verdad (solo respuestas posteriores a la activación)." : modo ? `Modo: ${modo}.` : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={cargando}>
          <Refresh2 className={`mr-1.5 size-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {kpis && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          <Kpi titulo="Respuestas analizadas" valor={kpis.analizadas} detalle={`${kpis.ignoradas} ignoradas · ${kpis.errores} con error`} />
          <Kpi titulo="Aceptaría" valor={kpis.aceptaria} detalle={pct(kpis.aceptaria, kpis.analizadas)} />
          <Kpi titulo="Avisos" valor={kpis.avisos} detalle={tipos.slice(0, 2).map((t) => `${humano(t.tipo_aviso)} ${t.n}`).join(" · ") || undefined} />
          <Kpi titulo="Original encontrado" valor={pct(kpis.con_original, kpis.analizadas)} detalle={`${kpis.con_original} de ${kpis.analizadas}`} />
          <Kpi titulo="Coincide con n8n" valor={pct(kpis.coinciden_n8n, kpis.comparables_n8n)} detalle={`${kpis.coinciden_n8n} de ${kpis.comparables_n8n} comparables`} />
          <Kpi titulo="Acierto valorado" valor={pct(kpis.correctas, valoradas)} detalle={`${kpis.correctas} correctas · ${kpis.incorrectas} incorrectas`} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <SearchNormal1 className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Cliente, asunto, resguardo…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={estado || "todos"} onValueChange={(v) => setEstado(v === "todos" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="analizado">Analizadas</SelectItem>
            <SelectItem value="ignorado">Ignoradas</SelectItem>
            <SelectItem value="error">Con error</SelectItem>
            <SelectItem value="todos">Todas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={decision || "todas"} onValueChange={(v) => setDecision(v === "todas" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Decisión" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Cualquier decisión</SelectItem>
            <SelectItem value="Aceptado">Aceptaría</SelectItem>
            <SelectItem value="Aviso">Aviso</SelectItem>
          </SelectContent>
        </Select>
        <Select value={n8n || "todos"} onValueChange={(v) => setN8n(v === "todos" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Frente a n8n" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Frente a n8n: todo</SelectItem>
            <SelectItem value="coincide">Coincide con n8n</SelectItem>
            <SelectItem value="difiere">Difiere de n8n</SelectItem>
            <SelectItem value="sin_n8n">n8n no lo procesó</SelectItem>
          </SelectContent>
        </Select>
        <Select value={revision || "todas"} onValueChange={(v) => setRevision(v === "todas" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Valoración" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Cualquier valoración</SelectItem>
            <SelectItem value="pendiente">Sin valorar</SelectItem>
            <SelectItem value="correcta">Correctas</SelectItem>
            <SelectItem value="incorrecta">Incorrectas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recibida</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Decisión</TableHead>
              <TableHead>Presupuesto identificado</TableHead>
              <TableHead>Qué entendió</TableHead>
              <TableHead>n8n</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && items.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              : items.map((f) => (
                  <TableRow key={f.id} className="cursor-pointer" onClick={() => setAbierto(f.id)}>
                    <TableCell className="whitespace-nowrap text-xs">{fechaHora(f.fecha_mensaje)}</TableCell>
                    <TableCell className="max-w-56">
                      <p className="truncate text-sm font-medium">{f.remitente_nombre || f.remitente}</p>
                      <p className="truncate text-xs text-muted-foreground">{f.remitente}</p>
                    </TableCell>
                    <TableCell><DecisionBadge f={f} /></TableCell>
                    <TableCell className="text-sm">
                      {f.numero_presupuesto || f.resguardo ? (
                        <>
                          <p>{f.numero_presupuesto ? `Ppto ${f.numero_presupuesto}` : "—"}{f.importe ? ` · ${f.importe} €` : ""}</p>
                          <p className="text-xs text-muted-foreground">{f.resguardo ? `Resguardo ${f.resguardo}` : ""}</p>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {ORIGEN[f.original_estado ?? ""] ?? humano(f.original_estado)}
                          {f.n_candidatos > 1 ? ` · ${f.n_candidatos} candidatos` : ""}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-80 text-xs text-muted-foreground"><p className="line-clamp-2">{f.resumen || f.error || humano(f.intencion)}</p></TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {f.n8n_estado ? (
                        <span className={f.decision === f.n8n_estado ? "text-emerald-700" : "text-amber-700"}>
                          {f.decision === f.n8n_estado ? "= " : "≠ "}{f.n8n_estado}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {f.revision === "correcta" && <TickCircle className="size-4 text-emerald-600" />}
                      {f.revision === "incorrecta" && <CloseCircle className="size-4 text-red-600" />}
                    </TableCell>
                  </TableRow>
                ))}
            {!cargando && items.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No hay respuestas con estos filtros.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} respuestas</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}><ArrowLeft2 className="size-4" /></Button>
          <span>{pagina} / {totalPaginas}</span>
          <Button variant="outline" size="icon" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}><ArrowRight2 className="size-4" /></Button>
        </div>
      </div>

      <DetalleDialog id={abierto} onClose={() => setAbierto(null)} onCambio={cargar} />
    </div>
  );
}

function DetalleDialog({ id, onClose, onCambio }: { id: number | null; onClose: () => void; onCambio: () => void }) {
  const [d, setD] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (id === null) return;
    let vivo = true;
    setCargando(true);
    setD(null);
    fetch(`/api/mails/respuestas-presupuesto/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!vivo) return;
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        setD(data.item as Detalle);
        setNota((data.item as Detalle).revision_nota ?? "");
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Error desconocido"))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [id]);

  async function valorar(revision: Revision) {
    if (id === null) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/mails/respuestas-presupuesto/${id}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision, nota }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setD((x) => (x ? { ...x, revision } : x));
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  const ia = d?.ia ?? {};
  const rec = d?.recuperacion ?? {};
  const lineaIA = (clave: string, etiqueta: string) => {
    const v = ia[clave];
    if (v === undefined || v === null || v === "") return null;
    return (
      <p key={clave} className="text-sm"><span className="text-muted-foreground">{etiqueta}: </span>{Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)}</p>
    );
  };

  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{d ? d.asunto || "Respuesta de cliente" : "Cargando…"}</DialogTitle>
          <DialogDescription>{d ? `${d.remitente_nombre || ""} ${d.remitente || ""} · ${fechaHora(d.fecha_mensaje)}` : ""}</DialogDescription>
        </DialogHeader>
        {cargando && <Skeleton className="h-40 w-full" />}
        {d && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <DecisionBadge f={{ estado: d.estado as Fila["estado"], decision: d.decision as Fila["decision"], tipo_aviso: d.tipo_aviso }} />
              {d.n8n && (
                <Badge variant="outline">n8n decidió: {d.n8n.estado}{d.n8n.numero_presupuesto ? ` (ppto ${d.n8n.numero_presupuesto})` : ""}</Badge>
              )}
            </div>

            <section>
              <h3 className="mb-1 text-sm font-semibold">Lo que escribió el cliente</h3>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm">{d.respuesta_cliente || "—"}</pre>
            </section>

            <section className="space-y-0.5">
              <h3 className="mb-1 text-sm font-semibold">Lo que entendió la IA</h3>
              {lineaIA("resumen", "Resumen")}
              {lineaIA("intencion", "Intención")}
              {lineaIA("evidencia_autorizacion", "Frase que autoriza")}
              {lineaIA("consulta_cliente", "Consulta del cliente")}
              {lineaIA("motivo", "Razonamiento")}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(["hay_consulta", "hay_condiciones", "hay_negociacion", "hay_aplazamiento", "hay_contradiccion", "requiere_revision"] as const)
                  .filter((k) => ia[k] === true)
                  .map((k) => <Badge key={k} variant="outline">{humano(k.replace("hay_", ""))}</Badge>)}
              </div>
              {d.intencion && !ia["intencion"] && <p className="text-sm"><span className="text-muted-foreground">Intención: </span>{humano(d.intencion)}</p>}
              {d.motivos && d.motivos.length > 0 && <p className="text-sm"><span className="text-muted-foreground">Motivos de la decisión: </span>{d.motivos.map(humano).join(" · ")}</p>}
              {d.explicacion && <p className="text-sm"><span className="text-muted-foreground">Explicación: </span>{d.explicacion}</p>}
              {d.error && <p className="text-sm text-red-700">Error: {d.error}</p>}
            </section>

            <section className="space-y-0.5">
              <h3 className="mb-1 text-sm font-semibold">Presupuesto identificado</h3>
              <p className="text-sm">
                {d.numero_presupuesto ? `Presupuesto ${d.numero_presupuesto}` : "Ninguno"}
                {d.opcion ? ` · opción ${d.opcion}` : ""}
                {d.importe !== null && d.importe !== undefined ? ` · ${d.importe} €` : ""}
                {d.resguardo ? ` · resguardo ${d.resguardo}` : ""}
              </p>
              {d.motivo_seleccion && <p className="text-xs text-muted-foreground">Selección: {humano(d.motivo_seleccion)}</p>}
              {d.problemas.length > 0 && (
                <p className="flex items-center gap-1 text-xs text-amber-700"><Warning2 className="size-3.5" />{d.problemas.map(humano).join(" · ")}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Correo original: {ORIGEN[String(rec["estado"] ?? "")] ?? humano(String(rec["estado"] ?? ""))}
                {d.original ? ` · «${d.original.asunto}» (${fechaHora(d.original.fecha)})` : ""}
                {d.candidatos.length > 0 ? ` · ${d.candidatos.length} candidato(s) en el original` : ""}
              </p>
            </section>

            {d.n8n?.motivo && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">Lo que registró n8n</h3>
                <p className="text-sm text-muted-foreground">{d.n8n.motivo}</p>
              </section>
            )}

            {d.estado === "analizado" && (
              <section className="space-y-2 border-t pt-3">
                <h3 className="text-sm font-semibold">¿La decisión es correcta?</h3>
                <Textarea rows={2} placeholder="Nota opcional (qué falló o por qué está bien)" value={nota} onChange={(e) => setNota(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={d.revision === "correcta" ? "default" : "outline"} disabled={guardando} onClick={() => valorar("correcta")}>
                    <TickCircle className="mr-1.5 size-4" /> Correcta
                  </Button>
                  <Button size="sm" variant={d.revision === "incorrecta" ? "destructive" : "outline"} disabled={guardando} onClick={() => valorar("incorrecta")}>
                    <CloseCircle className="mr-1.5 size-4" /> Incorrecta
                  </Button>
                  {d.revision && (
                    <Button size="sm" variant="ghost" disabled={guardando} onClick={() => valorar(null)}>Quitar valoración</Button>
                  )}
                </div>
                {d.revisado_por && d.revision && <p className="text-xs text-muted-foreground">Valorada por {d.revisado_por}</p>}
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
