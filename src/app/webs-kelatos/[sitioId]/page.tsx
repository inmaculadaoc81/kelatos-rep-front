"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Add, Edit2, Trash, Box, Category as CategoryIcon, Money, Global, Refresh2, Gallery,
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

function euros(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function badgeStock(stock: number) {
  if (stock <= 0) return <Badge variant="destructive">Sin stock</Badge>;
  if (stock < 5) return <Badge className="bg-amber-500 text-white hover:bg-amber-500">{stock} uds.</Badge>;
  return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{stock} uds.</Badge>;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-green-600 text-white">
              <Global className="size-4" />
            </span>
            {sitio?.nombre || "Cargando…"}
            {!cargando && (
              <Badge variant="secondary" className="ml-1 gap-1 font-normal">
                <Box className="size-3" /> {productos.length} producto{productos.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
            {sitio?.url && (
              <a href={sitio.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {sitio.url}
              </a>
            )}
            {!cargando && (
              <span className="text-muted-foreground">
                Endpoint: <code className="rounded bg-muted px-1 py-0.5 text-xs">/publico/productos/{sitio?.slug || "—"}</code>
              </span>
            )}
            {!cargando && (
              <button type="button" onClick={abrirEditarWeb} className="text-xs text-primary hover:underline">
                Editar web
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          <Button className="gap-1.5" onClick={abrirNuevo}>
            <Add className="size-4" /> Nuevo producto
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
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Box className="size-8 text-muted-foreground" />
          <p className="font-semibold">Sin productos todavía</p>
          <p className="text-sm text-muted-foreground">Pulsa «Nuevo producto» para añadir el primero de {sitio?.nombre}.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="sticky right-0 z-10 bg-background text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagenUrl} alt={p.nombre} className="size-9 rounded-md border object-cover" />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-md border bg-muted text-muted-foreground">
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
                      <Badge variant="outline" className="gap-1"><CategoryIcon className="size-3" /> {p.categoria}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1"><Money className="size-3.5 text-muted-foreground" /> {euros(p.precio)}</span>
                  </TableCell>
                  <TableCell>{badgeStock(p.stock)}</TableCell>
                  <TableCell>
                    {p.activo
                      ? <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Activo</Badge>
                      : <Badge variant="secondary">Inactivo</Badge>}
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
      )}

      <Dialog open={dialogoAbierto} onOpenChange={(o) => { if (!guardando) setDialogoAbierto(o); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle className="flex items-center gap-2">
            <Box className="size-5" /> {editando ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <div className="space-y-3">
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
              <Input id="prodImagen" placeholder="https://..." value={datos.imagenUrl} onChange={(e) => setDatos((d) => ({ ...d, imagenUrl: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={datos.activo} onCheckedChange={(v) => setDatos((d) => ({ ...d, activo: v === true }))} />
              Visible / activo
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
          <DialogTitle className="flex items-center gap-2">
            <Global className="size-4.5" /> Editar web
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
