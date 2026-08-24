"use client";

import { useState } from "react";
import { Trash, Monitor, Box1, Box, Add, TickCircle } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MotivoPuntoLimpio,
  DestinoPuntoLimpio,
  MOTIVOS_PUNTO_LIMPIO,
  DESTINOS_PUNTO_LIMPIO,
  PuntoLimpioItem,
} from "@/lib/punto-limpio";
import { NuevoEquipoDialog } from "../equipos/nuevo-equipo-dialog";
import { ProductoFormDialog } from "../productos/producto-form-dialog";
import { PiezaStockFormDialog } from "../stock-piezas/pieza-stock-form-dialog";

/**
 * Define/edita el motivo de un caso de "Punto Limpio". Guardar el motivo en
 * sí (radio + detalle + destino) es una acción independiente de crear los
 * registros enlazados (equipo de alquiler / producto de venta / piezas de
 * stock) — cada uno de esos se crea aparte, con su propio diálogo ya
 * existente, solo precargado y con origenResguardo para trazabilidad.
 */
export function PuntoLimpioMotivoDialog({
  item,
  open,
  onOpenChange,
  onGuardado,
}: {
  item: PuntoLimpioItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const [motivo, setMotivo] = useState<MotivoPuntoLimpio | "">(item.motivo || "");
  const [motivoDetalle, setMotivoDetalle] = useState(item.motivoDetalle || "");
  const [destino, setDestino] = useState<DestinoPuntoLimpio | "">(item.destino || "");
  const [enviando, setEnviando] = useState(false);
  const [productoAbierto, setProductoAbierto] = useState(false);
  const [piezaAbierta, setPiezaAbierta] = useState(false);
  const [piezasAgregadas, setPiezasAgregadas] = useState<string[]>([]);

  function reiniciar() {
    setMotivo(item.motivo || "");
    setMotivoDetalle(item.motivoDetalle || "");
    setDestino(item.destino || "");
    setPiezasAgregadas([]);
  }

  async function guardar() {
    if (!motivo) return toast.error("Selecciona un motivo");
    if (motivo === "otro" && !motivoDetalle.trim()) return toast.error("Describe el motivo en el campo de texto");
    if (motivo === "reparable" && !destino) return toast.error('Selecciona qué se hará con el equipo ("reparable")');

    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${item.resguardo}/salidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "punto_limpio", motivo, motivoDetalle: motivoDetalle.trim(), destino: motivo === "reparable" ? destino : "" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Motivo guardado");
      onOpenChange(false);
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (enviando) return;
        if (!o) reiniciar();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash className="size-5" /> Motivo de Punto Limpio — #{item.resguardo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Equipo: <strong className="text-foreground">{item.equipoModelo || "—"}</strong>
          </p>

          <div className="space-y-2">
            <Label>¿Qué está pasando con el equipo? *</Label>
            <RadioGroup value={motivo} onValueChange={(v) => setMotivo(v as MotivoPuntoLimpio)} className="flex flex-col gap-2.5">
              {MOTIVOS_PUNTO_LIMPIO.map((m) => (
                <label key={m.valor} className="flex items-start gap-2 text-sm">
                  <RadioGroupItem value={m.valor} className="mt-0.5" />
                  {m.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {motivo === "otro" && (
            <div className="space-y-1.5">
              <Label htmlFor="motivoDetalleOtro">Describe el motivo *</Label>
              <Textarea id="motivoDetalleOtro" rows={2} value={motivoDetalle} onChange={(e) => setMotivoDetalle(e.target.value)} placeholder="Explica qué está pasando con el equipo…" />
            </div>
          )}

          {motivo === "reparable" && (
            <div className="space-y-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
              <div className="space-y-1.5">
                <Label>¿Qué se hará con él? *</Label>
                <Select value={destino} onValueChange={(v) => setDestino(v as DestinoPuntoLimpio)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent>
                    {DESTINOS_PUNTO_LIMPIO.map((d) => <SelectItem key={d.valor} value={d.valor}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motivoDetalleReparable">Notas (opcional)</Label>
                <Textarea id="motivoDetalleReparable" rows={2} value={motivoDetalle} onChange={(e) => setMotivoDetalle(e.target.value)} placeholder="Qué se le podría arreglar, estado general…" />
              </div>

              {destino === "alquiler" && (
                <NuevoEquipoDialog
                  origenResguardo={item.resguardo}
                  valoresIniciales={{ modelo: item.equipoModelo }}
                  onCreado={() => toast.success("Equipo de alquiler creado — recuerda guardar también el motivo")}
                  trigger={<><Monitor className="size-4" /> Crear equipo de alquiler</>}
                />
              )}
              {destino === "venta" && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setProductoAbierto(true)}>
                    <Box1 className="size-4" /> Crear producto de venta
                  </Button>
                  <ProductoFormDialog
                    productoExistente={null}
                    valoresIniciales={{ nombre: item.equipoModelo }}
                    origenResguardo={item.resguardo}
                    open={productoAbierto}
                    onOpenChange={setProductoAbierto}
                    onGuardado={() => toast.success("Producto de venta creado — recuerda guardar también el motivo")}
                  />
                </>
              )}
            </div>
          )}

          {motivo === "reciclaje_interno" && (
            <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <Label htmlFor="motivoDetalleReciclaje">Notas (opcional)</Label>
              <Textarea id="motivoDetalleReciclaje" rows={2} value={motivoDetalle} onChange={(e) => setMotivoDetalle(e.target.value)} placeholder="Observaciones sobre el desguace…" />

              <p className="text-xs font-medium text-muted-foreground">Piezas aprovechadas — se registran en Stock de Piezas</p>
              {piezasAgregadas.length > 0 && (
                <ul className="space-y-1">
                  {piezasAgregadas.map((p, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                      <TickCircle className="size-3.5 shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              )}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPiezaAbierta(true)}>
                <Add className="size-3.5" /> Agregar pieza aprovechada
              </Button>
              <PiezaStockFormDialog
                piezaExistente={null}
                categorias={[]}
                origenResguardo={item.resguardo}
                open={piezaAbierta}
                onOpenChange={setPiezaAbierta}
                onGuardado={() => setPiezasAgregadas((prev) => [...prev, "Pieza registrada"])}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={guardar} disabled={enviando}>
            <Box className="size-4" /> {enviando ? "Guardando..." : "Guardar motivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
