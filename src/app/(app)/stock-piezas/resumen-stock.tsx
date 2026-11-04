"use client";

import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Warning2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { StockPieza } from "@/lib/stock-piezas";

const eur0 = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";
const CAT_PEDIDO = "COMPRA POR PEDIDO";
const CAT_DEVOLUCION = "DEVOLUCIÓN A PROVEEDOR";

function Tarjeta({ titulo, valor, pie, tono, onClick, activa }: { titulo: string; valor: string; pie?: string; tono?: "rojo" | "ambar" | "verde"; onClick?: () => void; activa?: boolean }) {
  const color = tono === "rojo" ? "text-destructive" : tono === "ambar" ? "text-amber-600 dark:text-amber-400" : tono === "verde" ? "text-emerald-600 dark:text-emerald-400" : "";
  const contenido = (
    <>
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className={cn("mt-1 text-2xl leading-none font-semibold tabular-nums", color)}>{valor}</p>
      {pie && <p className="mt-1.5 text-[11px] text-muted-foreground">{pie}</p>}
    </>
  );
  const clases = cn("rounded-lg border bg-card p-3 text-left", activa && "ring-2 ring-primary/40", onClick && "cursor-pointer transition-colors hover:bg-muted/40");
  return onClick ? <button type="button" className={clases} onClick={onClick}>{contenido}</button> : <div className={clases}>{contenido}</div>;
}

/**
 * Resumen del almacén en tarjetas (en lugar de una sola línea de aviso): cuántas piezas hay, cuáles faltan, cuánto vale lo almacenado y lo que
 * viene de pedidos de reparación. «Stock bajo» abre un desplegable con las categorías afectadas y las piezas más urgentes.
 */
export function ResumenStock({ piezas, soloBajo, onSoloBajo, onCategoria }: { piezas: StockPieza[]; soloBajo: boolean; onSoloBajo: (v: boolean) => void; onCategoria: (c: string) => void }) {
  const r = useMemo(() => {
    const activas = piezas.filter((p) => p.activo !== false);
    const bajas = activas.filter((p) => p.stockBajo);
    const porCategoria = new Map<string, number>();
    for (const p of bajas) porCategoria.set(p.categoria || "Sin categoría", (porCategoria.get(p.categoria || "Sin categoría") ?? 0) + 1);
    const urgentes = [...bajas].sort((a, b) => a.stockDisponible - a.stockMinimo - (b.stockDisponible - b.stockMinimo) || a.stockDisponible - b.stockDisponible).slice(0, 8);
    return {
      total: activas.length,
      bajas: bajas.length,
      sinStock: activas.filter((p) => p.stockDisponible <= 0 && p.categoria !== CAT_DEVOLUCION && p.categoria !== CAT_PEDIDO).length,
      valor: activas.reduce((t, p) => t + Math.max(p.stockDisponible, 0) * (p.costeInterno || 0), 0),
      categorias: [...porCategoria.entries()].sort((a, b) => b[1] - a[1]),
      urgentes,
      pedidoEnStock: activas.filter((p) => p.categoria === CAT_PEDIDO && p.stockDisponible > 0).length,
      aDevolver: activas.filter((p) => p.categoria === CAT_DEVOLUCION).length,
    };
  }, [piezas]);

  if (!piezas.length) return null;
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
      <Tarjeta titulo="Piezas en catálogo" valor={String(r.total)} pie={`Valor del almacén: ${eur0(r.valor)}`} />

      <Popover>
        <PopoverTrigger
          render={
            <button type="button" className={cn("rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/40", soloBajo && "ring-2 ring-primary/40")}>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">{r.bajas > 0 && <Warning2 className="size-3.5 text-destructive" />} Stock bajo</p>
              <p className={cn("mt-1 text-2xl leading-none font-semibold tabular-nums", r.bajas ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>{r.bajas}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{r.bajas ? "Pulsa para ver cuáles" : "Todo por encima del mínimo"}</p>
            </button>
          }
        />
        {r.bajas > 0 && (
          <PopoverContent align="start" className="w-80 space-y-3 p-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold">Por categoría</p>
              <div className="flex flex-wrap gap-1.5">
                {r.categorias.map(([c, n]) => (
                  <button key={c} type="button" onClick={() => { onCategoria(c === "Sin categoría" ? "" : c); onSoloBajo(true); }} className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted">
                    {c} <b>{n}</b>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold">Las más urgentes</p>
              <ul className="divide-y rounded-md border text-xs">
                {r.urgentes.map((p) => (
                  <li key={p.referencia} className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate" title={p.nombre || p.referencia}>{p.nombre || p.referencia}</span>
                    <span className={cn("shrink-0 tabular-nums", p.stockDisponible <= 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>{p.stockDisponible} / mín. {p.stockMinimo}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button size="sm" className="w-full" onClick={() => { onCategoria(""); onSoloBajo(true); }}>Ver las {r.bajas} en la tabla</Button>
          </PopoverContent>
        )}
      </Popover>

      <Tarjeta titulo="Sin stock" valor={String(r.sinStock)} tono={r.sinStock ? "ambar" : undefined} pie="Piezas con 0 o menos" />
      <Tarjeta titulo="De pedidos, sin instalar" valor={String(r.pedidoEnStock)} tono={r.pedidoEnStock ? "ambar" : undefined} pie="Compradas para una reparación y aún sin usar" onClick={r.pedidoEnStock ? () => { onSoloBajo(false); onCategoria(CAT_PEDIDO); } : undefined} />
      <Tarjeta titulo="A devolver al proveedor" valor={String(r.aDevolver)} tono={r.aDevolver ? "rojo" : undefined} pie="Piezas defectuosas con su código RMA" onClick={r.aDevolver ? () => { onSoloBajo(false); onCategoria(CAT_DEVOLUCION); } : undefined} />
    </div>
  );
}
