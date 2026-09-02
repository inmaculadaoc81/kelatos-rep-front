"use client";

import { useEffect, useState } from "react";
import { Box, Clock } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { StockPieza, DatosStockPiezaForm } from "@/lib/stock-piezas";

function vacio(): DatosStockPiezaForm {
  return { referencia: "", nombre: "", descripcion: "", categoria: "", costeInterno: 0, precioCliente: 0, manoObra: 0, proveedor: "", stockDisponible: 0, stockMinimo: 0 };
}

function desdeExistente(p: StockPieza): DatosStockPiezaForm {
  return {
    referencia: p.referencia,
    nombre: p.nombre,
    descripcion: p.descripcion,
    categoria: p.categoria,
    costeInterno: p.costeInterno,
    precioCliente: p.precioCliente,
    manoObra: p.manoObra,
    proveedor: p.proveedor,
    stockDisponible: p.stockDisponible,
    stockMinimo: p.stockMinimo,
  };
}

/** Reproduce #modalStockPieza (Index.html): mismos campos, misma
    referencia-readOnly en edición, misma nota bajo "Mano de obra". */
export function PiezaStockFormDialog({
  piezaExistente,
  categorias,
  valoresIniciales,
  origenResguardo,
  open,
  onOpenChange,
  onGuardado,
}: {
  piezaExistente: StockPieza | null;
  categorias: string[];
  /** Precarga campos (p.ej. nombre) al abrir — usado desde Punto Limpio al registrar piezas de un reciclaje interno. */
  valoresIniciales?: Partial<DatosStockPiezaForm>;
  /** Resguardo de origen cuando la pieza procede de un reciclaje interno de Punto Limpio. */
  origenResguardo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosStockPiezaForm>(() => (piezaExistente ? desdeExistente(piezaExistente) : { ...vacio(), ...valoresIniciales }));
  const [enviando, setEnviando] = useState(false);
  const esEdicion = piezaExistente !== null;

  const [historial, setHistorial] = useState<{ id: number; fecha_hora: string; usuario: string | null; descripcion: string }[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    if (!open || !esEdicion || !piezaExistente) return;
    setCargandoHistorial(true);
    fetch(`/api/stock-piezas/${encodeURIComponent(piezaExistente.referencia)}/historial`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) setHistorial(data.historial); })
      .finally(() => setCargandoHistorial(false));
  }, [open, esEdicion, piezaExistente]);

  function actualizar<K extends keyof DatosStockPiezaForm>(campo: K, valor: DatosStockPiezaForm[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    if (!datos.referencia.trim()) return toast.error("La referencia es obligatoria");
    if (!datos.nombre.trim()) return toast.error("El nombre es obligatorio");

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/stock-piezas/${encodeURIComponent(piezaExistente!.referencia)}` : "/api/stock-piezas";
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, referencia: datos.referencia.trim().toUpperCase(), origenResguardo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEdicion ? "Pieza actualizada" : "Pieza creada");
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
        if (!o) setDatos(piezaExistente ? desdeExistente(piezaExistente) : { ...vacio(), ...valoresIniciales });
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl sm:max-w-xl" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="size-5" /> {esEdicion ? "Editar pieza" : "Nueva pieza"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="spReferencia">Referencia *</Label>
              <Input
                id="spReferencia"
                placeholder="Ej: TM-001"
                className="uppercase"
                value={datos.referencia}
                disabled={esEdicion}
                onChange={(e) => actualizar("referencia", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="spNombre">Nombre *</Label>
              <Input id="spNombre" placeholder="Ej: Cuchilla Thermomix" value={datos.nombre} onChange={(e) => actualizar("nombre", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="spCategoria">Categoría</Label>
            <Input id="spCategoria" list="spCategoriasList" placeholder="Ej: Thermomix, Robots..." value={datos.categoria} onChange={(e) => actualizar("categoria", e.target.value)} />
            <datalist id="spCategoriasList">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="spDescripcion">Descripción / notas</Label>
            <Input id="spDescripcion" placeholder="Modelo compatible, observaciones..." value={datos.descripcion} onChange={(e) => actualizar("descripcion", e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="spCoste">Coste interno (€)</Label>
              <Input id="spCoste" type="number" min={0} step="0.01" value={datos.costeInterno} onChange={(e) => actualizar("costeInterno", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spPrecio">Precio cliente (€)</Label>
              <Input id="spPrecio" type="number" min={0} step="0.01" value={datos.precioCliente} onChange={(e) => actualizar("precioCliente", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="spManoObra">Mano de obra (€)</Label>
              <Input id="spManoObra" type="number" min={0} step="0.01" value={datos.manoObra} onChange={(e) => actualizar("manoObra", parseFloat(e.target.value) || 0)} />
              <p className="text-[11px] text-muted-foreground">Se suma automáticamente al elegir la pieza en presupuestos/facturas.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="spProveedor">Proveedor</Label>
              <Input id="spProveedor" value={datos.proveedor} onChange={(e) => actualizar("proveedor", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spStockDisp">Stock disponible</Label>
              <Input id="spStockDisp" type="number" min={0} step="1" value={datos.stockDisponible} onChange={(e) => actualizar("stockDisponible", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spStockMin">Stock mínimo (alerta)</Label>
              <Input id="spStockMin" type="number" min={0} step="1" value={datos.stockMinimo} onChange={(e) => actualizar("stockMinimo", parseInt(e.target.value) || 0)} />
            </div>
          </div>
          {esEdicion && (
            <div className="space-y-1.5 border-t pt-3">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> Historial de cambios
              </Label>
              {cargandoHistorial && <p className="text-xs text-muted-foreground">Cargando…</p>}
              {!cargandoHistorial && historial.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin cambios registrados todavía.</p>
              )}
              {!cargandoHistorial && historial.length > 0 && (
                <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-md border bg-muted/30 p-2">
                  {historial.map((h) => (
                    <div key={h.id} className="text-xs">
                      <span className="text-muted-foreground">
                        {new Date(h.fecha_hora).toLocaleString("es-ES")}
                        {h.usuario ? ` · ${h.usuario}` : ""}
                      </span>
                      <p>{h.descripcion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear pieza"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
