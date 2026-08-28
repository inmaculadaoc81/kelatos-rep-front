"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnaFiltro } from "@/app/(app)/facturas-clientes/columna-filtro";
import { TipoFichajePill } from "../../pills";

interface Empleado {
  id: number;
  nombre: string;
}
interface Fichaje {
  id: number;
  employee_id: number;
  empleado_nombre: string;
  check_in: string;
  check_out: string | null;
  tipo_fichaje: string;
  firmado: boolean;
  ip_registro: string | null;
  observaciones: string | null;
}

type ColumnaFiltrable = "empleado_nombre" | "tipo_fichaje" | "firmado";

function fechaHora(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function valorColumna(f: Fichaje, col: ColumnaFiltrable): string {
  if (col === "firmado") return f.firmado ? "Sí" : "No";
  return String(f[col] ?? "—");
}

export default function AdminFichajesPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [empleadoId, setEmpleadoId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [filtrosColumna, setFiltrosColumna] = useState<Partial<Record<ColumnaFiltrable, Set<string>>>>({});

  async function cargar() {
    setCargando(true);
    try {
      const qs = empleadoId ? `?employeeId=${empleadoId}` : "";
      const res = await fetch(`/api/asistencia/admin/fichajes${qs}`);
      const data = await res.json();
      if (data.ok) setFichajes(data.fichajes);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    fetch("/api/asistencia/admin/empleados").then((r) => r.json()).then((d) => { if (d.ok) setEmpleados(d.empleados); });
  }, []);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoId]);

  function aplicarFiltrosColumna(lista: Fichaje[], colExcluida?: ColumnaFiltrable): Fichaje[] {
    let out = lista;
    for (const col of ["empleado_nombre", "tipo_fichaje", "firmado"] as ColumnaFiltrable[]) {
      if (col === colExcluida) continue;
      const seleccion = filtrosColumna[col];
      if (seleccion) out = out.filter((f) => seleccion.has(valorColumna(f, col)));
    }
    return out;
  }

  const listaFiltrada = useMemo(() => aplicarFiltrosColumna(fichajes), [fichajes, filtrosColumna]);

  function opcionesColumna(col: ColumnaFiltrable): string[] {
    const base = aplicarFiltrosColumna(fichajes, col);
    const vistos = new Set<string>();
    const vals: string[] = [];
    for (const f of base) {
      const v = valorColumna(f, col);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Fichajes</h1>
        <div className="flex items-center gap-2">
          <Select value={empleadoId || "__todos"} onValueChange={(v) => setEmpleadoId(!v || v === "__todos" ? "" : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todos los empleados" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos">Todos los empleados</SelectItem>
              {empleados.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={cargar}>Actualizar</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="inline-flex items-center">
                  Empleado
                  <ColumnaFiltro opciones={opcionesColumna("empleado_nombre")} seleccion={filtrosColumna.empleado_nombre ?? null} onAplicar={(s) => aplicarFiltroColumna("empleado_nombre", s)} />
                </span>
              </TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>
                <span className="inline-flex items-center">
                  Tipo
                  <ColumnaFiltro opciones={opcionesColumna("tipo_fichaje")} seleccion={filtrosColumna.tipo_fichaje ?? null} onAplicar={(s) => aplicarFiltroColumna("tipo_fichaje", s)} />
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center">
                  Firmado
                  <ColumnaFiltro opciones={opcionesColumna("firmado")} seleccion={filtrosColumna.firmado ?? null} onAplicar={(s) => aplicarFiltroColumna("firmado", s)} />
                </span>
              </TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {!cargando && listaFiltrada.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sin fichajes</TableCell></TableRow>
            )}
            {!cargando && listaFiltrada.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.empleado_nombre}</TableCell>
                <TableCell className="text-sm">{fechaHora(f.check_in)}</TableCell>
                <TableCell className="text-sm">{fechaHora(f.check_out)}</TableCell>
                <TableCell><TipoFichajePill tipo={f.tipo_fichaje} /></TableCell>
                <TableCell className="text-sm">
                  {f.firmado ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">✍️ Sí</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{f.ip_registro || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
