"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ColumnaFiltro } from "@/app/(app)/facturas-clientes/columna-filtro";
import { colorAvatar, iniciales } from "@/lib/registro-acciones-estilo";
import { EstadoPill } from "../../pills";

interface Vacacion {
  id: number;
  empleado: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  motivo: string;
  state: string;
}

type ColumnaFiltrable = "empleado" | "state";

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function valorColumna(v: Vacacion, col: ColumnaFiltrable): string {
  return String(v[col] ?? "—");
}

export default function AdminVacacionesPage() {
  const [items, setItems] = useState<Vacacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [filtrosColumna, setFiltrosColumna] = useState<Partial<Record<ColumnaFiltrable, Set<string>>>>({});

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/asistencia/admin/vacaciones");
      const data = await res.json();
      if (data.ok) setItems(data.items);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function aplicarFiltrosColumna(lista: Vacacion[], colExcluida?: ColumnaFiltrable): Vacacion[] {
    let out = lista;
    for (const col of ["empleado", "state"] as ColumnaFiltrable[]) {
      if (col === colExcluida) continue;
      const seleccion = filtrosColumna[col];
      if (seleccion) out = out.filter((v) => seleccion.has(valorColumna(v, col)));
    }
    return out;
  }

  const listaFiltrada = useMemo(() => aplicarFiltrosColumna(items), [items, filtrosColumna]);

  function opcionesColumna(col: ColumnaFiltrable): string[] {
    const base = aplicarFiltrosColumna(items, col);
    const vistos = new Set<string>();
    const vals: string[] = [];
    for (const v of base) {
      const val = valorColumna(v, col);
      if (!vistos.has(val)) { vistos.add(val); vals.push(val); }
    }
    vals.sort((a, b) => a.localeCompare(b, "es"));
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

  async function resolver(id: number, accion: "aprobar" | "rechazar") {
    setProcesando(id);
    try {
      const res = await fetch(`/api/asistencia/admin/vacaciones/${id}/${accion}`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(accion === "aprobar" ? "Aprobada" : "Rechazada");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Vacaciones</h1>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="inline-flex items-center">
                  Empleado
                  <ColumnaFiltro opciones={opcionesColumna("empleado")} seleccion={filtrosColumna.empleado ?? null} onAplicar={(s) => aplicarFiltroColumna("empleado", s)} />
                </span>
              </TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>
                <span className="inline-flex items-center">
                  Estado
                  <ColumnaFiltro opciones={opcionesColumna("state")} seleccion={filtrosColumna.state ?? null} onAplicar={(s) => aplicarFiltroColumna("state", s)} />
                </span>
              </TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {!cargando && listaFiltrada.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sin solicitudes</TableCell></TableRow>}
            {!cargando && listaFiltrada.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback className={colorAvatar(v.empleado)}>{iniciales(v.empleado)}</AvatarFallback>
                    </Avatar>
                    {v.empleado}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{fecha(v.fecha_inicio)}</TableCell>
                <TableCell className="text-sm">{fecha(v.fecha_fin)}</TableCell>
                <TableCell className="text-sm">{v.dias_totales}</TableCell>
                <TableCell className="max-w-48 truncate text-sm" title={v.motivo}>{v.motivo}</TableCell>
                <TableCell><EstadoPill estado={v.state} /></TableCell>
                <TableCell>
                  {v.state === "pendiente" && (
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 bg-emerald-600 text-white hover:bg-emerald-700" disabled={procesando === v.id} onClick={() => resolver(v.id, "aprobar")}>Aprobar</Button>
                      <Button size="sm" variant="outline" className="h-7 text-destructive" disabled={procesando === v.id} onClick={() => resolver(v.id, "rechazar")}>Rechazar</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
