"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Clock } from "@/lib/icons";

interface PedidoStock {
  id: string | number;
  proveedor: string | null;
  costo_unitario: string | number | null;
  cantidad: number;
  fecha_pedido: string | null;
  estado: string;
  fecha_recibido: string | null;
}

interface EnlaceProveedor {
  id: string | number;
  proveedor: string | null;
  costo: string | number | null;
}

const euros = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));
const fmtEuros = (n: number | null) => (n === null || !Number.isFinite(n) ? "—" : n.toLocaleString("es-ES", { style: "currency", currency: "EUR" }));
const fmtFecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const clave = (nombre: string | null) => (nombre || "Sin proveedor").trim().toUpperCase();

const ETIQUETA_ESTADO: Record<string, string> = { pendiente: "Pedido", recibido: "Recibido", cancelado: "Cancelado" };
const COLOR_ESTADO: Record<string, string> = {
  pendiente: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  recibido: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelado: "bg-muted text-muted-foreground",
};

/** Historial de compras de una pieza de stock (tienda): cada vez que se pidió, a qué proveedor, a qué precio y cuántas unidades.
    Una misma pieza (p. ej. un cargador de un modelo) puede comprarse a varios proveedores con precios distintos; aquí se comparan.
    Se abre al pulsar un pedido de stock en Compras. Petición del usuario, 2026-10-26. */
export function HistorialPiezaDialog({ referencia, nombre, resaltarId, onOpenChange }: {
  referencia: string | null;
  nombre: string;
  resaltarId?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [datos, setDatos] = useState<{ referencia: string; pedidos: PedidoStock[]; enlaces: EnlaceProveedor[] } | null>(null);

  useEffect(() => {
    if (!referencia) return;
    let vigente = true;
    const ref = encodeURIComponent(referencia);
    Promise.all([
      fetch(`/api/stock-piezas/${ref}/pedidos`).then((r) => r.json()).catch(() => null),
      fetch(`/api/stock-piezas/${ref}/enlaces`).then((r) => r.json()).catch(() => null),
    ]).then(([p, e]) => {
      if (vigente) setDatos({ referencia, pedidos: p?.ok ? p.pedidos : [], enlaces: e?.ok ? e.enlaces : [] });
    });
    return () => { vigente = false; };
  }, [referencia]);

  const cargando = !!referencia && datos?.referencia !== referencia;
  const pedidos = useMemo(() => (datos?.referencia === referencia ? datos.pedidos : []), [datos, referencia]);
  const enlaces = useMemo(() => (datos?.referencia === referencia ? datos.enlaces : []), [datos, referencia]);

  const proveedores = useMemo(() => {
    const mapa = new Map<string, { nombre: string; pedidos: number; unidades: number; ultimoPrecio: number | null; ultimaFecha: string | null; precioActual: number | null }>();
    const ficha = (nombreProv: string | null) => {
      const k = clave(nombreProv);
      if (!mapa.has(k)) mapa.set(k, { nombre: k, pedidos: 0, unidades: 0, ultimoPrecio: null, ultimaFecha: null, precioActual: null });
      return mapa.get(k)!;
    };
    for (const e of enlaces) {
      const f = ficha(e.proveedor);
      const precio = euros(e.costo);
      if (precio !== null && (f.precioActual === null || precio < f.precioActual)) f.precioActual = precio;
    }
    // Los pedidos llegan del más reciente al más antiguo: el primero con precio es el último precio pagado.
    for (const p of pedidos) {
      if (p.estado === "cancelado") continue;
      const f = ficha(p.proveedor);
      f.pedidos += 1;
      f.unidades += p.cantidad;
      if (!f.ultimaFecha) f.ultimaFecha = p.fecha_pedido;
      const precio = euros(p.costo_unitario);
      if (f.ultimoPrecio === null && precio !== null) f.ultimoPrecio = precio;
    }
    return [...mapa.values()].sort((a, b) => (a.ultimoPrecio ?? a.precioActual ?? Infinity) - (b.ultimoPrecio ?? b.precioActual ?? Infinity));
  }, [pedidos, enlaces]);

  const masBarato = proveedores.length > 1 ? proveedores[0] : null;

  return (
    <Dialog open={!!referencia} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <div className="space-y-0.5 border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-1.5">
            <Clock className="size-5" /> Historial de compras de la pieza
          </DialogTitle>
          <DialogDescription>{nombre || "Pieza"} · ref. {referencia}</DialogDescription>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-4">
            {cargando && <p className="text-sm text-muted-foreground">Cargando…</p>}

            {!cargando && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Por proveedor</h3>
                {proveedores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Esta pieza no tiene proveedores ni pedidos registrados.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-2.5 py-1.5 text-left font-medium">Proveedor</th>
                          <th className="px-2.5 py-1.5 text-right font-medium">Pedidos</th>
                          <th className="px-2.5 py-1.5 text-right font-medium">Uds.</th>
                          <th className="px-2.5 py-1.5 text-right font-medium">Último precio</th>
                          <th className="px-2.5 py-1.5 text-right font-medium">Precio actual</th>
                          <th className="px-2.5 py-1.5 text-right font-medium">Último pedido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proveedores.map((p) => (
                          <tr key={p.nombre} className="border-t">
                            <td className="px-2.5 py-1.5 font-medium">
                              {p.nombre}
                              {masBarato?.nombre === p.nombre && (
                                <span className="ml-1.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Más barato</span>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5 text-right">{p.pedidos}</td>
                            <td className="px-2.5 py-1.5 text-right">{p.unidades}</td>
                            <td className="px-2.5 py-1.5 text-right">{fmtEuros(p.ultimoPrecio)}</td>
                            <td className="px-2.5 py-1.5 text-right">{fmtEuros(p.precioActual)}</td>
                            <td className="px-2.5 py-1.5 text-right">{fmtFecha(p.ultimaFecha)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {!cargando && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Todos los pedidos de esta pieza</h3>
                {pedidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todavía no se ha pedido esta pieza.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {pedidos.map((p) => (
                      <li
                        key={p.id}
                        className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border p-2.5 text-sm", resaltarId && String(p.id) === resaltarId && "border-primary/50 bg-primary/5")}
                      >
                        <div className="min-w-0">
                          <span className="font-medium">{clave(p.proveedor)}</span>
                          <span className="text-muted-foreground"> · {fmtFecha(p.fecha_pedido)}</span>
                          {p.fecha_recibido && <span className="text-muted-foreground"> · recibido {fmtFecha(p.fecha_recibido)}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{p.cantidad} ud.{euros(p.costo_unitario) !== null ? ` × ${fmtEuros(euros(p.costo_unitario))}` : ""}</span>
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", COLOR_ESTADO[p.estado] ?? "bg-muted text-muted-foreground")}>{ETIQUETA_ESTADO[p.estado] ?? p.estado}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
