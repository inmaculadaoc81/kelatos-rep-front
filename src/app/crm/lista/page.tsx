"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ETAPAS, ORIGENES, accionVencida, euros, haceCuanto, nombreEtapa, nombreOrigen, type Lead } from "@/lib/crm";
import { useApi } from "../use-api";
import { NuevoLeadDialog } from "../nuevo-lead-dialog";
import { FichaLeadDialog } from "../ficha-lead-dialog";

export default function CrmListaPage() {
  const [recarga, setRecarga] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [etapa, setEtapa] = useState("");
  const [origen, setOrigen] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);

  const params = new URLSearchParams();
  if (busqueda.trim()) params.set("q", busqueda.trim());
  if (etapa) params.set("etapa", etapa);
  if (origen) params.set("origen", origen);
  const { datos, error } = useApi<{ ok: boolean; leads: Lead[] }>(`/api/crm/leads?${params.toString()}`, recarga);
  const recargar = () => setRecarga((n) => n + 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">CRM · Lista</h1>
          <p className="text-sm text-muted-foreground">Todos los leads en una tabla, para buscar y filtrar. {datos ? `${datos.leads.length} resultados.` : ""}</p>
        </div>
        <Button className="gap-1.5" onClick={() => setNuevo(true)}><Plus className="size-4" /> Nuevo lead</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por nombre, teléfono o correo…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={etapa} onChange={(e) => setEtapa(e.target.value)} aria-label="Etapa">
          <option value="">Todas las etapas</option>
          {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={origen} onChange={(e) => setOrigen(e.target.value)} aria-label="Origen">
          <option value="">Todos los orígenes</option>
          {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      {!datos && !error && <Skeleton className="h-48 w-full" />}
      {datos && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Próxima acción</TableHead>
                <TableHead>Último contacto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datos.leads.map((l) => {
                const et = ETAPAS.find((e) => e.id === l.etapa);
                return (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => setAbierto(l.id)}>
                    <TableCell className="font-medium">{l.nombre}</TableCell>
                    <TableCell className="text-xs">{l.telefono ?? "—"}{l.email ? <span className="block text-muted-foreground">{l.email}</span> : null}</TableCell>
                    <TableCell>{nombreOrigen(l.origen)}</TableCell>
                    <TableCell><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${et?.chip ?? ""}`}>{nombreEtapa(l.etapa)}</span></TableCell>
                    <TableCell className="text-xs">{l.responsable ?? "—"}</TableCell>
                    <TableCell className="text-right">{euros(l.valor_estimado)}</TableCell>
                    <TableCell className={`text-xs ${accionVencida(l) ? "font-medium text-rose-700" : ""}`}>{l.proxima_accion ?? "—"}{l.proxima_accion_fecha ? ` · ${l.proxima_accion_fecha.split("-").reverse().join("/")}` : ""}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.ultimo_contacto ? haceCuanto(l.ultimo_contacto) : "—"}</TableCell>
                  </TableRow>
                );
              })}
              {datos.leads.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No hay leads con estos filtros.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {nuevo && <NuevoLeadDialog onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); recargar(); setAbierto(id); }} onAbrir={(id) => { setNuevo(false); setAbierto(id); }} />}
      {abierto !== null && <FichaLeadDialog id={abierto} onCerrar={() => setAbierto(null)} onCambio={recargar} />}
    </div>
  );
}
