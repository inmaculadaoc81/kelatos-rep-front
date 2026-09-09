"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Category as CategoryIcon, Gallery, Money, Refresh2, SearchNormal1 } from "@/lib/icons";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PillBadge } from "@/components/pill-badge";
import { ItemServicio } from "@/lib/catalogos-servicios";

// Vista de solo lectura de los servicios que trae una web enlazada a un
// catálogo compartido de "Servicios" — misma tabla que se ve en Servicios
// Dyson/Surface/Thermomix, sin acciones: la gestión se hace desde el
// catálogo, no aquí, para que todas las webs enlazadas sigan mostrando
// exactamente lo mismo. Petición del usuario, 2026-09-09: "en la tabla
// de esa pagina en el dashboard se vera la lista completa".

function euros(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function CatalogoServiciosVista({ catalogoId, catalogoNombre }: { catalogoId: number; catalogoNombre: string }) {
  const [items, setItems] = useState<ItemServicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/catalogos-servicios/${catalogoId}/items`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setItems(data.items as ItemServicio[]);
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

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return items;
    const q = busqueda.trim().toLowerCase();
    return items.filter((i) => i.nombre.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q));
  }, [items, busqueda]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-72">
          <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar servicio..." className="pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-9" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" className="gap-1.5" render={<Link href={`/webs-kelatos/servicios/${catalogoId}`} />}>
            Gestionar en {catalogoNombre}
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
                <TableHead className="w-14"></TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Sin resultados
                  </TableCell>
                </TableRow>
              )}
              {filtrados.map((i) => (
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
                      <PillBadge bg="#e4e4e7" color="#3f3f46"><CategoryIcon className="size-3" /> {i.categoria}</PillBadge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1"><Money className="size-3.5 text-muted-foreground" /> {euros(i.precio)}</span>
                  </TableCell>
                  <TableCell>
                    {i.activo
                      ? <PillBadge bg="#d1fae5" color="#065f46">Activo</PillBadge>
                      : <PillBadge bg="#e4e4e7" color="#3f3f46">Inactivo</PillBadge>}
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
