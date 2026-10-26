"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ESTADOS_PROPUESTA, eur, type CatalogoPropuestas, type Propuesta } from "@/lib/propuestas";
import { useApi } from "../use-api";
import { NuevaPropuestaDialog } from "./nueva-propuesta-dialog";
import { PropuestaDialog } from "./propuesta-dialog";

/** CRM · Propuestas: la IA redacta propuestas comerciales (para los servicios de agencia o de Kelatos); tú pones los precios y las editas. No envía nada. */
export default function PropuestasPage() {
  const [recarga, setRecarga] = useState(0);
  const [nueva, setNueva] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const lista = useApi<{ ok: boolean; propuestas: Propuesta[] }>("/api/crm/propuestas", recarga);
  const catalogo = useApi<CatalogoPropuestas>("/api/crm/propuestas/catalogo");
  const recargar = () => setRecarga((n) => n + 1);
  const filas = lista.datos?.propuestas ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">CRM · Propuestas</h1>
          <p className="text-sm text-muted-foreground">Cuenta qué necesita el cliente y la IA redacta la propuesta comercial. Los precios los pones tú; después la editas y la descargas en PDF.</p>
        </div>
        <Button className="gap-1.5" disabled={!catalogo.datos} onClick={() => setNueva(true)}><Plus className="size-4" /> Nueva propuesta</Button>
      </div>

      {lista.error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{lista.error}</p>}

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Propuesta</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total (IVA incl.)</TableHead>
              <TableHead>Creada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.cargando && Array.from({ length: 3 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)}
            {!lista.cargando && filas.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Todavía no hay propuestas. Pulsa «Nueva propuesta».</TableCell></TableRow>}
            {filas.map((p) => {
              const est = ESTADOS_PROPUESTA.find((e) => e.id === p.estado);
              return (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setAbierta(Number(p.id))}>
                  <TableCell className="font-medium">{p.cliente}<div className="text-xs font-normal text-muted-foreground">{p.sector || "—"}</div></TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{p.titulo || "—"}</TableCell>
                  <TableCell><span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${est?.chip ?? ""}`}>{est?.nombre ?? p.estado}</span></TableCell>
                  <TableCell className="text-right tabular-nums">{p.precios.length ? eur(p.totales.total) : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(p.creado_en).toLocaleDateString("es-ES")}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {nueva && catalogo.datos && (
        <NuevaPropuestaDialog
          catalogo={catalogo.datos}
          onCerrar={() => setNueva(false)}
          onCreada={(id) => { setNueva(false); recargar(); setAbierta(id); }}
        />
      )}
      {abierta !== null && <PropuestaDialog key={abierta} id={abierta} onCerrar={() => { setAbierta(null); recargar(); }} onCambio={recargar} />}
    </div>
  );
}
