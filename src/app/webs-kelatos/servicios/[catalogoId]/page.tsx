"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Add, Edit2, Trash, Box, Category as CategoryIcon, Money, Receipt, Refresh2, Gallery, SearchNormal1,
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
import { CatalogoServicios, ItemServicio } from "@/lib/catalogos-servicios";

// Catálogo de precios de servicio compartido por marca (Servicios Surface/
// Dyson/Thermomix) — independiente de Webs Kelatos. Fase actual: solo el
// catálogo interno ("por ahora creemos y pasemos todos los servicios");
// el enlace con páginas reales en Vercel es una fase posterior. Petición
// del usuario, 2026-09-09.

function euros(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function Pill({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: bg, color }}>
      {children}
    </span>
  );
}

interface DatosItem {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagenUrl: string;
  activo: boolean;
}

function datosVacios(): DatosItem {
  return { nombre: "", descripcion: "", precio: 0, categoria: "", imagenUrl: "", activo: true };
}

export default function CatalogoServiciosPage() {
  const params = useParams<{ catalogoId: string }>();
  const catalogoId = params.catalogoId;
  const confirmar = useConfirm();

  const [catalogo, setCatalogo] = useState<CatalogoServicios | null>(null);
  const [items, setItems] = useState<ItemServicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<ItemServicio | null>(null);
  const [datos, setDatos] = useState<DatosItem>(datosVacios());
  const [guardando, setGuardando] = useState(false);

  const [editarCatalogoAbierto, setEditarCatalogoAbierto] = useState(false);
  const [catalogoNombre, setCatalogoNombre] = useState("");
  const [guardandoCatalogo, setGuardandoCatalogo] = useState(false);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const [resCatalogos, resItems] = await Promise.all([
        fetch("/api/catalogos-servicios"),
        fetch(`/api/catalogos-servicios/${catalogoId}/items`),
      ]);
      const dataCatalogos = await resCatalogos.json();
      const dataItems = await resItems.json();
      if (!dataItems.ok) throw new Error(dataItems.error || "Error desconocido");
      const actual = (dataCatalogos.ok ? dataCatalogos.catalogos : []).find((c: CatalogoServicios) => String(c.id) === String(catalogoId));
      setCatalogo(actual || null);
      setItems(dataItems.items as ItemServicio[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogoId]);

  const itemsFiltrados = useMemo(() => {
    if (!busqueda.trim()) return items;
    const q = busqueda.trim().toLowerCase();
    return items.filter(
      (i) => i.nombre.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q) || i.descripcion.toLowerCase().includes(q)
    );
  }, [items, busqueda]);

  function abrirEditarCatalogo() {
    setCatalogoNombre(catalogo?.nombre || "");
    setEditarCatalogoAbierto(true);
  }

  async function guardarCatalogo() {
    if (!catalogoNombre.trim()) return toast.error("El nombre es obligatorio");
    setGuardandoCatalogo(true);
    try {
      const res = await fetch(`/api/catalogos-servicios/${catalogoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: catalogoNombre.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Catálogo actualizado");
      setEditarCatalogoAbierto(false);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardandoCatalogo(false);
    }
  }

  function abrirNuevo() {
    setEditando(null);
    setDatos(datosVacios());
    setDialogoAbierto(true);
  }

  function abrirEditar(i: ItemServicio) {
    setEditando(i);
    setDatos({
      nombre: i.nombre, descripcion: i.descripcion, precio: i.precio ?? 0,
      categoria: i.categoria, imagenUrl: i.imagenUrl, activo: i.activo,
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
        categoria: datos.categoria.trim(),
        imagenUrl: datos.imagenUrl.trim(),
        activo: datos.activo,
      };
      const res = await fetch(
        editando ? `/api/items-servicio/${editando.id}` : `/api/catalogos-servicios/${catalogoId}/items`,
        { method: editando ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(editando ? "Servicio actualizado" : "Servicio creado");
      setDialogoAbierto(false);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(i: ItemServicio) {
    const ok = await confirmar(`¿Eliminar «${i.nombre}»?`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/items-servicio/${i.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Servicio eliminado");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-sm">
            <Receipt className="size-5" />
          </span>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{catalogo?.nombre || "Cargando…"}</h1>
              {!cargando && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  <Box className="size-3" /> {items.length} servicio{items.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>Catálogo compartido — todavía sin páginas enlazadas</span>
              {!cargando && (
                <button type="button" onClick={abrirEditarCatalogo} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Edit2 className="size-3" /> Editar catálogo
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-9" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          <Button className="gap-1.5" onClick={abrirNuevo}>
            <Add className="size-4" /> Nuevo servicio
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
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Receipt className="size-8 text-muted-foreground" />
          <p className="font-semibold">Sin servicios todavía</p>
          <p className="text-sm text-muted-foreground">Pulsa «Nuevo servicio» para añadir el primero de {catalogo?.nombre}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative w-72">
            <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar servicio..." className="pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-14"></TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="sticky right-0 z-10 bg-muted/40 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Sin resultados para «{busqueda}»
                    </TableCell>
                  </TableRow>
                )}
                {itemsFiltrados.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      {i.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={i.imagenUrl} alt={i.nombre} className="size-10 rounded-lg border object-cover" />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                          <Gallery className="size-4" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{i.nombre}</p>
                      {i.descripcion && <p className="max-w-xs truncate text-xs text-muted-foreground">{i.descripcion}</p>}
                    </TableCell>
                    <TableCell>
                      {i.categoria ? (
                        <Pill bg="#e4e4e7" color="#3f3f46"><CategoryIcon className="size-3" /> {i.categoria}</Pill>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1"><Money className="size-3.5 text-muted-foreground" /> {euros(i.precio)}</span>
                    </TableCell>
                    <TableCell>
                      {i.activo
                        ? <Pill bg="#d1fae5" color="#065f46">Activo</Pill>
                        : <Pill bg="#e4e4e7" color="#3f3f46">Inactivo</Pill>}
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 whitespace-nowrap bg-background text-right">
                      <Button size="icon-sm" variant="outline" className="mr-1" title="Editar" onClick={() => abrirEditar(i)}>
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="outline" className="text-destructive" title="Eliminar" onClick={() => eliminar(i)}>
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

      <Dialog open={dialogoAbierto} onOpenChange={(o) => { if (!guardando) setDialogoAbierto(o); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="size-4.5" />
            </span>
            {editando ? "Editar servicio" : "Nuevo servicio"}
          </DialogTitle>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="servNombre">Nombre *</Label>
              <Input id="servNombre" value={datos.nombre} onChange={(e) => setDatos((d) => ({ ...d, nombre: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="servDescripcion">Descripción</Label>
              <Textarea id="servDescripcion" rows={2} value={datos.descripcion} onChange={(e) => setDatos((d) => ({ ...d, descripcion: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="servPrecio">Precio (€)</Label>
                <DecimalInput id="servPrecio" value={datos.precio} onChange={(n) => setDatos((d) => ({ ...d, precio: n }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="servCategoria">Categoría</Label>
                <Input id="servCategoria" placeholder="Ej: Reparación, Pieza..." value={datos.categoria} onChange={(e) => setDatos((d) => ({ ...d, categoria: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="servImagen">URL de imagen (opcional)</Label>
              <div className="flex items-center gap-2">
                {datos.imagenUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={datos.imagenUrl} alt="" className="size-10 shrink-0 rounded-lg border object-cover" />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                    <Gallery className="size-4" />
                  </span>
                )}
                <Input id="servImagen" placeholder="https://..." value={datos.imagenUrl} onChange={(e) => setDatos((d) => ({ ...d, imagenUrl: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
              <span>
                <span className="font-medium">Visible / activo</span>
                <p className="text-xs text-muted-foreground">Se mostrará en las páginas que enlacen este catálogo si está activado.</p>
              </span>
              <Switch checked={datos.activo} onCheckedChange={(v) => setDatos((d) => ({ ...d, activo: v === true }))} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)} disabled={guardando}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear servicio"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editarCatalogoAbierto} onOpenChange={(o) => { if (!guardandoCatalogo) setEditarCatalogoAbierto(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="size-4.5" />
            </span>
            Editar catálogo
          </DialogTitle>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="catNombre">Nombre *</Label>
              <Input id="catNombre" value={catalogoNombre} onChange={(e) => setCatalogoNombre(e.target.value)} autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarCatalogoAbierto(false)} disabled={guardandoCatalogo}>Cancelar</Button>
            <Button onClick={guardarCatalogo} disabled={guardandoCatalogo}>{guardandoCatalogo ? "Guardando..." : "Guardar cambios"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
