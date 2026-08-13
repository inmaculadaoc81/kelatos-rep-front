"use client";

import { useEffect, useState } from "react";
import { Refresh2, SearchNormal1, UserAdd, Edit2, Trash } from "@/lib/icons";
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
import { Cliente } from "@/lib/clientes";
import { ClienteFormDialog } from "./cliente-form-dialog";
import { EliminarRegistroDialog } from "@/components/eliminar-registro-dialog";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteEliminando, setClienteEliminando] = useState<Cliente | null>(null);
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
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>DNI/CIF</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Localidad</TableHead>
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

            {!cargando && clientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No se encontraron clientes
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              clientes.map((c) => (
                <TableRow key={c.codigo}>
                  <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
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
