"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnaFiltro } from "@/app/(app)/facturas-clientes/columna-filtro";
import { EstadoPill } from "../../pills";

interface Ausencia {
  id: number;
  empleado: string;
  fecha_ausencia: string;
  hora_inicio: string;
  hora_fin: string;
  tipo_permiso: string;
  motivo: string;
  state: string;
}

type ColumnaFiltrable = "empleado" | "tipo_permiso" | "state";

const TIPO_LABEL: Record<string, string> = { medico: "Médico", personal: "Asunto personal", familiar: "Familiar", otro: "Otro" };

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function horaFmt(horaFloat: string) {
  const n = Number(horaFloat);
  const h = Math.trunc(n);
  const m = Math.round((n - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function valorColumna(a: Ausencia, col: ColumnaFiltrable): string {
  if (col === "tipo_permiso") return TIPO_LABEL[a.tipo_permiso] || a.tipo_permiso;
  return String(a[col] ?? "—");
}

export default function AdminAusenciasParcialesPage() {
  const [items, setItems] = useState<Ausencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [filtrosColumna, setFiltrosColumna] = useState<Partial<Record<ColumnaFiltrable, Set<string>>>>({});

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/asistencia/admin/ausencias-parciales");
      const data = await res.json();
      if (data.ok) setItems(data.items);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function aplicarFiltrosColumna(lista: Ausencia[], colExcluida?: ColumnaFiltrable): Ausencia[] {
    let out = lista;
    for (const col of ["empleado", "tipo_permiso", "state"] as ColumnaFiltrable[]) {
      if (col === colExcluida) continue;
      const seleccion = filtrosColumna[col];
      if (seleccion) out = out.filter((a) => seleccion.has(valorColumna(a, col)));
    }
    return out;
  }

  const listaFiltrada = useMemo(() => aplicarFiltrosColumna(items), [items, filtrosColumna]);

  function opcionesColumna(col: ColumnaFiltrable): string[] {
    const base = aplicarFiltrosColumna(items, col);
    const vistos = new Set<string>();
    const vals: string[] = [];
    for (const a of base) {
      const v = valorColumna(a, col);
      if (!vistos.has(v)) { vistos.add(v); vals.push(v); }
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
      const res = await fetch(`/api/asistencia/admin/ausencias-parciales/${id}/${accion}`, { method: "POST" });
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
      <h1 className="text-lg font-semibold">Ausencias parciales</h1>
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
              <TableHead>Fecha</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>
                <span className="inline-flex items-center">
                  Tipo
                  <ColumnaFiltro opciones={opcionesColumna("tipo_permiso")} seleccion={filtrosColumna.tipo_permiso ?? null} onAplicar={(s) => aplicarFiltroColumna("tipo_permiso", s)} />
                </span>
              </TableHead>
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
              <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {!cargando && listaFiltrada.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Sin solicitudes</TableCell></TableRow>}
            {!cargando && listaFiltrada.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.empleado}</TableCell>
                <TableCell className="text-sm">{fecha(a.fecha_ausencia)}</TableCell>
                <TableCell className="text-sm">{horaFmt(a.hora_inicio)}</TableCell>
                <TableCell className="text-sm">{horaFmt(a.hora_fin)}</TableCell>
                <TableCell className="text-sm">{TIPO_LABEL[a.tipo_permiso] || a.tipo_permiso}</TableCell>
                <TableCell className="max-w-40 truncate text-sm" title={a.motivo}>{a.motivo}</TableCell>
                <TableCell><EstadoPill estado={a.state} /></TableCell>
                <TableCell>
                  {a.state === "pendiente" && (
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 bg-emerald-600 text-white hover:bg-emerald-700" disabled={procesando === a.id} onClick={() => resolver(a.id, "aprobar")}>Aprobar</Button>
                      <Button size="sm" variant="outline" className="h-7 text-destructive" disabled={procesando === a.id} onClick={() => resolver(a.id, "rechazar")}>Rechazar</Button>
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
