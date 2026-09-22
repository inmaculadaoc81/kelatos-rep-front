"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, Add, Edit2, Truck } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Proveedor } from "@/lib/proveedores";
import { ProveedorFormDialog } from "./proveedor-form-dialog";
import { toast } from "sonner";

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/proveedores?todos=true");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setProveedores(data.proveedores as Proveedor[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter((p) =>
      [p.nombre, p.dniCif, p.telefono, p.email, p.codigoInterno].some((v) => v.toLowerCase().includes(q))
    );
  }, [proveedores, busqueda]);

  async function alternarActivo(p: Proveedor) {
    try {
      const res = await fetch(`/api/proveedores/${p.proveedorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !p.activo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(p.activo ? "Proveedor desactivado" : "Proveedor activado");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  return (
    <div className="p-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-orange-500 to-amber-600 text-white">
            <Truck className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Proveedores</h1>
            <p className="text-sm text-muted-foreground">AliExpress, eBay, Amazon y demás proveedores de piezas — datos fiscales para Facturas Recibidas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setEditando(null); setFormAbierto(true); }}>
            <Add className="size-4" /> Nuevo proveedor
          </Button>
        </div>
      </div>

      <div className="relative w-full max-w-sm">
        <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, CIF, teléfono, email…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>DNI/CIF</TableHead>
              <TableHead>Código interno</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!cargando && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Ningún proveedor coincide con la búsqueda</TableCell>
              </TableRow>
            )}
            {!cargando &&
              filtrados.map((p) => (
                <TableRow key={p.proveedorId} className={p.activo ? undefined : "opacity-60"}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-sm">{p.dniCif || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm">{p.codigoInterno || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm">{p.telefono || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm">{p.email || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${p.activo ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {p.activo ? "Activo" : "Desactivado"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => { setEditando(p); setFormAbierto(true); }}>
                      <Edit2 className="size-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => alternarActivo(p)}>
                      {p.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <ProveedorFormDialog proveedorExistente={editando} open={formAbierto} onOpenChange={setFormAbierto} onGuardado={cargar} />
    </div>
  );
}
