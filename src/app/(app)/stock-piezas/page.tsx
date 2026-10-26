"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, Warning2, Add, Edit2, ScanBarcode, TickCircle } from "@/lib/icons";
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
import { imprimirEtiquetaPieza } from "@/lib/imprimir-etiqueta";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import { useConfirm } from "@/components/confirm-provider";
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
  const [imprimiendoEtiqueta, setImprimiendoEtiqueta] = useState<string | null>(null);
  const confirmar = useConfirm();

  async function imprimirEtiqueta(p: StockPieza) {
    const ok0 = await confirmar(`¿Imprimir la etiqueta de "${p.descripcion || p.nombre}" (ref ${p.referencia})?`, {
      titulo: "Imprimir etiqueta",
      detalle: "Se mandará a la impresora conectada a este PC ahora mismo.",
    });
    if (!ok0) return;

    setImprimiendoEtiqueta(p.referencia);
    try {
      const ok = await imprimirEtiquetaPieza(p.referencia, p.descripcion || p.nombre);
      if (ok) toast.success("Etiqueta enviada a la impresora");
      else toast.error("No se pudo imprimir — comprueba que el puente de impresión esté corriendo en este PC");
    } finally {
      setImprimiendoEtiqueta(null);
    }
  }
  const [editando, setEditando] = useState<StockPieza | null>(null);
  const esSuperadmin = useEsSuperadmin();

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
          p.nombreInternoProveedor.toLowerCase().includes(q) ||
          p.codigoProveedor.toLowerCase().includes(q) ||
          p.idPedidoProveedor.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q) ||
          p.proveedor.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [piezas, busqueda, categoria, soloBajo]);

  const bajoStockCount = useMemo(() => piezas.filter((p) => p.stockBajo).length, [piezas]);

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
          {esSuperadmin && (
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
          )}
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

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref.</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Coste</TableHead>
              <TableHead className="text-right" title="Precio cliente (sin IVA)">Precio</TableHead>
              <TableHead className="text-right">M. obra</TableHead>
              <TableHead className="text-right" title="Total cliente, con IVA incluido">Total</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
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
                  <TableCell className="max-w-[17rem] whitespace-normal">
                    <div className="flex items-start gap-1.5">
                      {p.nombreInternoProveedor ? (
                        <span title={`Equivalente: tiene nombre interno (${p.nombreInternoProveedor}) y la IA de «Subir pedido con IA» la reconoce`} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"><TickCircle className="size-3.5" /></span>
                      ) : (
                        <span title="Sin nombre interno (proveedor): la IA de «Subir pedido con IA» no podrá reconocerla por nombre" className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"><Warning2 className="size-3.5" /></span>
                      )}
                      <div className="min-w-0">
                        {p.nombre ? (
                          <div className="font-medium leading-tight">{p.nombre}</div>
                        ) : (
                          <div className="font-medium leading-tight text-amber-600 dark:text-amber-400" title="Sin nombre comercial todavía — se muestra el nombre interno de proveedor">
                            {p.nombreInternoProveedor || "(sin nombre)"}
                          </div>
                        )}
                        {p.descripcion && <div className="text-xs leading-tight text-muted-foreground">{p.descripcion}</div>}
                        {p.nombre && p.nombreInternoProveedor && (
                          <div className="text-xs leading-tight text-sky-600 dark:text-sky-400" title="Nombre interno (proveedor)">
                            {p.nombreInternoProveedor}
                          </div>
                        )}
                        {p.categoria && <span className="mt-0.5 inline-block rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">{p.categoria}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{euros(p.costeInterno)}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">{euros(p.precioCliente)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">{euros(p.manoObra)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    <span className="font-semibold text-primary">{euros(p.totalCliente)}</span>
                  </TableCell>
                  <TableCell className={`text-right text-sm tabular-nums ${p.stockBajo ? "font-semibold text-destructive" : ""}`}>
                    {p.stockDisponible}
                    {p.stockMinimo > 0 && <span className="text-xs text-muted-foreground" title="Stock mínimo"> / {p.stockMinimo}</span>}
                  </TableCell>
                  <TableCell className="max-w-[7rem] truncate text-sm text-muted-foreground" title={p.proveedor || undefined}>{p.proveedor || "-"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="h-7 w-7"
                        title={esSuperadmin ? "Editar" : "Ver"}
                        aria-label={esSuperadmin ? "Editar" : "Ver"}
                        onClick={() => {
                          setEditando(p);
                          setFormAbierto(true);
                        }}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      {p.categoria === "CARGADOR" && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={imprimiendoEtiqueta === p.referencia}
                          onClick={() => imprimirEtiqueta(p)}
                          title={imprimiendoEtiqueta === p.referencia ? "Imprimiendo..." : "Imprimir etiqueta con código de barras para pegar en el cargador"}
                          aria-label="Imprimir etiqueta"
                        >
                          <ScanBarcode className="size-3.5" />
                        </Button>
                      )}
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
        puedeEditarCatalogo={esSuperadmin}
        open={formAbierto}
        onOpenChange={setFormAbierto}
        onGuardado={cargar}
      />
    </div>
  );
}
