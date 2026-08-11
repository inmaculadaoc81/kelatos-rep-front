"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, Category2, TickCircle, TimerStart, Setting2, SearchNormal1 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Equipo, EstadoEquipo } from "@/lib/equipos";
import { NuevoEquipoDialog } from "./nuevo-equipo-dialog";
import { NuevoAlquilerDialog } from "./alquiler-dialogs";
import { DevolverAlquilerDialog } from "./devolver-alquiler-dialog";

const ETIQUETAS_ESTADO: Record<string, string> = {
  DISPONIBLE: "Disponible",
  ALQUILADO: "Alquilado",
  MANTENIMIENTO: "Mantenimiento",
  FUERA_SERVICIO: "Fuera de servicio",
  VENDIDO: "Vendido",
};

const COLOR_ESTADO: Record<string, string> = {
  DISPONIBLE: "bg-green-500/10 text-green-600",
  ALQUILADO: "bg-amber-500/10 text-amber-600",
  MANTENIMIENTO: "bg-red-500/10 text-red-600",
  FUERA_SERVICIO: "bg-muted text-muted-foreground",
  VENDIDO: "bg-slate-500/10 text-slate-600",
};

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [alquilerAbierto, setAlquilerAbierto] = useState<Equipo | null>(null);
  const [devolverAbierto, setDevolverAbierto] = useState<Equipo | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/equipos");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setEquipos(data.equipos as Equipo[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const metricas = useMemo(
    () => ({
      total: equipos.length,
      disponibles: equipos.filter((e) => e.estado === "DISPONIBLE").length,
      alquilados: equipos.filter((e) => e.estado === "ALQUILADO").length,
      mantenimiento: equipos.filter((e) => e.estado === "MANTENIMIENTO").length,
    }),
    [equipos]
  );

  const filtrados = useMemo(() => {
    let lista = equipos;
    if (filtroEstado) lista = lista.filter((e) => e.estado === filtroEstado);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(
        (e) =>
          e.marca.toLowerCase().includes(q) ||
          e.modelo.toLowerCase().includes(q) ||
          e.serie.toLowerCase().includes(q) ||
          e.clienteActual?.nombre.toLowerCase().includes(q) ||
          e.clienteActual?.telefono.includes(q)
      );
    }
    return lista;
  }, [equipos, busqueda, filtroEstado]);

  async function cambiarEstado(equipo: Equipo, nuevoEstado: EstadoEquipo) {
    try {
      const res = await fetch(`/api/equipos/${equipo.id}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nuevoEstado }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Equipo ${equipo.id} → ${nuevoEstado}`);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Equipos de Alquiler</h1>
          <p className="text-sm text-muted-foreground">Inventario y gestión de alquileres</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          <NuevoEquipoDialog onCreado={cargar} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{metricas.total}</p>
            </div>
            <Category2 className="size-8 text-muted-foreground/40" />
          </div>
        </div>
        <button className="rounded-xl border bg-card p-4 text-left shadow-sm" onClick={() => setFiltroEstado("DISPONIBLE")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">{metricas.disponibles}</p>
            </div>
            <TickCircle className="size-8 text-green-600/40" />
          </div>
        </button>
        <button className="rounded-xl border bg-card p-4 text-left shadow-sm" onClick={() => setFiltroEstado("ALQUILADO")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Alquilados</p>
              <p className="text-2xl font-bold text-amber-600">{metricas.alquilados}</p>
            </div>
            <TimerStart className="size-8 text-amber-600/40" />
          </div>
        </button>
        <button className="rounded-xl border bg-card p-4 text-left shadow-sm" onClick={() => setFiltroEstado("MANTENIMIENTO")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Mantenimiento</p>
              <p className="text-2xl font-bold text-red-600">{metricas.mantenimiento}</p>
            </div>
            <Setting2 className="size-8 text-red-600/40" />
          </div>
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por marca, modelo, serie, cliente..."
            className="w-72 pl-7"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select value={filtroEstado || "__todos__"} onValueChange={(v) => setFiltroEstado(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue>{(v: string) => ETIQUETAS_ESTADO[v] ?? "Todos los estados"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los estados</SelectItem>
            <SelectItem value="DISPONIBLE">Disponible</SelectItem>
            <SelectItem value="ALQUILADO">Alquilado</SelectItem>
            <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
            <SelectItem value="FUERA_SERVICIO">Fuera de servicio</SelectItem>
            <SelectItem value="VENDIDO">Vendido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar equipos: {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Serie</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Cliente actual</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>Tarifas</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No se encontraron equipos
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtrados.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="font-medium">{e.marca} {e.modelo}</div>
                    <div className="text-xs text-muted-foreground">{e.id}</div>
                  </TableCell>
                  <TableCell className="text-sm">{e.serie || "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO[e.estado] || ""}`}>
                      {e.estado}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.clienteActual ? (
                      <>
                        <div>{e.clienteActual.nombre}</div>
                        <div className="text-xs text-muted-foreground">{e.clienteActual.telefono}</div>
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.fechaFinPrevista ? new Date(e.fechaFinPrevista).toLocaleDateString("es-ES") : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.precioDia}€/d · {e.precioSemana}€/s · {e.precioMes}€/m
                  </TableCell>
                  <TableCell>
                    {e.estado === "DISPONIBLE" && (
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" className="h-7" onClick={() => setAlquilerAbierto(e)}>
                          Alquilar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => cambiarEstado(e, "MANTENIMIENTO")}>
                          A mantenimiento
                        </Button>
                      </div>
                    )}
                    {e.estado === "ALQUILADO" && (
                      <Button size="sm" variant="outline" className="h-7" onClick={() => setDevolverAbierto(e)}>
                        Devolver
                      </Button>
                    )}
                    {e.estado === "MANTENIMIENTO" && (
                      <Button size="sm" variant="outline" className="h-7" onClick={() => cambiarEstado(e, "DISPONIBLE")}>
                        Marcar disponible
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Badge variant="outline" className="mt-3">
        {filtrados.length} de {equipos.length} equipos
      </Badge>

      <NuevoAlquilerDialog
        equipo={alquilerAbierto}
        open={alquilerAbierto !== null}
        onOpenChange={(o) => !o && setAlquilerAbierto(null)}
        onCreado={cargar}
      />
      <DevolverAlquilerDialog
        equipo={devolverAbierto}
        open={devolverAbierto !== null}
        onOpenChange={(o) => !o && setDevolverAbierto(null)}
        onDevuelto={cargar}
      />
    </div>
  );
}
