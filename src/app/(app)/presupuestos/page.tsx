"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DocumentText, Refresh2, DocumentDownload } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PresupuestoEnviado, EstadoPresupuesto } from "@/lib/presupuestos-enviados";
import { ColumnaFiltro } from "../facturas-clientes/columna-filtro";

function fechaHoraCorta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16).replace("T", " ");
  return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

const ESTADO_LABEL: Record<EstadoPresupuesto, string> = {
  enviado: "Enviado",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  sin_respuesta: "Sin respuesta",
  anulado: "Anulado",
  borrador: "Borrador",
};

const ESTADO_ESTILO: Record<EstadoPresupuesto, { bg: string; color: string }> = {
  enviado: { bg: "rgba(13,110,253,.12)", color: "#0a58ca" },
  aceptado: { bg: "rgba(25,135,84,.13)", color: "#146c43" },
  rechazado: { bg: "rgba(220,53,69,.11)", color: "#842029" },
  sin_respuesta: { bg: "rgba(253,126,20,.13)", color: "#a35709" },
  anulado: { bg: "rgba(108,117,125,.13)", color: "#5a6268" },
  borrador: { bg: "rgba(108,117,125,.13)", color: "#5a6268" },
};

function EstadoBadge({ estado }: { estado: EstadoPresupuesto }) {
  const estilo = ESTADO_ESTILO[estado] ?? ESTADO_ESTILO.enviado;
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap" style={{ backgroundColor: estilo.bg, color: estilo.color }}>
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  );
}

type ColumnaFiltrable = "numeroPresupuesto" | "resguardo" | "clienteNombre" | "equipo" | "estado";
const COLUMNAS_FILTRABLES: ColumnaFiltrable[] = ["numeroPresupuesto", "resguardo", "clienteNombre", "equipo", "estado"];

function valorColumna(p: PresupuestoEnviado, columna: ColumnaFiltrable): string {
  switch (columna) {
    case "numeroPresupuesto":
      return p.numeroPresupuesto || "—";
    case "resguardo":
      return p.resguardo || "—";
    case "clienteNombre":
      return p.clienteNombre || "—";
    case "equipo":
      return p.equipo || "—";
    case "estado":
      return ESTADO_LABEL[p.estado] ?? p.estado;
  }
}

/**
 * Reproduce #vistaPresupuestos (cargarPresupuestosEnviados) del original,
 * ampliado con el estado de respuesta (aceptado/rechazado/sin respuesta,
 * con motivo y fecha) y filtros de columna estilo Excel — el original era
 * de solo lectura sin filtros, pero se quedaba corto para saber qué pasó
 * con cada presupuesto tras enviarlo.
 */
export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<PresupuestoEnviado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtrosColumna, setFiltrosColumna] = useState<Partial<Record<ColumnaFiltrable, Set<string>>>>({});

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/presupuestos");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error al cargar presupuestos");
      setPresupuestos(data.presupuestos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function actualizar() {
    setFiltrosColumna({});
    cargar();
  }

  function aplicarFiltrosColumna(lista: PresupuestoEnviado[], excluir?: ColumnaFiltrable): PresupuestoEnviado[] {
    let out = lista;
    for (const col of COLUMNAS_FILTRABLES) {
      if (col === excluir) continue;
      const seleccion = filtrosColumna[col];
      if (!seleccion || !seleccion.size) continue;
      out = out.filter((p) => seleccion.has(valorColumna(p, col)));
    }
    return out;
  }

  const listaFiltrada = useMemo(
    () => aplicarFiltrosColumna(presupuestos, undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [presupuestos, filtrosColumna]
  );

  function opcionesColumna(col: ColumnaFiltrable): string[] {
    const base = aplicarFiltrosColumna(presupuestos, col);
    const vistos = new Set<string>();
    const vals: string[] = [];
    for (const p of base) {
      const v = valorColumna(p, col);
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

  function encabezado(col: ColumnaFiltrable, label: string) {
    return (
      <span className="inline-flex items-center">
        {label}
        <ColumnaFiltro opciones={opcionesColumna(col)} seleccion={filtrosColumna[col] ?? null} onAplicar={(s) => aplicarFiltroColumna(col, s)} />
      </span>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DocumentText className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">Presupuestos Enviados</h1>
        <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={actualizar} disabled={cargando}>
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Fecha / Hora</TableHead>
              <TableHead className="w-32">{encabezado("numeroPresupuesto", "N.º Presupuesto")}</TableHead>
              <TableHead className="w-28">{encabezado("resguardo", "Resguardo")}</TableHead>
              <TableHead>{encabezado("clienteNombre", "Cliente")}</TableHead>
              <TableHead>{encabezado("equipo", "Equipo")}</TableHead>
              <TableHead className="w-32">{encabezado("estado", "Estado")}</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="w-36">Fecha respuesta</TableHead>
              <TableHead className="w-28 text-right">Total + IVA</TableHead>
              <TableHead className="w-16 text-center">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : listaFiltrada.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  No hay presupuestos que coincidan.
                </TableCell>
              </TableRow>
            ) : (
              listaFiltrada.map((p) => (
                <TableRow key={p.presupuestoId}>
                  <TableCell className="text-sm text-muted-foreground">{fechaHoraCorta(p.fechaEnvio)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">{p.numeroPresupuesto || "—"}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{p.resguardo}</TableCell>
                  <TableCell className="text-sm">{p.clienteNombre || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.equipo || "—"}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={p.estado} />
                  </TableCell>
                  <TableCell className="max-w-52 truncate text-sm text-muted-foreground" title={p.motivoRechazo || undefined}>
                    {p.motivoRechazo || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.fechaRespuesta ? fechaHoraCorta(p.fechaRespuesta) : "—"}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{euros(p.total * 1.21)}</TableCell>
                  <TableCell className="text-center">
                    {p.urlPdf ? (
                      <Button size="icon-sm" variant="ghost" className="text-destructive" nativeButton={false} render={<Link href={p.urlPdf} target="_blank" rel="noreferrer" />}>
                        <DocumentDownload className="size-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
