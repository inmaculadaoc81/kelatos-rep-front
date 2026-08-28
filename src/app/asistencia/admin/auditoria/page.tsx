"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnaFiltro } from "@/app/(app)/facturas-clientes/columna-filtro";

interface Evento {
  id: number;
  fecha: string;
  usuario: string;
  empleado: string;
  fichaje_id: number | null;
  campo: string;
  valor_anterior: string;
  valor_nuevo: string;
}

type ColumnaFiltrable = "usuario" | "empleado" | "campo";

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function valorColumna(e: Evento, col: ColumnaFiltrable): string {
  return String(e[col] || "—");
}

export default function AdminAuditoriaPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtrosColumna, setFiltrosColumna] = useState<Partial<Record<ColumnaFiltrable, Set<string>>>>({});

  useEffect(() => {
    fetch("/api/asistencia/admin/auditoria")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setEventos(d.eventos); })
      .finally(() => setCargando(false));
  }, []);

  function aplicarFiltrosColumna(lista: Evento[], colExcluida?: ColumnaFiltrable): Evento[] {
    let out = lista;
    for (const col of ["usuario", "empleado", "campo"] as ColumnaFiltrable[]) {
      if (col === colExcluida) continue;
      const seleccion = filtrosColumna[col];
      if (seleccion) out = out.filter((e) => seleccion.has(valorColumna(e, col)));
    }
    return out;
  }

  const eventosFiltrados = useMemo(() => aplicarFiltrosColumna(eventos), [eventos, filtrosColumna]);

  function opcionesColumna(col: ColumnaFiltrable): string[] {
    const base = aplicarFiltrosColumna(eventos, col);
    const vistos = new Set<string>();
    const vals: string[] = [];
    for (const e of base) {
      const v = valorColumna(e, col);
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
      <div>
        <h1 className="text-lg font-semibold">Auditoría</h1>
        <p className="text-xs text-muted-foreground">Cada cambio manual sobre un fichaje ya registrado queda aquí — solo lectura.</p>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>
                <span className="inline-flex items-center">
                  Usuario
                  <ColumnaFiltro opciones={opcionesColumna("usuario")} seleccion={filtrosColumna.usuario ?? null} onAplicar={(s) => aplicarFiltroColumna("usuario", s)} />
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center">
                  Empleado
                  <ColumnaFiltro opciones={opcionesColumna("empleado")} seleccion={filtrosColumna.empleado ?? null} onAplicar={(s) => aplicarFiltroColumna("empleado", s)} />
                </span>
              </TableHead>
              <TableHead>Fichaje</TableHead>
              <TableHead>
                <span className="inline-flex items-center">
                  Campo
                  <ColumnaFiltro opciones={opcionesColumna("campo")} seleccion={filtrosColumna.campo ?? null} onAplicar={(s) => aplicarFiltroColumna("campo", s)} />
                </span>
              </TableHead>
              <TableHead>Antes</TableHead>
              <TableHead>Después</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {!cargando && eventosFiltrados.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sin eventos registrados</TableCell></TableRow>}
            {!cargando && eventosFiltrados.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm">{fechaHora(e.fecha)}</TableCell>
                <TableCell className="text-sm">{e.usuario}</TableCell>
                <TableCell className="text-sm">{e.empleado}</TableCell>
                <TableCell className="text-sm">{e.fichaje_id ? `#${e.fichaje_id}` : "-"}</TableCell>
                <TableCell className="text-sm">{e.campo}</TableCell>
                <TableCell className="max-w-32 truncate text-xs text-muted-foreground" title={e.valor_anterior}>{e.valor_anterior || "-"}</TableCell>
                <TableCell className="max-w-32 truncate text-xs" title={e.valor_nuevo}>{e.valor_nuevo || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
