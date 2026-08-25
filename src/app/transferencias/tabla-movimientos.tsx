"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TickCircle, RotateLeft, ExportSquare, Refresh2, Clock, Money, Category2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "./stat-card";
import { ConfirmarDialog } from "./confirmar-dialog";
import { ConciliarParDialog } from "./conciliar-par-dialog";

export interface Movimiento {
  id: number;
  fecha_registro: string;
  monto: string | null;
  moneda: string | null;
  tipo_operacion: string | null;
  fecha_valor: string | null;
  remitente: string | null;
  beneficiario: string | null;
  concepto: string | null;
  codigo_referencia_concepto: string | null;
  referencia: string | null;
  banco: string | null;
  confianza: string | null;
  origen: string | null;
  link_foto: string | null;
  estado: string;
  fecha_conciliacion: string | null;
  conciliado_por: string | null;
}

function fmtMonto(m: string | null, moneda: string | null) {
  if (!m) return "-";
  return `${Number(m).toFixed(2)} ${moneda || "EUR"}`;
}

/** Tabla de movimientos, compartida entre /transferencias (Pendientes) y /transferencias/conciliadas. */
export function TablaMovimientos({ estado, titulo, subtitulo }: { estado: "Pendiente" | "Conciliada"; titulo: string; subtitulo: string }) {
  const [items, setItems] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [contador, setContador] = useState({ pendientes: 0, conciliadas: 0, montoPendiente: 0 });

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [resItems, resContador] = await Promise.all([fetch(`/api/transferencias?estado=${estado}`), fetch("/api/transferencias/contador")]);
      const data = await resItems.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setItems(data.items as Movimiento[]);

      const dataContador = await resContador.json();
      if (dataContador.ok) setContador({ pendientes: dataContador.pendientes, conciliadas: dataContador.conciliadas, montoPendiente: dataContador.montoPendiente });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    setSeleccionados([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  function toggleSeleccion(id: number) {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function conciliarIndividual(id: number) {
    try {
      const res = await fetch(`/api/transferencias/${id}/conciliar`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`#${id} conciliada`);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  const [parAConciliar, setParAConciliar] = useState<[Movimiento, Movimiento] | null>(null);

  function abrirComparacion() {
    if (seleccionados.length !== 2) return;
    const t1 = items.find((i) => i.id === seleccionados[0]);
    const t2 = items.find((i) => i.id === seleccionados[1]);
    if (t1 && t2) setParAConciliar([t1, t2]);
  }

  const [aRevertir, setARevertir] = useState<Movimiento | null>(null);
  const [revirtiendo, setRevirtiendo] = useState(false);

  async function confirmarRevertir() {
    if (!aRevertir) return;
    setRevirtiendo(true);
    try {
      const res = await fetch(`/api/transferencias/${aRevertir.id}/revertir`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`#${aRevertir.id} revertida a Pendiente`);
      setARevertir(null);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setRevirtiendo(false);
    }
  }

  const total = contador.pendientes + contador.conciliadas;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Clock} value={contador.pendientes} label="Pendientes" colorClase="bg-primary/10 text-primary" />
        <StatCard icon={TickCircle} value={contador.conciliadas} label="Conciliadas" colorClase="bg-emerald-500/10 text-emerald-600" />
        {estado === "Pendiente" && (
          <StatCard icon={Money} value={`${contador.montoPendiente.toFixed(2)} €`} label="Monto pendiente" colorClase="bg-primary/10 text-primary" />
        )}
        <StatCard icon={Category2} value={total} label="Total registros" colorClase="bg-muted text-muted-foreground" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{titulo}</h1>
          <p className="text-sm text-muted-foreground">{subtitulo}</p>
        </div>
        <div className="flex items-center gap-2">
          {estado === "Pendiente" && seleccionados.length === 2 && (
            <Button size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={abrirComparacion}>
              <TickCircle className="size-4" /> Conciliar #{seleccionados[0]} + #{seleccionados[1]}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={cargar} disabled={cargando}>
            <Refresh2 className={`size-3.5 ${cargando ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">Error: {error}</div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        {cargando ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {estado === "Pendiente" ? "No hay transferencias pendientes." : "No hay transferencias conciliadas."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {estado === "Pendiente" && <TableHead className="w-8" />}
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Remitente</TableHead>
                <TableHead>Beneficiario</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Confianza</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((m) => (
                <TableRow key={m.id}>
                  {estado === "Pendiente" && (
                    <TableCell>
                      <Checkbox checked={seleccionados.includes(m.id)} onCheckedChange={() => toggleSeleccion(m.id)} />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs">#{m.id}</TableCell>
                  <TableCell className="text-xs">{new Date(m.fecha_registro).toLocaleDateString("es-ES")}</TableCell>
                  <TableCell>
                    <Badge variant={m.origen === "Cliente" ? "secondary" : "default"}>{m.origen || "-"}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{fmtMonto(m.monto, m.moneda)}</TableCell>
                  <TableCell className="max-w-40 truncate text-sm" title={m.remitente || ""}>{m.remitente || "-"}</TableCell>
                  <TableCell className="max-w-40 truncate text-sm" title={m.beneficiario || ""}>{m.beneficiario || "-"}</TableCell>
                  <TableCell className="max-w-48 truncate text-sm" title={m.concepto || ""}>{m.concepto || "-"}</TableCell>
                  <TableCell className="text-sm">{m.banco || "-"}</TableCell>
                  <TableCell className="text-sm">{m.confianza ? `${Math.round(Number(m.confianza) * 100)}%` : "-"}</TableCell>
                  <TableCell>
                    {m.link_foto ? (
                      <a
                        href={`https://drive.google.com/file/d/${m.link_foto}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Ver <ExportSquare className="size-3" />
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {estado === "Pendiente" ? (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => conciliarIndividual(m.id)}>
                        <TickCircle className="size-3.5" /> Conciliar sola
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setARevertir(m)}>
                        <RotateLeft className="size-3.5" /> Revertir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConciliarParDialog
        t1={parAConciliar?.[0] || null}
        t2={parAConciliar?.[1] || null}
        onOpenChange={(o) => !o && setParAConciliar(null)}
        onConciliado={() => { setParAConciliar(null); setSeleccionados([]); cargar(); }}
      />

      <ConfirmarDialog
        open={aRevertir !== null}
        onOpenChange={(o) => !o && setARevertir(null)}
        titulo="Revertir conciliación"
        detalles={aRevertir ? [
          { label: "Remitente", value: aRevertir.remitente || "-" },
          { label: "Monto", value: fmtMonto(aRevertir.monto, aRevertir.moneda) },
        ] : []}
        pregunta="¿Devolver esta transferencia a pendientes?"
        textoConfirmar="Revertir"
        onConfirmar={confirmarRevertir}
        confirmando={revirtiendo}
      />
    </div>
  );
}
