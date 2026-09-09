"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Add, Edit2, Trash, Box, Category as CategoryIcon, Money, Global, Refresh2, Gallery, SearchNormal1,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useConfirm } from "@/components/confirm-provider";
import { toast } from "sonner";
import { ProductoWeb, SitioWeb } from "@/lib/webs-kelatos";
import { EquiposAlquilerVista } from "./equipos-alquiler-vista";
import { PiezasCargadorVista } from "./piezas-cargador-vista";

// Webs sincronizadas con datos reales de Reparaciones en vez del catálogo
// genérico de productos_web — petición del usuario, 2026-09-09: mismo
// listado de equipos/piezas, sin los botones de gestión completos, solo
// ver (y en el caso de alquiler, marcar disponible o no).
const SLUG_ALQUILER = "alquilerordenadores";
const SLUG_CARGADOR = "doncargador";

function euros(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

// Mismo patrón de pills pastel que asistencia/pills.tsx: span redondeado
// con color inline en vez de las variantes fijas de components/ui/badge.tsx
// — petición del usuario, 2026-09-09: "mas bonita la tabla, como en
// asistencias, los pills".
function Pill({ children, bg, color, className = "" }: { children: React.ReactNode; bg: string; color: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      style={{ backgroundColor: bg, color }}
    >
      {children}
    </span>
  );
}

function badgeStock(stock: number) {
  if (stock <= 0) return <Pill bg="#fee2e2" color="#991b1b">Sin stock</Pill>;
  if (stock < 5) return <Pill bg="#fef3c7" color="#92400e">{stock} uds.</Pill>;
  return <Pill bg="#d1fae5" color="#065f46">{stock} uds.</Pill>;
}

interface DatosProducto {
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  imagenUrl: string;
  activo: boolean;
}

function datosVacios(): DatosProducto {
  return { nombre: "", descripcion: "", precio: 0, stock: 0, categoria: "", imagenUrl: "", activo: true };
}

export default function SitioWebPage() {
  const params = useParams<{ sitioId: string }>();
  const sitioId = params.sitioId;
  const confirmar = useConfirm();

  const [sitio, setSitio] = useState<SitioWeb | null>(null);
  const [productos, setProductos] = useState<ProductoWeb[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<ProductoWeb | null>(null);
  const [datos, setDatos] = useState<DatosProducto>(datosVacios());
  const [guardando, setGuardando] = useState(false);

  // Editar la propia web (nombre/URL/slug) — el slug es el identificador
  // que usa GET /publico/productos/:slug, así que hace falta poder
  // asignarlo también a webs creadas antes de tener el endpoint público.
  const [editarWebAbierto, setEditarWebAbierto] = useState(false);
  const [webNombre, setWebNombre] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [webSlug, setWebSlug] = useState("");
  const [webTipo, setWebTipo] = useState("");
  const [guardandoWeb, setGuardandoWeb] = useState(false);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const [resSitios, resProductos] = await Promise.all([
        fetch("/api/sitios-web"),
        fetch(`/api/sitios-web/${sitioId}/productos`),
      ]);
      const dataSitios = await resSitios.json();
      const dataProductos = await resProductos.json();
      if (!dataProductos.ok) throw new Error(dataProductos.error || "Error desconocido");
      const sitioActual = (dataSitios.ok ? dataSitios.sitios : []).find((s: SitioWeb) => String(s.id) === String(sitioId));
      setSitio(sitioActual || null);
      setProductos(dataProductos.productos as ProductoWeb[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitioId]);

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    const q = busqueda.trim().toLowerCase();
    return productos.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  function abrirEditarWeb() {
    setWebNombre(sitio?.nombre || "");
    setWebUrl(sitio?.url || "");
    setWebSlug(sitio?.slug || "");
    setWebTipo(sitio?.tipo || "");
    setEditarWebAbierto(true);
  }

  async function guardarWeb() {
    if (!webNombre.trim()) return toast.error("El nombre es obligatorio");
    setGuardandoWeb(true);
    try {
      const res = await fetch(`/api/sitios-web/${sitioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: webNombre.trim(), url: webUrl.trim(), slug: webSlug.trim(), tipo: webTipo.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Web actualizada");
      setEditarWebAbierto(false);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardandoWeb(false);
    }
  }

  function abrirNuevo() {
    setEditando(null);
    setDatos(datosVacios());
    setDialogoAbierto(true);
  }

  function abrirEditar(p: ProductoWeb) {
    setEditando(p);
    setDatos({
      nombre: p.nombre, descripcion: p.descripcion, precio: p.precio ?? 0, stock: p.stock,
      categoria: p.categoria, imagenUrl: p.imagenUrl, activo: p.activo,
    });
    setDialogoAbierto(true);
  }

  async function guardar() {
    if (!datos.nombre.trim()) return toast.error("El nombre es obligatorio");
    setGuardando(true);
    try {
      const payload = {
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion.trim(),
        precio: datos.precio,
        stock: datos.stock,
        categoria: datos.categoria.trim(),
        imagenUrl: datos.imagenUrl.trim(),
        activo: datos.activo,
      };
      const res = await fetch(
        editando ? `/api/productos-web/${editando.id}` : `/api/sitios-web/${sitioId}/productos`,
        { method: editando ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(editando ? "Producto actualizado" : "Producto creado");
      setDialogoAbierto(false);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(p: ProductoWeb) {
    const ok = await confirmar(`¿Eliminar «${p.nombre}»?`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/productos-web/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Producto eliminado");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  const esAlquiler = sitio?.slug === SLUG_ALQUILER;
  const esCargador = sitio?.slug === SLUG_CARGADOR;
  const esVistaSincronizada = esAlquiler || esCargador;
  const endpointPublico = esAlquiler ? "/publico/equipos-alquiler" : esCargador ? "/publico/piezas-cargador" : `/publico/productos/${sitio?.slug || "—"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-green-600 text-white shadow-sm">
            <Global className="size-5" />
          </span>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{sitio?.nombre || "Cargando…"}</h1>
              {!cargando && !esVistaSincronizada && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  <Box className="size-3" /> {productos.length} producto{productos.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {sitio?.url && (
                <a href={sitio.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {sitio.url}
                </a>
              )}
              {!cargando && (
                <span className="inline-flex items-center gap-1">
                  Endpoint <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{endpointPublico}</code>
                </span>
              )}
              {!cargando && (
                <button type="button" onClick={abrirEditarWeb} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Edit2 className="size-3" /> Editar web
                </button>
              )}
            </div>
          </div>
        </div>
        {!esVistaSincronizada && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-9" onClick={cargar} title="Actualizar">
              <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
            </Button>
            <Button className="gap-1.5" onClick={abrirNuevo}>
              <Add className="size-4" /> Nuevo producto
            </Button>
          </div>
        )}
      </div>

      {esAlquiler ? (
        <EquiposAlquilerVista />
      ) : esCargador ? (
        <PiezasCargadorVista />
      ) : (
        <>
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
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Box className="size-8 text-muted-foreground" />
          <p className="font-semibold">Sin productos todavía</p>
          <p className="text-sm text-muted-foreground">Pulsa «Nuevo producto» para añadir el primero de {sitio?.nombre}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative w-72">
            <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar producto..." className="pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-14"></TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="sticky right-0 z-10 bg-muted/40 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Sin resultados para «{busqueda}»
                    </TableCell>
                  </TableRow>
                )}
                {productosFiltrados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imagenUrl} alt={p.nombre} className="size-10 rounded-lg border object-cover" />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                          <Gallery className="size-4" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{p.nombre}</p>
                      {p.descripcion && <p className="max-w-xs truncate text-xs text-muted-foreground">{p.descripcion}</p>}
                    </TableCell>
                    <TableCell>
                      {p.categoria ? (
                        <Pill bg="#e4e4e7" color="#3f3f46"><CategoryIcon className="size-3" /> {p.categoria}</Pill>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1"><Money className="size-3.5 text-muted-foreground" /> {euros(p.precio)}</span>
                    </TableCell>
                    <TableCell>{badgeStock(p.stock)}</TableCell>
                    <TableCell>
                      {p.activo
                        ? <Pill bg="#d1fae5" color="#065f46">Activo</Pill>
                        : <Pill bg="#e4e4e7" color="#3f3f46">Inactivo</Pill>}
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 whitespace-nowrap bg-background text-right">
                      <Button size="icon-sm" variant="outline" className="mr-1" title="Editar" onClick={() => abrirEditar(p)}>
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="outline" className="text-destructive" title="Eliminar" onClick={() => eliminar(p)}>
                        <Trash className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
        </>
      )}

      <Dialog open={dialogoAbierto} onOpenChange={(o) => { if (!guardando) setDialogoAbierto(o); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Box className="size-4.5" />
            </span>
            {editando ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="prodNombre">Nombre *</Label>
              <Input id="prodNombre" value={datos.nombre} onChange={(e) => setDatos((d) => ({ ...d, nombre: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prodDescripcion">Descripción</Label>
              <Textarea id="prodDescripcion" rows={2} value={datos.descripcion} onChange={(e) => setDatos((d) => ({ ...d, descripcion: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prodPrecio">Precio (€)</Label>
                <DecimalInput id="prodPrecio" value={datos.precio} onChange={(n) => setDatos((d) => ({ ...d, precio: n }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prodStock">Stock</Label>
                <DecimalInput id="prodStock" value={datos.stock} onChange={(n) => setDatos((d) => ({ ...d, stock: Math.max(0, Math.trunc(n)) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prodCategoria">Categoría</Label>
              <Input id="prodCategoria" placeholder="Ej: Portátiles, Accesorios..." value={datos.categoria} onChange={(e) => setDatos((d) => ({ ...d, categoria: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prodImagen">URL de imagen (opcional)</Label>
              <div className="flex items-center gap-2">
                {datos.imagenUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={datos.imagenUrl} alt="" className="size-10 shrink-0 rounded-lg border object-cover" />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                    <Gallery className="size-4" />
                  </span>
                )}
                <Input id="prodImagen" placeholder="https://..." value={datos.imagenUrl} onChange={(e) => setDatos((d) => ({ ...d, imagenUrl: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
              <span>
                <span className="font-medium">Visible / activo</span>
                <p className="text-xs text-muted-foreground">Se muestra en la web pública si está activado.</p>
              </span>
              <Switch checked={datos.activo} onCheckedChange={(v) => setDatos((d) => ({ ...d, activo: v === true }))} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)} disabled={guardando}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear producto"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editarWebAbierto} onOpenChange={(o) => { if (!guardandoWeb) setEditarWebAbierto(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Global className="size-4.5" />
            </span>
            Editar web
          </DialogTitle>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="webNombre">Nombre *</Label>
              <Input id="webNombre" value={webNombre} onChange={(e) => setWebNombre(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webUrl">URL</Label>
              <Input id="webUrl" placeholder="https://..." value={webUrl} onChange={(e) => setWebUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webTipo">Marca / tipo</Label>
              <Input id="webTipo" placeholder="Ej: Lenovo, Dyson..." value={webTipo} onChange={(e) => setWebTipo(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Agrupa esta web con otras del mismo tipo en el sidebar.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webSlug">Identificador (slug) para el endpoint público</Label>
              <Input id="webSlug" placeholder="mi-web" value={webSlug} onChange={(e) => setWebSlug(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">
                La web en Vercel lo usará como <code>GET /publico/productos/{webSlug || "…"}</code>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarWebAbierto(false)} disabled={guardandoWeb}>Cancelar</Button>
            <Button onClick={guardarWeb} disabled={guardandoWeb}>{guardandoWeb ? "Guardando..." : "Guardar cambios"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
