"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, Add, Edit2, ArrowSwapHorizontal, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Producto, MovimientoInventario } from "@/lib/productos";
import { ProductoFormDialog } from "./producto-form-dialog";
import { MovimientoDialog } from "./movimiento-dialog";

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [movimientoAbierto, setMovimientoAbierto] = useState<Producto | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [resProductos, resMovimientos] = await Promise.all([fetch("/api/productos"), fetch("/api/inventario")]);
      const dataProductos = await resProductos.json();
      const dataMovimientos = await resMovimientos.json();
      if (!dataProductos.ok) throw new Error(dataProductos.error);
      if (!dataMovimientos.ok) throw new Error(dataMovimientos.error);
      setProductos(dataProductos.productos as Producto[]);
      setMovimientos(dataMovimientos.movimientos as MovimientoInventario[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.referencia.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q));
  }, [productos, busqueda]);

  const stockBajo = useMemo(() => productos.filter((p) => p.stockMinimo > 0 && p.stockActual <= p.stockMinimo), [productos]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Control de Stock</h1>
          <p className="text-sm text-muted-foreground">Gestión de productos e inventario de movimientos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setProductoEditando(null);
              setFormAbierto(true);
            }}
          >
            <Add className="size-4" /> Nuevo Producto
          </Button>
        </div>
      </div>

      {stockBajo.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <Warning2 className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Productos con stock bajo:</strong> {stockBajo.map((p) => `${p.nombre} (${p.stockActual})`).join(", ")}
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <Tabs defaultValue="productos">
        <TabsList>
          <TabsTrigger value="productos">Productos ({productos.length})</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="productos" className="pt-3">
          <div className="mb-3">
            <div className="relative w-72">
              <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar producto..." className="pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>P. Compra</TableHead>
                  <TableHead>P. Venta</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!cargando && productosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      Sin productos
                    </TableCell>
                  </TableRow>
                )}
                {!cargando &&
                  productosFiltrados.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-sm">{p.referencia || "-"}</TableCell>
                      <TableCell className="text-sm">{p.categoria || "-"}</TableCell>
                      <TableCell className={`text-sm ${p.stockMinimo > 0 && p.stockActual <= p.stockMinimo ? "font-semibold text-destructive" : ""}`}>
                        {p.stockActual} {p.unidad}
                      </TableCell>
                      <TableCell className="text-sm">{p.precioCompra.toFixed(2)} €</TableCell>
                      <TableCell className="text-sm">{p.precioVenta.toFixed(2)} €</TableCell>
                      <TableCell className="text-sm">{p.proveedor || "-"}</TableCell>
                      <TableCell className="text-sm">{p.ubicacion || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setMovimientoAbierto(p)}>
                            <ArrowSwapHorizontal className="size-3.5" /> Mov.
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1"
                            onClick={() => {
                              setProductoEditando(p);
                              setFormAbierto(true);
                            }}
                          >
                            <Edit2 className="size-3.5" /> Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="movimientos" className="pt-3">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Proveedor/Doc</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!cargando && movimientos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Sin movimientos
                    </TableCell>
                  </TableRow>
                )}
                {movimientos.map((m) => (
                  <TableRow key={m.idMovimiento}>
                    <TableCell className="text-sm">{m.fecha ? new Date(m.fecha).toLocaleString("es-ES") : "-"}</TableCell>
                    <TableCell className="text-sm">{m.tipo}</TableCell>
                    <TableCell className="text-sm">{m.producto}</TableCell>
                    <TableCell className="text-sm">{m.cantidad}</TableCell>
                    <TableCell className="text-sm">{m.stockAnterior} → {m.stockResultante}</TableCell>
                    <TableCell className="text-sm">{m.proveedorCliente || m.noDocumento || "-"}</TableCell>
                    <TableCell className="max-w-40 truncate text-sm text-muted-foreground">{m.notas || "-"}</TableCell>
                    <TableCell className="text-sm">{m.registradoPor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <ProductoFormDialog productoExistente={productoEditando} open={formAbierto} onOpenChange={setFormAbierto} onGuardado={cargar} />
      <MovimientoDialog producto={movimientoAbierto} open={movimientoAbierto !== null} onOpenChange={(o) => !o && setMovimientoAbierto(null)} onRegistrado={cargar} />
    </div>
  );
}
