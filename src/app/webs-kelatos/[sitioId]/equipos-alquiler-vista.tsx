"use client";

import { useEffect, useMemo, useState } from "react";
import { Gallery, Refresh2, SearchNormal1 } from "@/lib/icons";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PillBadge } from "@/components/pill-badge";
import { toast } from "sonner";
import { Equipo, EstadoEquipo } from "@/lib/equipos";

// Vista reducida de "Equipos y Alquileres" para la web pública de alquiler
// (alquilerOrdenadores) — mismos datos reales (misma tabla kelatos_app.equipos
// que ya consume el endpoint público /publico/equipos-alquiler), pero SIN los
// botones de Alquilar/Devolver/Vender/Dar de baja: solo ver el inventario y
// marcarlo disponible o no. Petición del usuario, 2026-09-09: "el mismo
// tabla que esta en alquiler... pero sin los botones de alquiler o etc,
// solo para ver los items y marcar dispoinle o no".

const ETIQUETAS_ESTADO: Record<string, string> = {
  DISPONIBLE: "Disponible",
  ALQUILADO: "Alquilado",
  MANTENIMIENTO: "No disponible",
  FUERA_SERVICIO: "Fuera de servicio",
  VENDIDO: "Vendido",
};

const ESTILO_ESTADO: Record<string, { bg: string; color: string }> = {
  DISPONIBLE: { bg: "#d1fae5", color: "#065f46" },
  ALQUILADO: { bg: "#fef3c7", color: "#92400e" },
  MANTENIMIENTO: { bg: "#fee2e2", color: "#991b1b" },
  FUERA_SERVICIO: { bg: "#e4e4e7", color: "#3f3f46" },
  VENDIDO: { bg: "#e4e4e7", color: "#3f3f46" },
};

function EstadoPill({ estado }: { estado: string }) {
  const estilo = ESTILO_ESTADO[estado] || { bg: "#e4e4e7", color: "#3f3f46" };
  return (
    <PillBadge bg={estilo.bg} color={estilo.color}>
      {ETIQUETAS_ESTADO[estado] || estado}
    </PillBadge>
  );
}

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function EquiposAlquilerVista() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cambiando, setCambiando] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError("");
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

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return equipos;
    const q = busqueda.trim().toLowerCase();
    return equipos.filter((e) => e.marca.toLowerCase().includes(q) || e.modelo.toLowerCase().includes(q));
  }, [equipos, busqueda]);

  async function alternarDisponible(equipo: Equipo, disponible: boolean) {
    const nuevoEstado: EstadoEquipo = disponible ? "DISPONIBLE" : "MANTENIMIENTO";
    setCambiando(equipo.id);
    try {
      const res = await fetch(`/api/equipos/${equipo.id}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nuevoEstado }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`${equipo.marca} ${equipo.modelo} → ${ETIQUETAS_ESTADO[nuevoEstado]}`);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCambiando(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-72">
          <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar equipo..." className="pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Button variant="outline" size="icon" className="size-9" onClick={cargar} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
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
                <TableHead>Equipo</TableHead>
                <TableHead>Precio día</TableHead>
                <TableHead>Precio semana</TableHead>
                <TableHead>Precio mes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Disponible en la web</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Sin resultados
                  </TableCell>
                </TableRow>
              )}
              {filtrados.map((e) => {
                const puedeAlternar = e.estado === "DISPONIBLE" || e.estado === "MANTENIMIENTO";
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      {e.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.imagenUrl} alt={`${e.marca} ${e.modelo}`} className="size-10 rounded-lg border object-cover" />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                          <Gallery className="size-4" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{e.marca} {e.modelo}</TableCell>
                    <TableCell className="text-sm">{euros(e.precioDia)}</TableCell>
                    <TableCell className="text-sm">{euros(e.precioSemana)}</TableCell>
                    <TableCell className="text-sm">{euros(e.precioMes)}</TableCell>
                    <TableCell><EstadoPill estado={e.estado} /></TableCell>
                    <TableCell className="text-right">
                      {puedeAlternar ? (
                        <Switch
                          checked={e.estado === "DISPONIBLE"}
                          disabled={cambiando === e.id}
                          onCheckedChange={(v) => alternarDisponible(e, v === true)}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Gestionar en Equipos</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
