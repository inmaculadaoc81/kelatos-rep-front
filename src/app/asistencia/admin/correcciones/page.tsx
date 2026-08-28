"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnaFiltro } from "@/app/(app)/facturas-clientes/columna-filtro";
import { EstadoPill } from "../../pills";

interface Correccion {
  id: number;
  empleado: string;
  tipo_campo: string;
  hora_original: string | null;
  hora_solicitada: string | null;
  motivo: string;
  state: string;
}

type ColumnaFiltrable = "empleado" | "tipo_campo" | "state";

const CAMPO_LABEL: Record<string, string> = { check_in: "Entrada", check_out: "Salida" };

function fechaHora(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function valorColumna(c: Correccion, col: ColumnaFiltrable): string {
  if (col === "tipo_campo") return CAMPO_LABEL[c.tipo_campo] || c.tipo_campo;
  return String(c[col] ?? "—");
}

export default function AdminCorreccionesPage() {
  const [items, setItems] = useState<Correccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [filtrosColumna, setFiltrosColumna] = useState<Partial<Record<ColumnaFiltrable, Set<string>>>>({});

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/asistencia/admin/correcciones");
      const data = await res.json();
      if (data.ok) setItems(data.items);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function aplicarFiltrosColumna(lista: Correccion[], colExcluida?: ColumnaFiltrable): Correccion[] {
    let out = lista;
    for (const col of ["empleado", "tipo_campo", "state"] as ColumnaFiltrable[]) {
      if (col === colExcluida) continue;
      const seleccion = filtrosColumna[col];
      if (seleccion) out = out.filter((c) => seleccion.has(valorColumna(c, col)));
    }
    return out;
  }

  const listaFiltrada = useMemo(() => aplicarFiltrosColumna(items), [items, filtrosColumna]);

  function opcionesColumna(col: ColumnaFiltrable): string[] {
    const base = aplicarFiltrosColumna(items, col);
    const vistos = new Set<string>();
    const vals: string[] = [];
    for (const c of base) {
      const v = valorColumna(c, col);
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
      const res = await fetch(`/api/asistencia/admin/correcciones/${id}/${accion}`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(accion === "aprobar" ? "Aprobada — el fichaje se actualizó" : "Rechazada");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Correcciones de fichaje</h1>
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
              <TableHead>
                <span className="inline-flex items-center">
                  Campo
                  <ColumnaFiltro opciones={opcionesColumna("tipo_campo")} seleccion={filtrosColumna.tipo_campo ?? null} onAplicar={(s) => aplicarFiltroColumna("tipo_campo", s)} />
                </span>
              </TableHead>
              <TableHead>Original</TableHead>
              <TableHead>Solicitada</TableHead>
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
            {!cargando && listaFiltrada.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.empleado}</TableCell>
                <TableCell className="text-sm">{CAMPO_LABEL[c.tipo_campo] || c.tipo_campo}</TableCell>
                <TableCell className="text-sm">{fechaHora(c.hora_original)}</TableCell>
                <TableCell className="text-sm">{fechaHora(c.hora_solicitada)}</TableCell>
                <TableCell className="max-w-48 truncate text-sm" title={c.motivo}>{c.motivo}</TableCell>
                <TableCell><EstadoPill estado={c.state} /></TableCell>
                <TableCell>
                  {c.state === "pendiente" && (
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 bg-emerald-600 text-white hover:bg-emerald-700" disabled={procesando === c.id} onClick={() => resolver(c.id, "aprobar")}>Aprobar</Button>
                      <Button size="sm" variant="outline" className="h-7 text-destructive" disabled={procesando === c.id} onClick={() => resolver(c.id, "rechazar")}>Rechazar</Button>
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
