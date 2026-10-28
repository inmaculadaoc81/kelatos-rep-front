"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Box1, TickCircle } from "@/lib/icons";
import type { ArticuloFacturaEmparejado } from "@/app/api/facturas-recibidas/ocr/route";
import { motivoNombrePiezaInvalido } from "@/lib/facturas-recibidas";

export interface ArticuloStockEditable {
  nombre: string;
  cantidad: number;
  aplicar: boolean;
  /** Vacío si no hay coincidencia o el usuario la quitó — en ese caso se
      trata como pieza nueva. */
  referencia: string;
  nombrePiezaSugerida: string | null;
  /** Solo se usan cuando referencia está vacía (pieza nueva). */
  categoria: string;
  costeInterno: number;
  precioCliente: number;
  /** Señas del proveedor (como en "Subir pedido con IA"): se guardan en la
      pieza nueva para reconocerla en próximas facturas/pedidos. */
  codigoProveedor: string;
  idPedidoProveedor: string;
}

const CATEGORIAS_SUGERIDAS = ["CARGADOR", "DYSON", "THERMOMIX", "OTRO"];

export function articulosEmparejadosAEditables(articulos: ArticuloFacturaEmparejado[]): ArticuloStockEditable[] {
  return articulos.map((a) => ({
    nombre: a.nombre,
    cantidad: a.cantidad,
    // Transporte, envío y gastos de gestión no son piezas: empiezan desmarcados (se pueden marcar a mano).
    aplicar: !/\b(transporte|env[ií]o|portes?|gastos?\b.*\b(admin|gesti[oó]n|env[ií]o)|shipping|handling|embalaje)\b/i.test(a.nombre) || !!a.referenciaSugerida,
    referencia: a.referenciaSugerida || "",
    nombrePiezaSugerida: a.nombrePiezaSugerida,
    categoria: a.categoriaSugerida || "",
    // El precio de la factura es lo que costó (coste interno); el precio al cliente lo pone quien registra.
    costeInterno: a.precioUnitario ?? 0,
    precioCliente: a.precioClienteSugerido || 0,
    codigoProveedor: a.codigoProveedor || "",
    idPedidoProveedor: a.idPedidoProveedor || "",
  }));
}

/**
 * Revisión de los artículos que "Leer con IA" detectó en la factura (p. ej.
 * cargadores de AliExpress), ya emparejados por nombre contra Stock de
 * Piezas. El empleado confirma/corrige cada uno ANTES de registrar la
 * factura — nunca se toca el stock sin que alguien lo vea. Petición del
 * usuario, 2026-10-09.
 */
export function ArticulosStockRevision({
  articulos,
  onCambiar,
}: {
  articulos: ArticuloStockEditable[];
  onCambiar: (articulos: ArticuloStockEditable[]) => void;
}) {
  if (articulos.length === 0) return null;

  function actualizar(i: number, cambios: Partial<ArticuloStockEditable>) {
    onCambiar(articulos.map((a, idx) => (idx === i ? { ...a, ...cambios } : a)));
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <Box1 className="size-4" /> Artículos detectados en la factura
      </div>
      <p className="text-xs text-muted-foreground">
        Revisa cada uno — al registrar la factura se sumará esta cantidad al stock de la pieza emparejada, o se dará de alta como pieza nueva.
      </p>
      <div className="space-y-3">
        {articulos.map((a, i) => (
          <div key={i} className="space-y-2 rounded-md border bg-card p-2.5">
            <div className="flex items-start gap-2">
              <Checkbox checked={a.aplicar} onCheckedChange={(v) => actualizar(i, { aplicar: v === true })} className="mt-1" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {a.referencia ? (
                    <span className="text-sm font-medium">{a.nombre}</span>
                  ) : (
                    <Input className="h-8 min-w-64 max-w-xl flex-1 text-sm font-medium" placeholder="Nombre real del producto" value={a.nombre} onChange={(e) => actualizar(i, { nombre: e.target.value })} />
                  )}
                  {a.referencia && a.nombrePiezaSugerida && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <TickCircle className="size-3" /> {a.nombrePiezaSugerida} (ref {a.referencia})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cantidad</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8"
                      value={a.cantidad}
                      onChange={(e) => actualizar(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Referencia de Stock (vacío = pieza nueva)</Label>
                    <Input
                      className="h-8"
                      placeholder="Vacío = crear pieza nueva"
                      value={a.referencia}
                      onChange={(e) => actualizar(i, { referencia: e.target.value, nombrePiezaSugerida: null })}
                    />
                  </div>
                </div>

                {!a.referencia && a.aplicar && motivoNombrePiezaInvalido(a.nombre, { idPedido: a.idPedidoProveedor }) && (
                  <p className="text-xs font-medium text-destructive">No se puede dar de alta con este nombre: {motivoNombrePiezaInvalido(a.nombre, { idPedido: a.idPedidoProveedor })}. Escribe el nombre real del producto o desmárcalo.</p>
                )}
                {!a.referencia && (
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-2 sm:grid-cols-4">
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <Label className="text-xs text-muted-foreground">Categoría</Label>
                      <Select value={a.categoria} onValueChange={(v) => v && actualizar(i, { categoria: v })}>
                        <SelectTrigger className="h-8">
                          <SelectValue>{(v: string) => v || "— Elige categoría —"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS_SUGERIDAS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Coste interno (€)</Label>
                      <DecimalInput className="h-8" value={a.costeInterno} onChange={(n) => actualizar(i, { costeInterno: n })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Precio cliente (€)</Label>
                      <DecimalInput className="h-8" value={a.precioCliente} onChange={(n) => actualizar(i, { precioCliente: n })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Código proveedor</Label>
                      <Input className="h-8" value={a.codigoProveedor} onChange={(e) => actualizar(i, { codigoProveedor: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">ID de pedido</Label>
                      <Input className="h-8" value={a.idPedidoProveedor} onChange={(e) => actualizar(i, { idPedidoProveedor: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
