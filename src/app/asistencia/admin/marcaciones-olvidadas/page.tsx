"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnaFiltro } from "@/app/(app)/facturas-clientes/columna-filtro";
import { EstadoPill, TipoFichajePill } from "../../pills";

interface Marcacion {
  id: number;
  empleado: string;
  fecha_marcacion: string;
  tipo_fichaje: string;
  hora_solicitada: string;
  motivo: string;
  state: string;
}

type ColumnaFiltrable = "empleado" | "tipo_fichaje" | "state";

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function horaFmt(horaFloat: string) {
  const n = Number(horaFloat);
  const h = Math.trunc(n);
  const m = Math.round((n - h) * 100);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function valorColumna(m: Marcacion, col: ColumnaFiltrable): string {
  return String(m[col] ?? "—");
}

export default function AdminMarcacionesOlvidadasPage() {
  const [items, setItems] = useState<Marcacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [filtrosColumna, setFiltrosColumna] = useState<Partial<Record<ColumnaFiltrable, Set<string>>>>({});

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/asistencia/admin/marcaciones-olvidadas");
      const data = await res.json();
      if (data.ok) setItems(data.items);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function aplicarFiltrosColumna(lista: Marcacion[], colExcluida?: ColumnaFiltrable): Marcacion[] {
    let out = lista;
    for (const col of ["empleado", "tipo_fichaje", "state"] as ColumnaFiltrable[]) {
      if (col === colExcluida) continue;
      const seleccion = filtrosColumna[col];
      if (seleccion) out = out.filter((m) => seleccion.has(valorColumna(m, col)));
    }
    return out;
  }

  const listaFiltrada = useMemo(() => aplicarFiltrosColumna(items), [items, filtrosColumna]);

  function opcionesColumna(col: ColumnaFiltrable): string[] {
    const base = aplicarFiltrosColumna(items, col);
    const vistos = new Set<string>();
    const vals: string[] = [];
    for (const m of base) {
      const v = valorColumna(m, col);
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

  async function resolver(id: number, accion: "aprobar-manual" | "aprobar-auto" | "rechazar") {
    setProcesando(id);
    try {
      const res = await fetch(`/api/asistencia/admin/marcaciones-olvidadas/${id}/${accion}`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(accion === "rechazar" ? "Rechazada" : "Aprobada");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Marcaciones olvidadas</h1>
        <p className="text-xs text-muted-foreground">
          &quot;Aprobar auto&quot; reconstruye el fichaje que falta automáticamente. &quot;Aprobar manual&quot; solo marca la solicitud como resuelta, sin tocar los fichajes.
        </p>
      </div>
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
              <TableHead>
                <span className="inline-flex items-center">
                  Tipo
                  <ColumnaFiltro opciones={opcionesColumna("tipo_fichaje")} seleccion={filtrosColumna.tipo_fichaje ?? null} onAplicar={(s) => aplicarFiltroColumna("tipo_fichaje", s)} />
                </span>
              </TableHead>
              <TableHead>Hora</TableHead>
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
            {!cargando && listaFiltrada.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.empleado}</TableCell>
                <TableCell className="text-sm">{fecha(m.fecha_marcacion)}</TableCell>
                <TableCell><TipoFichajePill tipo={m.tipo_fichaje} /></TableCell>
                <TableCell className="text-sm">{horaFmt(m.hora_solicitada)}</TableCell>
                <TableCell className="max-w-40 truncate text-sm" title={m.motivo}>{m.motivo}</TableCell>
                <TableCell><EstadoPill estado={m.state} /></TableCell>
                <TableCell>
                  {m.state === "pendiente" && (
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" className="h-7 bg-emerald-600 text-white hover:bg-emerald-700" disabled={procesando === m.id} onClick={() => resolver(m.id, "aprobar-auto")}>Aprobar auto</Button>
                      <Button size="sm" variant="outline" className="h-7" disabled={procesando === m.id} onClick={() => resolver(m.id, "aprobar-manual")}>Aprobar manual</Button>
                      <Button size="sm" variant="outline" className="h-7 text-destructive" disabled={procesando === m.id} onClick={() => resolver(m.id, "rechazar")}>Rechazar</Button>
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
