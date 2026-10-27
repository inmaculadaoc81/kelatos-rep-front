"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Trash, Warning2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { ArticuloFacturaEmparejado } from "@/app/api/facturas-recibidas/ocr/route";

/** Una línea (artículo) de la factura. Importes ANTES de impuestos y en la moneda de la factura. */
export interface LineaEditable {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
  codigoProveedor: string;
  idPedidoProveedor: string;
  /** Referencia de Stock de Piezas si la línea es un repuesto conocido. */
  referenciaPieza: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function lineaVacia(): LineaEditable {
  return { descripcion: "", cantidad: 1, precioUnitario: 0, importe: 0, codigoProveedor: "", idPedidoProveedor: "", referenciaPieza: "" };
}

/** Artículos que leyó la IA → líneas editables (si falta el precio o el importe, se deduce del otro). */
export function articulosALineas(articulos: ArticuloFacturaEmparejado[]): LineaEditable[] {
  return articulos.map((a) => {
    const cantidad = a.cantidad > 0 ? a.cantidad : 1;
    const importe = a.importe ?? (a.precioUnitario !== null && a.precioUnitario !== undefined ? r2(a.precioUnitario * cantidad) : 0);
    const precioUnitario = a.precioUnitario ?? (a.importe !== null && a.importe !== undefined ? r2(a.importe / cantidad) : 0);
    return {
      descripcion: a.nombre, cantidad, precioUnitario, importe,
      codigoProveedor: a.codigoProveedor || "", idPedidoProveedor: a.idPedidoProveedor || "", referenciaPieza: a.referenciaSugerida || "",
    };
  });
}

/** Línea guardada en el servidor → editable. */
export interface LineaApi {
  descripcion: string; cantidad: number; precio_unitario: number | null; importe: number | null;
  codigo_proveedor: string | null; id_pedido_proveedor: string | null; referencia_pieza: string | null;
}
export function lineaApiAEditable(l: LineaApi): LineaEditable {
  return {
    descripcion: l.descripcion, cantidad: l.cantidad, precioUnitario: l.precio_unitario ?? 0, importe: l.importe ?? 0,
    codigoProveedor: l.codigo_proveedor || "", idPedidoProveedor: l.id_pedido_proveedor || "", referenciaPieza: l.referencia_pieza || "",
  };
}

/**
 * Artículos de la factura, uno por línea: cada uno puede corresponder a un repuesto distinto, así que se registran por separado y no
 * agrupados en una sola descripción. «Leer con IA» las rellena; se pueden corregir, quitar o añadir a mano. La suma de los importes se
 * compara con la base imponible para detectar líneas que faltan (p. ej. los gastos de envío).
 */
export function LineasFactura({
  lineas, onCambiar, moneda, baseImponible,
}: {
  lineas: LineaEditable[];
  onCambiar: (lineas: LineaEditable[]) => void;
  /** Moneda de la factura (los importes de las líneas están en ella). */
  moneda: string;
  /** Base imponible en la MISMA moneda que las líneas. */
  baseImponible: number;
}) {
  const cambiar = (i: number, cambios: Partial<LineaEditable>) => onCambiar(lineas.map((l, j) => (j === i ? { ...l, ...cambios } : l)));
  const suma = r2(lineas.reduce((acc, l) => acc + (l.importe || 0), 0));
  const diferencia = r2(baseImponible - suma);
  const hayDiferencia = lineas.length > 0 && baseImponible > 0 && Math.abs(diferencia) > 0.05;
  const simbolo = moneda && moneda !== "EUR" ? moneda : "€";

  return (
    <div className="space-y-2">
      {lineas.length === 0 && <p className="text-sm text-muted-foreground">Sin artículos. «Leer con IA» los rellena, o añádelos a mano: cada línea de la factura debe quedar registrada.</p>}
      {lineas.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">Descripción</th>
                <th className="w-20 px-2 py-1.5 text-right font-medium">Cant.</th>
                <th className="w-28 px-2 py-1.5 text-right font-medium">Precio ud. ({simbolo})</th>
                <th className="w-28 px-2 py-1.5 text-right font-medium">Importe ({simbolo})</th>
                <th className="w-36 px-2 py-1.5 text-left font-medium">Cód. proveedor</th>
                <th className="w-36 px-2 py-1.5 text-left font-medium">Repuesto (ref. stock)</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="px-2 py-1.5"><Input value={l.descripcion} onChange={(e) => cambiar(i, { descripcion: e.target.value })} placeholder="Artículo" /></td>
                  <td className="px-2 py-1.5">
                    <DecimalInput className="text-right" value={l.cantidad} onChange={(n) => cambiar(i, { cantidad: n, ...(l.precioUnitario > 0 ? { importe: r2(n * l.precioUnitario) } : {}) })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <DecimalInput className="text-right" value={l.precioUnitario} onChange={(n) => cambiar(i, { precioUnitario: n, importe: r2(n * (l.cantidad || 1)) })} />
                  </td>
                  <td className="px-2 py-1.5"><DecimalInput className="text-right" value={l.importe} onChange={(n) => cambiar(i, { importe: n })} /></td>
                  <td className="px-2 py-1.5"><Input value={l.codigoProveedor} onChange={(e) => cambiar(i, { codigoProveedor: e.target.value })} /></td>
                  <td className="px-2 py-1.5"><Input value={l.referenciaPieza} onChange={(e) => cambiar(i, { referenciaPieza: e.target.value })} placeholder="opcional" /></td>
                  <td className="px-1 py-1.5">
                    <button type="button" className="mt-1.5 text-muted-foreground hover:text-destructive" title="Quitar esta línea" onClick={() => onCambiar(lineas.filter((_, j) => j !== i))}>
                      <Trash className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => onCambiar([...lineas, lineaVacia()])}>Añadir línea</Button>
        {lineas.length > 0 && (
          <span className={cn("text-xs tabular-nums", hayDiferencia ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground")}>
            {lineas.length} línea{lineas.length !== 1 ? "s" : ""} · suma {suma.toFixed(2)} {simbolo}
            {baseImponible > 0 && <> · base imponible {baseImponible.toFixed(2)} {simbolo}</>}
          </span>
        )}
      </div>
      {hayDiferencia && (
        <p className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <Warning2 className="mt-0.5 size-3.5 shrink-0" />
          <span>La suma de las líneas no coincide con la base imponible (diferencia {diferencia.toFixed(2)} {simbolo}). Puede faltar una línea (p. ej. gastos de envío) o haber un importe mal leído.</span>
        </p>
      )}
    </div>
  );
}
