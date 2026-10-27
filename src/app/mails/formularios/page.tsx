"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Refresh2, SearchNormal1, TickCircle, CloseCircle, Edit2, ArrowLeft2, ArrowRight2, Warning2 } from "@/lib/icons";
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
type Clasificacion = "responder" | "atencion_humana" | "spam" | "no_cliente" | null;

type Fila = {
  id: number;
  fecha_mensaje: string | null;
  asunto: string | null;
  estado: "analizado" | "ignorado" | "error";
  clasificacion: Clasificacion;
  motivo_clasificacion: string | null;
  nombre: string | null;
  apellido: string | null;
  email_cliente: string | null;
  resumen: string | null;
  equipo_detectado: string | null;
  motivo_humano: string | null;
  notificacion_id: string | null;
  revision: Revision;
  error: string | null;
  mensaje_inicio: string | null;
  envio_estado: "enviando" | "enviado" | "omitido" | "error" | null;
  envio_detalle: string | null;
  enviado_a: string | null;
  enviado_en: string | null;
};

type Kpis = {
  total: number; responder: number; atencion_humana: number; spam: number; no_cliente: number; errores: number; avisados: number;
  correctas: number; incorrectas: number;
};

type Detalle = Fila & {
  telefono: string | null;
  campos_extra: Record<string, string> | null;
  mensaje: string | null;
  borrador: string | null;
  revision_nota: string | null;
  revisado_por: string | null;
};

const POR_PAGINA = 25;
const humano = (s: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) : "—");
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");

function ClasificacionBadge({ c, estado, envio }: { c: Clasificacion; estado: string; envio?: Fila["envio_estado"] }) {
  if (c === "responder" && envio === "enviado") return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Respuesta enviada</Badge>;
  if (c === "responder" && envio === "omitido") return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">No enviada</Badge>;
  if (c === "responder" && envio === "error") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Fallo al enviar</Badge>;
  if (estado === "error") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Error</Badge>;
  if (c === "responder") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Respondería sola</Badge>;
  if (c === "atencion_humana") return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Responder a mano</Badge>;
  if (c === "spam") return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Spam</Badge>;
  return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">No es cliente</Badge>;
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

export default function RespuestasFormulariosPage() {
  const [items, setItems] = useState<Fila[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [modo, setModo] = useState("");
  const [clasificacion, setClasificacion] = useState("");
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
  }, [clasificacion, revision, busquedaAplicada]);

  const cargar = useCallback(async () => {
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const p = new URLSearchParams({ limit: String(POR_PAGINA), offset: String((pagina - 1) * POR_PAGINA) });
      if (clasificacion) p.set("clasificacion", clasificacion);
      if (revision) p.set("revision", revision);
      if (busquedaAplicada.trim()) p.set("q", busquedaAplicada.trim());
      const res = await fetch(`/api/mails/respuestas-formularios?${p}`);
      const data = await res.json();
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setItems(data.items as Fila[]);
      setKpis(data.kpis as Kpis);
      setModo(data.modo as string);
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [pagina, clasificacion, revision, busquedaAplicada]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const total = kpis?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const consultas = (kpis?.responder ?? 0) + (kpis?.atencion_humana ?? 0);
  const valoradas = (kpis?.correctas ?? 0) + (kpis?.incorrectas ?? 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-cyan-600 text-white">
            <Edit2 className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Respuestas a formularios</h1>
            <p className="text-xs text-muted-foreground">
              Formularios de las webs que llegan a soporte. {modo === "sombra" ? "Modo sombra: prepara el borrador y avisa, pero no envía nada al cliente." : modo === "activo" ? "Modo activo: responde solo a las consultas que clasifica como «Respondería sola» (formularios posteriores a la activación); lo demás lo avisa para responder a mano." : modo ? `Modo: ${modo}.` : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={cargando}>
          <Refresh2 className={`mr-1.5 size-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {kpis && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          <Kpi titulo="Formularios" valor={kpis.total} detalle={`${kpis.errores} con error`} />
          <Kpi titulo="Consultas de clientes" valor={consultas} detalle={pct(consultas, kpis.total)} />
          <Kpi titulo="Respondería sola" valor={kpis.responder} detalle={pct(kpis.responder, consultas)} />
          <Kpi titulo="Responder a mano" valor={kpis.atencion_humana} detalle={`${kpis.avisados} avisados en notificaciones`} />
          <Kpi titulo="Spam / no cliente" valor={kpis.spam + kpis.no_cliente} detalle={`${kpis.spam} spam · ${kpis.no_cliente} otros`} />
          <Kpi titulo="Acierto valorado" valor={pct(kpis.correctas, valoradas)} detalle={`${kpis.correctas} correctas · ${kpis.incorrectas} incorrectas`} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <SearchNormal1 className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Cliente, email, mensaje…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={clasificacion || "todas"} onValueChange={(v) => setClasificacion(v === "todas" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Resultado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Cualquier resultado</SelectItem>
            <SelectItem value="responder">Respondería sola</SelectItem>
            <SelectItem value="atencion_humana">Responder a mano</SelectItem>
            <SelectItem value="spam">Spam</SelectItem>
            <SelectItem value="no_cliente">No es cliente</SelectItem>
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
              <TableHead>Recibido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Qué pide</TableHead>
              <TableHead>Formulario</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && items.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              : items.map((f) => (
                  <TableRow key={f.id} className="cursor-pointer" onClick={() => setAbierto(f.id)}>
                    <TableCell className="whitespace-nowrap text-xs">{fechaHora(f.fecha_mensaje)}</TableCell>
                    <TableCell className="max-w-56">
                      <p className="truncate text-sm font-medium">{[f.nombre, f.apellido].filter(Boolean).join(" ") || "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{f.email_cliente}</p>
                    </TableCell>
                    <TableCell>
                      <ClasificacionBadge c={f.clasificacion} estado={f.estado} envio={f.envio_estado} />
                      {f.clasificacion === "atencion_humana" && f.motivo_humano && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{humano(f.motivo_humano)}</p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-96 text-xs text-muted-foreground">
                      <p className="line-clamp-2">{f.resumen || f.motivo_clasificacion || f.error || f.mensaje_inicio}</p>
                      {f.equipo_detectado && <p className="text-foreground/70">Equipo: {f.equipo_detectado}</p>}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-xs text-muted-foreground">{f.asunto}</TableCell>
                    <TableCell>
                      {f.revision === "correcta" && <TickCircle className="size-4 text-emerald-600" />}
                      {f.revision === "incorrecta" && <CloseCircle className="size-4 text-red-600" />}
                    </TableCell>
                  </TableRow>
                ))}
            {!cargando && items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No hay formularios con estos filtros.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} formularios</span>
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
    fetch(`/api/mails/respuestas-formularios/${id}`)
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
      const res = await fetch(`/api/mails/respuestas-formularios/${id}/revision`, {
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

  const extras = d?.campos_extra ? Object.entries(d.campos_extra) : [];

  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{d ? d.asunto || "Formulario web" : "Cargando…"}</DialogTitle>
          <DialogDescription>
            {d ? `${[d.nombre, d.apellido].filter(Boolean).join(" ")} · ${d.email_cliente || ""}${d.telefono ? ` · ${d.telefono}` : ""} · ${fechaHora(d.fecha_mensaje)}` : ""}
          </DialogDescription>
        </DialogHeader>
        {cargando && <Skeleton className="h-40 w-full" />}
        {d && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ClasificacionBadge c={d.clasificacion} estado={d.estado} envio={d.envio_estado} />
              {d.notificacion_id && <Badge variant="outline">Avisado en notificaciones ({d.notificacion_id})</Badge>}
            </div>

            <section>
              <h3 className="mb-1 text-sm font-semibold">Lo que rellenó el cliente</h3>
              {extras.map(([k, v]) => (
                <p key={k} className="text-sm"><span className="text-muted-foreground">{k}: </span>{v}</p>
              ))}
              <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm">{d.mensaje || "—"}</pre>
            </section>

            <section className="space-y-0.5">
              <h3 className="mb-1 text-sm font-semibold">Lo que entendió la IA</h3>
              {d.resumen && <p className="text-sm"><span className="text-muted-foreground">Resumen: </span>{d.resumen}</p>}
              {d.equipo_detectado && <p className="text-sm"><span className="text-muted-foreground">Equipo: </span>{d.equipo_detectado}</p>}
              {d.clasificacion === "atencion_humana" && (
                <p className="flex items-center gap-1 text-sm text-amber-700"><Warning2 className="size-4" /> Debe contestar una persona: {humano(d.motivo_humano)}</p>
              )}
              {d.clasificacion === "spam" && d.motivo_clasificacion && <p className="text-sm text-muted-foreground">{d.motivo_clasificacion}</p>}
              {d.error && <p className="text-sm text-red-700">Error: {d.error}</p>}
            </section>

            {d.borrador && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">
                  {d.clasificacion === "atencion_humana" ? "Borrador sugerido (no se envía)" : d.envio_estado === "enviado" ? `Respuesta enviada a ${d.enviado_a ?? ""}${d.enviado_en ? ` el ${new Date(d.enviado_en).toLocaleString("es-ES")}` : ""}` : d.envio_estado ? `Respuesta no enviada: ${d.envio_detalle ?? d.envio_estado}` : "Respuesta que enviaría (no se envía en modo sombra)"}
                </h3>
                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border bg-white p-3 text-sm">{d.borrador}</pre>
              </section>
            )}

            {d.estado === "analizado" && (
              <section className="space-y-2 border-t pt-3">
                <h3 className="text-sm font-semibold">¿La clasificación y la respuesta son correctas?</h3>
                <Textarea rows={2} placeholder="Nota opcional (qué falló o por qué está bien)" value={nota} onChange={(e) => setNota(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={d.revision === "correcta" ? "default" : "outline"} disabled={guardando} onClick={() => valorar("correcta")}>
                    <TickCircle className="mr-1.5 size-4" /> Correcta
                  </Button>
                  <Button size="sm" variant={d.revision === "incorrecta" ? "destructive" : "outline"} disabled={guardando} onClick={() => valorar("incorrecta")}>
                    <CloseCircle className="mr-1.5 size-4" /> Incorrecta
                  </Button>
                  {d.revision && <Button size="sm" variant="ghost" disabled={guardando} onClick={() => valorar(null)}>Quitar valoración</Button>}
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
