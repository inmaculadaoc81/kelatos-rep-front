"use client";

import { useCallback, useEffect, useState } from "react";
import { Refresh2, SearchNormal1 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Movimiento {
  id: string;
  fecha_hora: string;
  referencia: string;
  nombre: string | null;
  usuario: string | null;
  descripcion: string;
  tipo: string;
  documento: string | null;
  cantidad: string | null;
  stock_antes: string | null;
  stock_despues: string | null;
}

const TIPOS: Record<string, { etiqueta: string; clase: string; ayuda: string }> = {
  salida_factura: {
    etiqueta: "Salida por factura/ticket",
    clase: "bg-red-500/10 text-red-700 dark:text-red-400",
    ayuda: "Baja el stock cuando una factura o ticket (de reparación, venta o manual) lleva una línea con referencia de pieza. Es el uso de la pieza en un servicio o venta facturada.",
  },
  salida_venta: {
    etiqueta: "Salida por venta",
    clase: "bg-red-500/10 text-red-700 dark:text-red-400",
    ayuda: "Baja el stock por una venta registrada en el módulo Ventas.",
  },
  salida_reparacion: {
    etiqueta: "Salida por reparación",
    clase: "bg-red-500/10 text-red-700 dark:text-red-400",
    ayuda: "Baja el stock cuando una reparación pasa a «Reparado»: se descuentan las piezas de stock del presupuesto aceptado y las piezas compradas por pedido para ese equipo. Las anteriores al 18/11 están reconstruidas (sin stock antes/después).",
  },
  reposicion_factura: {
    etiqueta: "Reposición (rectificativa)",
    clase: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    ayuda: "Sube el stock cuando una factura rectificativa (Serie 3) anula o devuelve una línea con pieza: la pieza vuelve al almacén.",
  },
  entrada: {
    etiqueta: "Entrada por compra",
    clase: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    ayuda: "Sube el stock al recibir piezas de un pedido o compra a proveedor.",
  },
  ajuste_manual: {
    etiqueta: "Ajuste manual",
    clase: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    ayuda: "Alguien cambió a mano la cantidad disponible en Stock de Piezas (inventario, corrección de errores, mermas…).",
  },
  sin_pieza: {
    etiqueta: "NO descontado (referencia sin pieza)",
    clase: "bg-red-600 text-white",
    ayuda: "Se facturó una línea con una referencia que no existe en Stock de Piezas, así que no se descontó nada. Conviene revisarla.",
  },
  edicion: {
    etiqueta: "Edición de la ficha",
    clase: "bg-muted text-muted-foreground",
    ayuda: "Se modificaron datos de la pieza (nombre, precio, proveedor…) sin cambiar la cantidad.",
  },
  pedido: {
    etiqueta: "Pedido de reposición",
    clase: "bg-muted text-muted-foreground",
    ayuda: "Se pidió reposición de la pieza al proveedor. Todavía no cambia el stock; lo hará la entrada por compra.",
  },
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmtFecha = (s: string) =>
  new Date(s).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Movimientos de stock: todo lo que sube o baja el stock en un solo listado (petición del usuario, 2026-11-18).
    Los descuentos por facturación se apuntan desde 2026-11-18; lo anterior solo muestra ajustes manuales, entradas y ventas. */
export default function StockMovimientosPage() {
  const [desde, setDesde] = useState(() => iso(new Date(Date.now() - 30 * 86400000)));
  const [hasta, setHasta] = useState(() => iso(new Date()));
  const [tipo, setTipo] = useState("");
  const [q, setQ] = useState("");
  const [datos, setDatos] = useState<Movimiento[]>([]);
  const [conteo, setConteo] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const p = new URLSearchParams({ desde, hasta, limit: "1000" });
      if (tipo) p.set("tipo", tipo);
      if (q.trim()) p.set("q", q.trim());
      const r = await fetch(`/api/stock-piezas/movimientos?${p}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error");
      setDatos(j.movimientos);
      setConteo(j.conteo || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, tipo, q]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  const sinPieza = conteo.sin_pieza || 0;
  const porDefecto = { desde: iso(new Date(Date.now() - 30 * 86400000)), hasta: iso(new Date()) };
  const hayFiltros = tipo !== "" || q.trim() !== "" || desde !== porDefecto.desde || hasta !== porDefecto.hasta;
  const limpiar = () => {
    setTipo("");
    setQ("");
    setDesde(porDefecto.desde);
    setHasta(porDefecto.hasta);
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Movimientos de stock</h1>
          <p className="text-sm text-muted-foreground">Salidas por facturación y ventas, entradas por compra y ajustes manuales, en un solo sitio</p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        {(["salida_factura", "salida_reparacion", "salida_venta", "reposicion_factura", "entrada", "ajuste_manual", "sin_pieza"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(tipo === t ? "" : t)}
            title={TIPOS[t].ayuda}
            className={`rounded-md px-2.5 py-1 font-medium ${TIPOS[t].clase} ${tipo === t ? "ring-2 ring-foreground/40" : ""}`}
          >
            {TIPOS[t].etiqueta}: {conteo[t] || 0}
          </button>
        ))}
        {hayFiltros && (
          <button type="button" onClick={limpiar} className="rounded-md border px-2.5 py-1 font-medium hover:bg-muted">
            Quitar filtros
          </button>
        )}
      </div>

      <details className="mb-3 rounded-md border bg-muted/30 px-4 py-2 text-sm">
        <summary className="cursor-pointer font-medium">¿Qué significa cada movimiento?</summary>
        <ul className="mt-2 space-y-1.5">
          {Object.values(TIPOS).map((t) => (
            <li key={t.etiqueta} className="flex flex-wrap items-start gap-2">
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${t.clase}`}>{t.etiqueta}</span>
              <span className="text-muted-foreground">{t.ayuda}</span>
            </li>
          ))}
        </ul>
      </details>

      {sinPieza > 0 && (
        <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-400">
          {sinPieza} línea(s) facturadas con una referencia que no existe en Stock de Piezas: no se descontó nada. Revísalas (filtro «NO descontado»).
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input type="date" className="w-40" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
        <span className="text-sm text-muted-foreground">a</span>
        <Input type="date" className="w-40" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
        <div className="relative w-64">
          <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Referencia, pieza o documento..." className="pl-7" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={tipo || "__todos__"} onValueChange={(v) => setTipo(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-56">
            <SelectValue>{(v: string) => (v === "__todos__" ? "Todos los movimientos" : TIPOS[v]?.etiqueta || v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los movimientos</SelectItem>
            {Object.entries(TIPOS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Movimiento</TableHead>
              <TableHead>Pieza</TableHead>
              <TableHead>Documento / detalle</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && datos.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : datos.map((m) => {
                  const t = TIPOS[m.tipo] || { etiqueta: m.tipo, clase: "bg-muted text-muted-foreground" };
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmtFecha(m.fecha_hora)}</TableCell>
                      <TableCell>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${t.clase}`}>{t.etiqueta}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{m.referencia}</div>
                        <div className="text-muted-foreground">{m.nombre || ""}</div>
                      </TableCell>
                      <TableCell className="max-w-96 text-xs">{m.documento || m.descripcion}</TableCell>
                      <TableCell className="text-right text-xs">{m.cantidad ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs">
                        {m.stock_antes !== null && m.stock_despues !== null ? `${m.stock_antes} → ${m.stock_despues}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.usuario || (m.tipo.includes("factura") || m.tipo === "salida_reparacion" ? "automático" : "—")}</TableCell>
                    </TableRow>
                  );
                })}
            {!cargando && datos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Sin movimientos en este periodo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
