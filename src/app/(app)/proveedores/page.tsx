"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, Add, Edit2, Truck } from "@/lib/icons";
import { Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Proveedor } from "@/lib/proveedores";

/** Marcas habituales del taller, ofrecidas como sugerencia al editar un proveedor aunque aún no las use ninguno. */
const MARCAS_HABITUALES = ["HP", "Dell", "Lenovo", "Acer", "ASUS", "MSI", "Apple", "Microsoft", "Samsung", "Dyson", "Thermomix", "Cecotec"];
const SIN_MARCA = "Sin marca asignada";
import { ProveedorFormDialog } from "./proveedor-form-dialog";
import { toast } from "sonner";

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [vista, setVista] = useState<"tabla" | "marcas">("tabla");
  const [marcaFiltro, setMarcaFiltro] = useState<string | null>(null);

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

  /** Marcas en uso (de más a menos proveedores) para los filtros, y las sugerencias del formulario. */
  const marcasEnUso = useMemo(() => {
    const cuenta = new Map<string, { nombre: string; n: number }>();
    for (const p of proveedores) {
      for (const m of p.marcas) {
        const k = m.toLowerCase();
        const previa = cuenta.get(k);
        cuenta.set(k, { nombre: previa?.nombre ?? m, n: (previa?.n ?? 0) + 1 });
      }
    }
    return [...cuenta.values()].sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, "es"));
  }, [proveedores]);

  const marcasSugeridas = useMemo(() => {
    const vistas = new Set<string>();
    const lista: string[] = [];
    for (const m of [...marcasEnUso.map((x) => x.nombre), ...MARCAS_HABITUALES]) {
      if (!vistas.has(m.toLowerCase())) { vistas.add(m.toLowerCase()); lista.push(m); }
    }
    return lista;
  }, [marcasEnUso]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return proveedores.filter((p) => {
      if (marcaFiltro) {
        const tiene = marcaFiltro === SIN_MARCA ? p.marcas.length === 0 : p.marcas.some((m) => m.toLowerCase() === marcaFiltro.toLowerCase());
        if (!tiene) return false;
      }
      if (!q) return true;
      return [p.nombre, p.dniCif, p.telefono, p.email, p.codigoInterno, p.marcas.join(" ")].some((v) => v.toLowerCase().includes(q));
    });
  }, [proveedores, busqueda, marcaFiltro]);

  /** Vista "Por marcas": cada marca con sus proveedores (un proveedor sale en todas las marcas que atiende). */
  const grupos = useMemo(() => {
    const mapa = new Map<string, { marca: string; proveedores: Proveedor[] }>();
    for (const p of filtrados) {
      const marcas = p.marcas.length ? p.marcas : [SIN_MARCA];
      for (const m of marcas) {
        const k = m.toLowerCase();
        const g = mapa.get(k) ?? { marca: m, proveedores: [] };
        g.proveedores.push(p);
        mapa.set(k, g);
      }
    }
    return [...mapa.values()].sort((a, b) => {
      if (a.marca === SIN_MARCA) return 1;
      if (b.marca === SIN_MARCA) return -1;
      return a.marca.localeCompare(b.marca, "es");
    });
  }, [filtrados]);

  const haySinMarca = proveedores.some((p) => p.marcas.length === 0);

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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, marca, CIF, teléfono, email…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="inline-flex rounded-lg border bg-card p-0.5">
          <Button size="sm" variant={vista === "tabla" ? "default" : "ghost"} className="h-7 px-3 text-xs" onClick={() => setVista("tabla")}>Tabla</Button>
          <Button size="sm" variant={vista === "marcas" ? "default" : "ghost"} className="h-7 px-3 text-xs" onClick={() => setVista("marcas")}>Por marcas</Button>
        </div>
      </div>

      {(marcasEnUso.length > 0 || haySinMarca) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted-foreground">Marca:</span>
          <button type="button" onClick={() => setMarcaFiltro(null)} className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${marcaFiltro === null ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            Todas
          </button>
          {marcasEnUso.map((m) => (
            <button key={m.nombre} type="button" onClick={() => setMarcaFiltro(marcaFiltro?.toLowerCase() === m.nombre.toLowerCase() ? null : m.nombre)} className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${marcaFiltro?.toLowerCase() === m.nombre.toLowerCase() ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              {m.nombre} <span className="opacity-60">{m.n}</span>
            </button>
          ))}
          {haySinMarca && (
            <button type="button" onClick={() => setMarcaFiltro(marcaFiltro === SIN_MARCA ? null : SIN_MARCA)} className={`rounded-full border border-dashed px-2.5 py-0.5 text-xs transition-colors ${marcaFiltro === SIN_MARCA ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              {SIN_MARCA}
            </button>
          )}
        </div>
      )}

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      {vista === "marcas" && !cargando && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {grupos.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Ningún proveedor coincide con la búsqueda</p>}
          {grupos.map((g) => (
            <section key={g.marca} className="rounded-lg border bg-card">
              <header className="flex items-center justify-between border-b px-3 py-2">
                <h2 className={`text-sm font-semibold ${g.marca === SIN_MARCA ? "text-muted-foreground" : ""}`}>{g.marca}</h2>
                <span className="text-xs text-muted-foreground">{g.proveedores.length} proveedor{g.proveedores.length === 1 ? "" : "es"}</span>
              </header>
              <ul className="divide-y">
                {g.proveedores.map((p) => (
                  <li key={p.proveedorId} className={`px-3 py-2 text-sm ${p.activo ? "" : "opacity-60"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{p.nombre}{!p.activo && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(desactivado)</span>}</span>
                      <Button size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-xs" onClick={() => { setEditando(p); setFormAbierto(true); }}>
                        <Edit2 className="size-3" /> Editar
                      </Button>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {p.telefono ? <a href={`tel:${p.telefono.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="size-3" />{p.telefono}</a> : null}
                      {p.email ? <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="size-3" />{p.email}</a> : null}
                      {!p.telefono && !p.email && <span>Sin datos de contacto</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className={`overflow-hidden rounded-lg border bg-card ${vista === "marcas" && !cargando ? "hidden" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Marcas</TableHead>
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
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!cargando && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Ningún proveedor coincide con la búsqueda</TableCell>
              </TableRow>
            )}
            {!cargando &&
              filtrados.map((p) => (
                <TableRow key={p.proveedorId} className={p.activo ? undefined : "opacity-60"}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-sm">
                    {p.marcas.length ? (
                      <div className="flex flex-wrap gap-1">
                        {p.marcas.map((m) => <span key={m} className="rounded-full bg-muted px-2 py-0.5 text-xs">{m}</span>)}
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
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

      <ProveedorFormDialog proveedorExistente={editando} marcasSugeridas={marcasSugeridas} open={formAbierto} onOpenChange={setFormAbierto} onGuardado={cargar} />
    </div>
  );
}
