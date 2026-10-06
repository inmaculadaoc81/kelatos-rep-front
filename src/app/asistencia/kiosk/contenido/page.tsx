"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Add, Video } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { ESTADOS, REDES, TIPOS, etiquetaDe, type EstadoPieza, type Pieza, type RedSocial, type TipoPieza } from "@/lib/contenido";
import { PiezaDialog } from "./pieza-dialog";

const POLL_MS = 30000;

function formatFecha(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleString("es-ES", iso.length === 10
    ? { day: "2-digit", month: "short" }
    : { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Video className="size-4" /> Contenido
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNuevaAbierta(true)}>
          <Add className="size-4" /> Nueva pieza
        </Button>
      </div>

      {ESTADOS.map((estado) => {
        const lista = piezas.filter((p) => p.estado === estado.valor);
        return (
          <Card key={estado.valor}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{estado.etiqueta}</span>
                <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", estado.color)}>{lista.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {lista.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nada en este estado.</p>
              ) : (
                lista.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSeleccionada(p.id)}
                    className="flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/40"
                  >
                    <span className="truncate font-medium">{p.titulo}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span>{etiquetaDe(REDES, p.redSocial as RedSocial | null)}</span>
                      <span>{etiquetaDe(TIPOS, p.tipo as TipoPieza | null)}</span>
                      {p.fechaLimite && <span>Límite {formatFecha(p.fechaLimite)}</span>}
                      {p.programadaPara && <span>Programada {formatFecha(p.programadaPara)}</span>}
                      {p.subtareasTotal > 0 && <span>Subtareas {p.subtareasHechas}/{p.subtareasTotal}</span>}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}

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
