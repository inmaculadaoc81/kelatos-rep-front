"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, DocumentText } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatearFecha } from "@/lib/dias-entrega";
import { FacturaCliente, ETIQUETA_TIPO_FACTURA, TipoFactura } from "@/lib/facturas-cliente";

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

const ESTILO_TIPO: Record<TipoFactura, string> = {
  normal: "border-sky-500/40 text-sky-700 dark:text-sky-400",
  revision: "border-violet-500/40 text-violet-700 dark:text-violet-400",
  mensajeria: "border-blue-500/40 text-blue-700 dark:text-blue-400",
  anticipo: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  rectificativa: "border-destructive/40 text-destructive",
  rectificativa_revision: "border-destructive/40 text-destructive",
  corregida: "border-orange-500/40 text-orange-700 dark:text-orange-400",
  corregida_revision: "border-orange-500/40 text-orange-700 dark:text-orange-400",
};

export default function FacturasClientesPage() {
  const [facturas, setFacturas] = useState<FacturaCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/facturas-clientes");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setFacturas(data.facturas as FacturaCliente[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtradas = useMemo(() => {
    let lista = facturas;
    if (tipo) lista = lista.filter((f) => f.tipo === tipo);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(
        (f) =>
          f.resguardo.toLowerCase().includes(q) ||
          f.numero.toLowerCase().includes(q) ||
          f.cliente.toLowerCase().includes(q) ||
          f.dniCif.toLowerCase().includes(q)
      );
    }
    return [...lista].sort((a, b) => b.numero.localeCompare(a.numero));
  }, [facturas, busqueda, tipo]);

  const totalFacturado = useMemo(() => filtradas.reduce((acc, f) => acc + f.total, 0), [filtradas]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Facturas de Clientes</h1>
          <p className="text-sm text-muted-foreground">Todas las facturas emitidas — reparación, revisión, mensajería y rectificativas</p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Resguardo, nº factura, cliente..." className="pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={tipo || "__todos__"} onValueChange={(v) => setTipo(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-52">
            <SelectValue>{(v: string) => (v === "__todos__" ? "Todos los tipos" : ETIQUETA_TIPO_FACTURA[v as TipoFactura])}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los tipos</SelectItem>
            {Object.entries(ETIQUETA_TIPO_FACTURA).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!cargando && (
          <span className="ml-auto text-sm text-muted-foreground">
            {filtradas.length} facturas · <span className="font-semibold text-foreground">{euros(totalFacturado)}</span>
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Factura</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Resguardo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Forma de pago</TableHead>
              <TableHead>PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtradas.map((f) => (
                <TableRow key={`${f.resguardo}-${f.tipo}`}>
                  <TableCell className="font-mono text-sm font-semibold">{f.numero}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ESTILO_TIPO[f.tipo]}>
                      {ETIQUETA_TIPO_FACTURA[f.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{f.resguardo}</TableCell>
                  <TableCell>
                    <div className="text-sm">{f.cliente || "-"}</div>
                    {f.dniCif && <div className="text-xs text-muted-foreground">{f.dniCif}</div>}
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-sm text-muted-foreground">{f.equipo || "-"}</TableCell>
                  <TableCell className="text-sm">{formatearFecha(f.fecha)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">{euros(f.total)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.formaPago || "-"}</TableCell>
                  <TableCell>
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        <DocumentText className="size-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
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
