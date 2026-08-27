"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, UserAdd, Edit2, Trash, ArrowLeft2, ArrowLeft3, ArrowRight2, ArrowRight3 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Cliente, codigoClienteFormateado } from "@/lib/clientes";
import { ClienteFormDialog } from "./cliente-form-dialog";
import { EliminarRegistroDialog } from "@/components/eliminar-registro-dialog";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import { ColumnaFiltro } from "../facturas-clientes/columna-filtro";

type ColumnaFiltrable = "codigo" | "nombre" | "dniCif" | "telefono" | "email" | "localidad";
const COLUMNAS_FILTRABLES: ColumnaFiltrable[] = ["codigo", "nombre", "dniCif", "telefono", "email", "localidad"];

function valorColumna(c: Cliente, col: ColumnaFiltrable): string {
  switch (col) {
    case "codigo": return codigoClienteFormateado(c.codigo);
    case "nombre": return c.nombre || "—";
    case "dniCif": return c.dniCif || "—";
    case "telefono": return c.telefono || "—";
    case "email": return c.email || "—";
    case "localidad": return c.localidad || "—";
  }
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteEliminando, setClienteEliminando] = useState<Cliente | null>(null);
  const [filtrosColumna, setFiltrosColumna] = useState<Partial<Record<ColumnaFiltrable, Set<string>>>>({});
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(15);
  const esSuperadmin = useEsSuperadmin();

  async function cargar(filtro?: string) {
    setCargando(true);
    setError(null);
    try {
      const qs = filtro ? `?buscar=${encodeURIComponent(filtro)}` : "";
      const res = await fetch(`/api/clientes${qs}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setClientes(data.clientes as Cliente[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => cargar(busqueda), 350);
    return () => clearTimeout(timeout);
  }, [busqueda]);

  // Filtros de columna "estilo Excel" (ColumnaFiltro, reutilizado de
  // Facturas de Clientes) — petición del usuario, 2026-08-28. Se aplican
  // sobre lo ya cargado (la búsqueda de arriba sigue siendo la del
  // servidor); cada columna calcula sus opciones EXCLUYENDO su propio
  // filtro para no ir estrechando sus propias opciones disponibles.
  function aplicarFiltrosColumna(lista: Cliente[], colExcluida?: ColumnaFiltrable): Cliente[] {
    let out = lista;
    for (const col of COLUMNAS_FILTRABLES) {
      if (col === colExcluida) continue;
      const seleccion = filtrosColumna[col];
      if (seleccion) out = out.filter((c) => seleccion.has(valorColumna(c, col)));
    }
    return out;
  }

  const listaFiltrada = useMemo(() => aplicarFiltrosColumna(clientes), [clientes, filtrosColumna]);

  useEffect(() => {
    setPagina(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosColumna, busqueda]);

  function opcionesColumna(col: ColumnaFiltrable): string[] {
    const base = aplicarFiltrosColumna(clientes, col);
    const vistos = new Set<string>();
    const vals: string[] = [];
    for (const c of base) {
      const v = valorColumna(c, col);
      if (!vistos.has(v)) {
        vistos.add(v);
        vals.push(v);
      }
    }
    vals.sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    return vals;
  }

  function aplicarFiltroColumna(col: ColumnaFiltrable, seleccion: Set<string> | null) {
    setFiltrosColumna((prev) => {
      const siguiente = { ...prev };
      if (seleccion === null) delete siguiente[col];
      else siguiente[col] = seleccion;
      return siguiente;
    });
  }

  const totalPaginas = filasPorPagina > 0 ? Math.max(1, Math.ceil(listaFiltrada.length / filasPorPagina)) : 1;
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = filasPorPagina > 0 ? (paginaSegura - 1) * filasPorPagina : 0;
  const fin = filasPorPagina > 0 ? Math.min(inicio + filasPorPagina, listaFiltrada.length) : listaFiltrada.length;
  const paginaActual = listaFiltrada.slice(inicio, fin);

  function encabezado(col: ColumnaFiltrable, etiqueta: string) {
    return (
      <TableHead>
        <span className="inline-flex items-center">
          {etiqueta}
          <ColumnaFiltro opciones={opcionesColumna(col)} seleccion={filtrosColumna[col] ?? null} onAplicar={(s) => aplicarFiltroColumna(col, s)} />
        </span>
      </TableHead>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Clientes</h1>
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar(busqueda)} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          {!cargando && <span className="text-sm text-muted-foreground">{clientes.length} resultados</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, DNI, teléfono o email..."
              className="w-64 pl-7"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setClienteEditando(null);
              setFormAbierto(true);
            }}
          >
            <UserAdd className="size-4" /> Nuevo cliente
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar clientes: {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {encabezado("codigo", "Código")}
              {encabezado("nombre", "Nombre")}
              {encabezado("dniCif", "DNI/CIF")}
              {encabezado("telefono", "Teléfono")}
              {encabezado("email", "Email")}
              {encabezado("localidad", "Localidad")}
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && paginaActual.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No se encontraron clientes
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              paginaActual.map((c) => (
                <TableRow key={c.codigo}>
                  <TableCell className="font-mono text-xs">{codigoClienteFormateado(c.codigo)}</TableCell>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-sm">{c.dniCif || "-"}</TableCell>
                  <TableCell className="text-sm">{c.telefono || "-"}</TableCell>
                  <TableCell className="text-sm">{c.email || "-"}</TableCell>
                  <TableCell className="text-sm">{c.localidad || "-"}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1"
                      onClick={() => {
                        setClienteEditando(c);
                        setFormAbierto(true);
                      }}
                    >
                      <Edit2 className="size-3.5" /> Editar
                    </Button>
                    {esSuperadmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-destructive hover:text-destructive"
                        onClick={() => setClienteEliminando(c)}
                      >
                        <Trash className="size-3.5" /> Eliminar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {listaFiltrada.length} cliente{listaFiltrada.length !== 1 ? "s" : ""}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filas por página:</span>
              <Select
                value={String(filasPorPagina)}
                onValueChange={(v) => {
                  if (!v) return;
                  setFilasPorPagina(parseInt(v, 10));
                  setPagina(1);
                }}
              >
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue>{(v: string) => (v === "0" ? "Todas" : v)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {["15", "25", "50", "100", "0"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v === "0" ? "Todas" : v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura <= 1} onClick={() => setPagina(1)}>
                <ArrowLeft3 className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                <ArrowLeft2 className="size-3.5" />
              </Button>
              <span className="px-1 text-xs whitespace-nowrap text-muted-foreground">
                {listaFiltrada.length === 0
                  ? ""
                  : filasPorPagina === 0 || totalPaginas <= 1
                    ? `Mostrando ${listaFiltrada.length}`
                    : `Página ${paginaSegura} de ${totalPaginas} (${inicio + 1}–${fin})`}
              </span>
              <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>
                <ArrowRight2 className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura >= totalPaginas} onClick={() => setPagina(totalPaginas)}>
                <ArrowRight3 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ClienteFormDialog
        clienteExistente={clienteEditando}
        open={formAbierto}
        onOpenChange={setFormAbierto}
        onGuardado={() => cargar(busqueda)}
      />

      {clienteEliminando && (
        <EliminarRegistroDialog
          tipo="cliente"
          id={clienteEliminando.codigo}
          apiUrl={`/api/clientes/${clienteEliminando.codigo}`}
          open={!!clienteEliminando}
          onOpenChange={(o) => !o && setClienteEliminando(null)}
          onEliminado={() => cargar(busqueda)}
        />
      )}
    </div>
  );
}
