"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Refresh2, SearchNormal1 } from "@/lib/icons";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StockPieza } from "@/lib/stock-piezas";

// Vista reducida de "Stock de Piezas" para la web pública de DonCargador —
// mismos datos reales (misma tabla kelatos_app.stock_piezas que ya consume
// el endpoint público /publico/piezas-cargador), filtrados a categoría
// CARGADOR. Solo lectura: la gestión (crear/editar/eliminar/reponer stock)
// sigue haciéndose desde Stock de Piezas, no duplicada aquí. Petición del
// usuario, 2026-09-09: "en la tabla de lista de don cargador poner los
// items de cargador que estan en stock de piezas".
const CATEGORIA_CARGADOR = "CARGADOR";

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function badgeStock(stock: number, minimo: number) {
  const bajo = minimo > 0 && stock < minimo;
  const estilo = stock <= 0 ? { bg: "#fee2e2", color: "#991b1b" } : bajo ? { bg: "#fef3c7", color: "#92400e" } : { bg: "#d1fae5", color: "#065f46" };
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: estilo.bg, color: estilo.color }}>
      {stock} {minimo > 0 ? `/ min ${minimo}` : ""}
    </span>
  );
}

export function PiezasCargadorVista() {
  const [piezas, setPiezas] = useState<StockPieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/stock-piezas");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      const todas = data.piezas as StockPieza[];
      setPiezas(todas.filter((p) => p.categoria === CATEGORIA_CARGADOR));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtradas = useMemo(() => {
    if (!busqueda.trim()) return piezas;
    const q = busqueda.trim().toLowerCase();
    return piezas.filter((p) => p.nombre.toLowerCase().includes(q) || p.referencia.toLowerCase().includes(q));
  }, [piezas, busqueda]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-72">
          <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cargador..." className="pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-9" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" className="gap-1.5" render={<Link href="/stock-piezas" />}>
            Gestionar en Stock de Piezas
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      {cargando ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Referencia</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio cliente</TableHead>
                <TableHead>Total cliente</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">En la web pública</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Sin resultados
                  </TableCell>
                </TableRow>
              )}
              {filtradas.map((p) => (
                <TableRow key={p.referencia}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.referencia}</TableCell>
                  <TableCell>
                    <p className="font-medium">{p.nombre}</p>
                    {p.descripcion && <p className="max-w-xs truncate text-xs text-muted-foreground">{p.descripcion}</p>}
                  </TableCell>
                  <TableCell className="text-sm">{euros(p.precioCliente)}</TableCell>
                  <TableCell className="font-medium">{euros(p.totalCliente)}</TableCell>
                  <TableCell>{badgeStock(p.stockDisponible, p.stockMinimo)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {p.stockDisponible > 0 ? "Visible" : "Oculto (sin stock)"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
