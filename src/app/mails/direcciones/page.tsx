"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Refresh2, SearchNormal1, CloseCircle, Category, Warning2, RotateLeft, Add,
  ArrowLeft2, ArrowLeft3, ArrowRight2, ArrowRight3,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import { DireccionInvalida } from "@/lib/mails";
import { fechaHora } from "../componentes-correo";

const FILAS_POR_PAGINA_OPCIONES = ["15", "20", "30", "40", "50", "100"];

type FiltroEstado = "" | "activa" | "rehabilitada";
type FiltroOrigen = "" | "manual" | "automatica";

export default function DireccionesInvalidasPage() {
  const esSuperadmin = useEsSuperadmin();
  const [direcciones, setDirecciones] = useState<DireccionInvalida[]>([]);
  const [total, setTotal] = useState(0);
  const [activas, setActivas] = useState(0);
  const [manuales, setManuales] = useState(0);
  const [estado, setEstado] = useState<FiltroEstado>("activa");
  const [origen, setOrigen] = useState<FiltroOrigen>("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(15);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [marcarAbierto, setMarcarAbierto] = useState(false);
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const parametros = useCallback(
    (pag: number, porPagina: number) => {
      const p = new URLSearchParams({ limit: String(porPagina), offset: String((pag - 1) * porPagina) });
      if (estado) p.set("estado", estado);
      if (origen) p.set("origen", origen);
      if (busquedaAplicada.trim()) p.set("q", busquedaAplicada.trim());
      return p.toString();
    },
    [estado, origen, busquedaAplicada]
  );

  useEffect(() => {
    setPagina(1);
  }, [estado, origen, busquedaAplicada, filasPorPagina]);

  const cargar = useCallback(async () => {
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/mails/direcciones?${parametros(pagina, filasPorPagina)}`);
      const data = await res.json();
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDirecciones(data.direcciones as DireccionInvalida[]);
      setTotal(data.total as number);
      setActivas(data.activas as number);
      setManuales(data.manuales as number);
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [parametros, pagina, filasPorPagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function marcar(email: string, invalida: boolean, motivo?: string) {
    setProcesando(email);
    try {
      const res = await fetch("/api/mails/direcciones/marcar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, invalida, motivo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(invalida ? "Dirección marcada como inválida: sale de las secuencias" : "Dirección rehabilitada");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(null);
    }
  }

  const hayFiltros = estado !== "activa" || !!origen;
  const totalPaginas = Math.max(1, Math.ceil(total / filasPorPagina));
  const inicio = total === 0 ? 0 : (pagina - 1) * filasPorPagina;
  const fin = Math.min(inicio + filasPorPagina, total);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-red-500 to-rose-600 text-white">
            <CloseCircle className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Direcciones inválidas</h1>
            <p className="text-sm text-muted-foreground">Correos que rebotaron para siempre (o se marcaron a mano): n8n ya no les vuelve a escribir</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {esSuperadmin && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMarcarAbierto(true)}>
              <Add className="size-4" /> Marcar dirección
            </Button>
          )}
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          type="button"
          aria-pressed={estado === ""}
          onClick={() => setEstado("")}
          className={`flex items-center gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-muted/40 ${estado === "" ? "ring-2 ring-primary/50" : ""}`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-300">
            <Category className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs text-muted-foreground">Total</span>
            <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !direcciones.length ? "…" : total.toLocaleString("es-ES")}</span>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={estado === "activa"}
          onClick={() => setEstado(estado === "activa" ? "" : "activa")}
          className={`flex items-center gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-muted/40 ${estado === "activa" ? "ring-2 ring-primary/50" : ""}`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
            <Warning2 className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs text-muted-foreground">Activas ahora</span>
            <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !direcciones.length ? "…" : activas.toLocaleString("es-ES")}</span>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={origen === "manual"}
          onClick={() => setOrigen(origen === "manual" ? "" : "manual")}
          className={`flex items-center gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-muted/40 ${origen === "manual" ? "ring-2 ring-primary/50" : ""}`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Add className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs text-muted-foreground">Marcadas a mano</span>
            <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !direcciones.length ? "…" : manuales.toLocaleString("es-ES")}</span>
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar email o motivo del rebote…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={estado || "todas"} onValueChange={(v) => setEstado(v === "activa" || v === "rehabilitada" ? v : "")}>
          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Activas y rehabilitadas</SelectItem>
            <SelectItem value="activa">Solo activas</SelectItem>
            <SelectItem value="rehabilitada">Solo rehabilitadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={origen || "todas"} onValueChange={(v) => setOrigen(v === "manual" || v === "automatica" ? v : "")}>
          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Origen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Manuales y detectadas</SelectItem>
            <SelectItem value="automatica">Solo detectadas (rebote)</SelectItem>
            <SelectItem value="manual">Solo marcadas a mano</SelectItem>
          </SelectContent>
        </Select>
        {hayFiltros && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setEstado("activa"); setOrigen(""); }}>
            Quitar filtros
          </Button>
        )}
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Correo del rebote</TableHead>
              <TableHead>Detectado</TableHead>
              <TableHead>Estado</TableHead>
              {esSuperadmin && <TableHead className="text-right">Acción</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: esSuperadmin ? 8 : 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!cargando && direcciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={esSuperadmin ? 8 : 7} className="py-8 text-center text-muted-foreground">
                  Ninguna dirección coincide con los filtros
                </TableCell>
              </TableRow>
            )}
            {!cargando &&
              direcciones.map((d) => {
                const rehabilitada = !!d.rehabilitada_en;
                return (
                  <TableRow key={d.email}>
                    <TableCell className="text-sm font-medium">{d.email}</TableCell>
                    <TableCell className="max-w-64 truncate text-sm text-muted-foreground" title={d.motivo || undefined}>{d.motivo || "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${d.manual ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-slate-500/10 text-slate-600 dark:text-slate-300"}`}>
                        {d.manual ? "Marcada a mano" : "Rebote detectado"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.lead_id ? (
                        <Link href={`/mails/leads/${d.lead_id}`} className="text-primary hover:underline">{d.lead_nombre}</Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-56 text-sm">
                      {d.mensaje_asunto ? (
                        <>
                          <span className="block truncate" title={d.mensaje_asunto}>{d.mensaje_asunto}</span>
                          <span className="block truncate text-xs text-muted-foreground">{d.buzon_email}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{fechaHora(d.detectado_en)}</TableCell>
                    <TableCell>
                      {rehabilitada ? (
                        <span className="inline-flex whitespace-nowrap rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                          Rehabilitada
                        </span>
                      ) : (
                        <span className="inline-flex whitespace-nowrap rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                          Activa
                        </span>
                      )}
                    </TableCell>
                    {esSuperadmin && (
                      <TableCell className="text-right">
                        {!rehabilitada ? (
                          <Button size="sm" variant="outline" className="h-7 gap-1" disabled={procesando === d.email} onClick={() => marcar(d.email, false)}>
                            <RotateLeft className="size-3.5" /> Rehabilitar
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive hover:text-destructive" disabled={procesando === d.email} onClick={() => marcar(d.email, true)}>
                            <CloseCircle className="size-3.5" /> Volver a invalidar
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {total.toLocaleString("es-ES")} dirección{total !== 1 ? "es" : ""}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filas por página:</span>
              <Select value={String(filasPorPagina)} onValueChange={(v) => { if (v) setFilasPorPagina(parseInt(v, 10)); }}>
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FILAS_POR_PAGINA_OPCIONES.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" disabled={pagina <= 1} onClick={() => setPagina(1)}>
                <ArrowLeft3 className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                <ArrowLeft2 className="size-3.5" />
              </Button>
              <span className="px-1 text-xs whitespace-nowrap text-muted-foreground">
                {total === 0 ? "" : `Página ${pagina} de ${totalPaginas} (${inicio + 1}–${fin})`}
              </span>
              <Button variant="outline" size="icon-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>
                <ArrowRight2 className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina(totalPaginas)}>
                <ArrowRight3 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {esSuperadmin && (
        <MarcarDireccionDialog
          open={marcarAbierto}
          onOpenChange={setMarcarAbierto}
          onMarcar={async (email, motivo) => {
            await marcar(email, true, motivo);
            setMarcarAbierto(false);
          }}
        />
      )}
    </div>
  );
}

function MarcarDireccionDialog({
  open,
  onOpenChange,
  onMarcar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarcar: (email: string, motivo: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setMotivo("");
    }
  }, [open]);

  async function enviar() {
    if (!email.trim()) return toast.error("Escribe un email");
    setEnviando(true);
    try {
      await onMarcar(email.trim(), motivo.trim());
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloseCircle className="size-5" /> Marcar dirección inválida
          </DialogTitle>
          <DialogDescription>No se le vuelve a escribir en las secuencias hasta que la rehabilites.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="miEmail">Email *</Label>
            <Input id="miEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="miMotivo">Motivo</Label>
            <Input id="miMotivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: Pidió que no le escribamos más" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={enviando} onClick={enviar}>{enviando ? "Guardando…" : "Marcar como inválida"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
