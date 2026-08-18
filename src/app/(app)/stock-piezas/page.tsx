"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, Warning2, Add, Edit2, Trash } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { StockPieza } from "@/lib/stock-piezas";
import { PiezaStockFormDialog } from "./pieza-stock-form-dialog";

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function StockPiezasPage() {
  const [piezas, setPiezas] = useState<StockPieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [soloBajo, setSoloBajo] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<StockPieza | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/stock-piezas");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setPiezas(data.piezas as StockPieza[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const categorias = useMemo(() => {
    const set = new Set(piezas.map((p) => p.categoria).filter(Boolean));
    return Array.from(set).sort();
  }, [piezas]);

  const filtradas = useMemo(() => {
    let lista = piezas;
    if (soloBajo) lista = lista.filter((p) => p.stockBajo);
    if (categoria) lista = lista.filter((p) => p.categoria === categoria);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(
        (p) =>
          p.referencia.toLowerCase().includes(q) ||
          p.nombre.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q) ||
          p.proveedor.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [piezas, busqueda, categoria, soloBajo]);

  const bajoStockCount = useMemo(() => piezas.filter((p) => p.stockBajo).length, [piezas]);

  async function eliminar(p: StockPieza) {
    if (!window.confirm(`¿Eliminar la pieza "${p.nombre}" (${p.referencia})?\nEsta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/stock-piezas/${encodeURIComponent(p.referencia)}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pieza eliminada");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Stock de Piezas</h1>
          <p className="text-sm text-muted-foreground">Catálogo de piezas de repuesto para reparaciones</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditando(null);
              setFormAbierto(true);
            }}
          >
            <Add className="size-4" /> Nueva Pieza
          </Button>
        </div>
      </div>

      {bajoStockCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <Warning2 className="size-4 shrink-0" />
          <span>
            <strong>{bajoStockCount}</strong> {bajoStockCount === 1 ? "pieza está" : "piezas están"} por debajo de su stock mínimo.
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Referencia, nombre, proveedor..." className="pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={categoria || "__todas__"} onValueChange={(v) => setCategoria(!v || v === "__todas__" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue>{(v: string) => (v === "__todas__" ? "Todas las categorías" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas__">Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={soloBajo} onCheckedChange={(v) => setSoloBajo(v === true)} />
          Solo stock bajo
        </label>
        {!cargando && <span className="ml-auto text-sm text-muted-foreground">{filtradas.length} de {piezas.length} piezas</span>}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referencia</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Coste</TableHead>
              <TableHead className="text-right">Precio cliente</TableHead>
              <TableHead className="text-right">Mano de obra</TableHead>
              <TableHead className="text-right">Total cliente</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtradas.map((p) => (
                <TableRow key={p.referencia}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{p.referencia}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.nombre}</div>
                    {p.descripcion && <div className="text-xs text-muted-foreground">{p.descripcion}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.categoria || "-"}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{euros(p.costeInterno)}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">{euros(p.precioCliente)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">{euros(p.manoObra)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    <span className="font-semibold text-primary">{euros(p.totalCliente)}</span>
                    <span className="ml-1 text-[10px] text-muted-foreground">IVA inc.</span>
                  </TableCell>
                  <TableCell className={`text-right text-sm tabular-nums ${p.stockBajo ? "font-semibold text-destructive" : ""}`}>
                    {p.stockDisponible}
                    {p.stockMinimo > 0 && <span className="text-xs text-muted-foreground"> / min {p.stockMinimo}</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.proveedor || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1"
                        onClick={() => {
                          setEditando(p);
                          setFormAbierto(true);
                        }}
                      >
                        <Edit2 className="size-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={() => eliminar(p)}>
                        <Trash className="size-3.5" /> Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <PiezaStockFormDialog
        key={editando?.referencia || "__nueva__"}
        piezaExistente={editando}
        categorias={categorias}
        open={formAbierto}
        onOpenChange={setFormAbierto}
        onGuardado={cargar}
      />
    </div>
  );
}
