"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Add, Video } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { colorDeRed, ESTADOS, REDES, TIPOS, etiquetaDe, type EstadoPieza, type Pieza, type RedSocial, type TipoPieza } from "@/lib/contenido";
import { PiezaDialog } from "./pieza-dialog";

const POLL_MS = 30000;

// Acento por columna — mismo valor que ESTADOS.color pero solo el tono
// base, para la franja superior de la columna (un detalle que ESTADOS.color
// por sí solo no cubre: ese es fondo+texto de la píldora, no un borde).
const ACENTO_COLUMNA: Record<EstadoPieza, string> = {
  pendiente: "bg-amber-500",
  en_proceso: "bg-sky-500",
  listo: "bg-emerald-500",
};

function formatFecha(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleString("es-ES", iso.length === 10
    ? { day: "2-digit", month: "short" }
    : { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Urgencia de una fecha límite (solo fecha, no fecha+hora programada) —
    vencida en rojo, a 2 días o menos en ámbar, el resto sin marcar. */
function urgenciaFecha(iso: string): "vencida" | "proxima" | null {
  const limite = new Date(iso.length === 10 ? `${iso}T23:59:59` : iso).getTime();
  const diffDias = (limite - Date.now()) / 86400000;
  if (diffDias < 0) return "vencida";
  if (diffDias <= 2) return "proxima";
  return null;
}

/** Panel de contenido de la community manager: piezas agrupadas por estado,
    con su red, tipo, fecha límite, programación y progreso de subtareas. */
export default function ContenidoPage() {
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/asistencia/kiosk/contenido");
      const data = await res.json();
      if (data.ok) setPiezas(data.piezas as Pieza[]);
    } catch {
      // silencioso — se reintenta en el siguiente poll
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/asistencia/kiosk/contenido");
        const data = await res.json();
        if (activo && data.ok) setPiezas(data.piezas as Pieza[]);
      } catch {
        // silencioso — se reintenta en el siguiente poll
      } finally {
        if (activo) setCargando(false);
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      activo = false;
      clearInterval(t);
    };
  }, []);

  if (cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Video className="size-4" /> Contenido
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{piezas.length} pieza{piezas.length === 1 ? "" : "s"} en total</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setNuevaAbierta(true)}>
          <Add className="size-4" /> Nueva pieza
        </Button>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-3">
        {ESTADOS.map((estado) => {
          const lista = piezas.filter((p) => p.estado === estado.valor);
          return (
            <Card key={estado.valor} className="gap-0 overflow-hidden py-0">
              <div className={cn("h-1", ACENTO_COLUMNA[estado.valor])} />
              <div className="flex items-center justify-between border-b bg-muted/30 px-3.5 py-2.5">
                <span className="text-sm font-semibold">{estado.etiqueta}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", estado.color)}>{lista.length}</span>
              </div>
              <CardContent className="space-y-2 p-3">
                {lista.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nada en este estado.</p>
                ) : (
                  lista.map((p) => {
                    const urgencia = p.fechaLimite ? urgenciaFecha(p.fechaLimite) : null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSeleccionada(p.id)}
                        className="flex w-full flex-col gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-primary/40 hover:shadow-md"
                      >
                        <span className="truncate font-medium">{p.titulo}</span>

                        {(p.redSocial || p.tipo) && (
                          <span className="flex flex-wrap items-center gap-1">
                            {p.redSocial && (
                              <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium", colorDeRed(p.redSocial as RedSocial))}>
                                {etiquetaDe(REDES, p.redSocial as RedSocial | null)}
                              </span>
                            )}
                            {p.tipo && (
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {etiquetaDe(TIPOS, p.tipo as TipoPieza | null)}
                              </span>
                            )}
                          </span>
                        )}

                        {p.subtareasTotal > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <span
                                className="block h-full rounded-full bg-primary"
                                style={{ width: `${Math.round((p.subtareasHechas / p.subtareasTotal) * 100)}%` }}
                              />
                            </span>
                            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{p.subtareasHechas}/{p.subtareasTotal}</span>
                          </span>
                        )}

                        {(p.fechaLimite || p.programadaPara) && (
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                            {p.fechaLimite && (
                              <span className={cn(
                                urgencia === "vencida" ? "font-medium text-destructive" : urgencia === "proxima" ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                              )}>
                                Límite {formatFecha(p.fechaLimite)}
                              </span>
                            )}
                            {p.programadaPara && <span className="text-muted-foreground">Programada {formatFecha(p.programadaPara)}</span>}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PiezaDialog
        piezaId={seleccionada}
        open={seleccionada !== null}
        onOpenChange={(o) => !o && setSeleccionada(null)}
        onCambiada={() => cargar()}
      />
      <NuevaPiezaDialog
        open={nuevaAbierta}
        onOpenChange={setNuevaAbierta}
        onCreada={(id) => {
          setNuevaAbierta(false);
          cargar();
          setSeleccionada(id);
        }}
      />
    </div>
  );
}

function NuevaPiezaDialog({
  open, onOpenChange, onCreada,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreada: (id: number) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [estado, setEstado] = useState<EstadoPieza>("pendiente");
  const [tipo, setTipo] = useState<TipoPieza | "">("");
  const [red, setRed] = useState<RedSocial | "">("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [enviando, setEnviando] = useState(false);

  function limpiar() {
    setTitulo(""); setEstado("pendiente"); setTipo(""); setRed(""); setFechaLimite("");
  }

  async function crear() {
    if (!titulo.trim()) return toast.error("El título es obligatorio");
    setEnviando(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/contenido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          estado,
          tipo: tipo || null,
          red_social: red || null,
          fecha_limite: fechaLimite || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pieza creada");
      limpiar();
      onCreada(data.pieza.id as number);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle className="flex items-center gap-2"><Video className="size-4.5" /> Nueva pieza</DialogTitle>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="npTitulo">Título *</Label>
            <Input id="npTitulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="npTipo">Tipo</Label>
              <select id="npTipo" className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value as TipoPieza | "")}>
                <option value="">—</option>
                {TIPOS.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="npRed">Red social</Label>
              <select id="npRed" className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={red} onChange={(e) => setRed(e.target.value as RedSocial | "")}>
                <option value="">—</option>
                {REDES.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="npEstado">Estado</Label>
              <select id="npEstado" className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={estado} onChange={(e) => setEstado(e.target.value as EstadoPieza)}>
                {ESTADOS.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="npFecha">Fecha límite</Label>
              <Input id="npFecha" type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={crear} disabled={enviando}>{enviando ? "Creando…" : "Crear"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
