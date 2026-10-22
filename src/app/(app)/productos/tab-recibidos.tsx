"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Recibido {
  id: string; ean: string; producto_id: string | null; nombre: string; marca: string | null; modelo: string | null;
  numero_serie: string | null; cantidad: number; usuario: string | null; recibido_en: string;
}

const fecha = (iso: string) => new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Unidades recibidas con el escáner (Beta, solo administradores): qué llegó, con qué número de serie, quién lo registró y cuándo. */
export function TabRecibidos() {
  const [filas, setFilas] = useState<Recibido[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [ahora] = useState(() => Date.now()); // fecha de referencia fija mientras la pestaña está abierta

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const res = await fetch("/api/recepcion-equipos/recibidos?limite=200", { cache: "no-store" });
        const d = (await res.json()) as { ok: boolean; error?: string; recibidos: Recibido[] };
        if (!d.ok) throw new Error(d.error || "No se pudo cargar");
        if (vigente) setFilas(d.recibidos);
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : "Error");
      }
    })();
    return () => { vigente = false; };
  }, []);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (filas ?? []).filter((f) => !t || [f.nombre, f.marca, f.modelo, f.numero_serie, f.ean, f.producto_id, f.usuario].some((v) => String(v ?? "").toLowerCase().includes(t)));
  }, [filas, q]);

  const kpis = useMemo(() => {
    const todas = filas ?? [];
    const hoy = new Date(ahora).toDateString();
    const semana = ahora - 7 * 86400_000;
    return {
      unidades: todas.reduce((s, f) => s + f.cantidad, 0),
      hoy: todas.filter((f) => new Date(f.recibido_en).toDateString() === hoy).reduce((s, f) => s + f.cantidad, 0),
      semana: todas.filter((f) => new Date(f.recibido_en).getTime() >= semana).reduce((s, f) => s + f.cantidad, 0),
      modelos: new Set(todas.map((f) => f.ean)).size,
    };
  }, [filas, ahora]);

  function exportar() {
    const cab = ["Fecha", "Equipo", "Marca", "Modelo", "Nº de serie", "Cantidad", "Producto", "Código de barras", "Registrado por"];
    const cuerpo = visibles.map((f) => [fecha(f.recibido_en), f.nombre, f.marca, f.modelo, f.numero_serie, f.cantidad, f.producto_id, f.ean, f.usuario]);
    const csv = "﻿" + [cab, ...cuerpo].map((r) => r.map(celda).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `equipos-recibidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Cada equipo registrado con el escáner o con «Recibir equipo», unidad por unidad. Función en <strong>Beta</strong>: solo la ven los administradores. El stock en sí está en la pestaña «Productos».
      </p>
      {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</p>}
      {!filas && !error && <Skeleton className="h-48 w-full" />}
      {filas && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi titulo="Unidades recibidas" valor={kpis.unidades} />
            <Kpi titulo="Hoy" valor={kpis.hoy} />
            <Kpi titulo="Últimos 7 días" valor={kpis.semana} />
            <Kpi titulo="Modelos distintos" valor={kpis.modelos} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por equipo, marca, serie o código…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button variant="outline" className="ml-auto gap-1.5" disabled={visibles.length === 0} onClick={exportar}><Download className="size-4" /> Exportar</Button>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Fecha</TableHead><TableHead>Equipo</TableHead><TableHead>Nº de serie</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead>Producto</TableHead><TableHead>Código</TableHead><TableHead>Registró</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs">{fecha(f.recibido_en)}</TableCell>
                    <TableCell className="font-medium">{f.nombre}<span className="block text-xs font-normal text-muted-foreground">{[f.marca, f.modelo].filter(Boolean).join(" · ")}</span></TableCell>
                    <TableCell className="font-mono text-xs">{f.numero_serie ?? "—"}</TableCell>
                    <TableCell className="text-right">{f.cantidad}</TableCell>
                    <TableCell className="text-xs">{f.producto_id ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{f.ean}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.usuario ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {visibles.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">{filas.length === 0 ? "Todavía no se ha recibido ningún equipo con el escáner." : "Ninguno coincide con la búsqueda."}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className="mt-1 text-2xl font-semibold">{valor}</p>
      </CardContent>
    </Card>
  );
}
