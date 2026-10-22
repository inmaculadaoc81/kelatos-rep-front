"use client";

import { useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORIGENES, nombreCategoria, nombreEtapa, nombreOrigen } from "@/lib/crm";
import type { ContactoCorreo } from "@/lib/crm-correos";
import { useApi } from "../use-api";

const POR_PAGINA = 100;
const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function TabContactos() {
  const [q, setQ] = useState("");
  const [fuente, setFuente] = useState("");
  const [soloAptos, setSoloAptos] = useState(true);
  const [limite, setLimite] = useState(POR_PAGINA);
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (fuente) params.set("fuente", fuente);
  if (soloAptos) params.set("aptos", "1");
  const { datos, error } = useApi<{ ok: boolean; contactos: ContactoCorreo[] }>(`/api/crm/correos/contactos?${params.toString()}`);
  const filas = datos?.contactos ?? [];

  function exportar() {
    const cabecera = ["Correo", "Nombre", "Tipo", "Canal", "Etapa", "Clasificación", "Estado de envío"];
    const cuerpo = filas.map((c) => [c.email, c.nombre, c.tipo === "cliente" ? "Cliente" : "Lead", c.canal ? nombreOrigen(c.canal) : "", c.etapa ? nombreEtapa(c.etapa) : "", c.categoria ? nombreCategoria(c.categoria) : "", c.bloqueo ?? "Apto"]);
    const csv = "﻿" + [cabecera, ...cuerpo].map((f) => f.map(celda).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `contactos-correo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-3 pt-2">
      <p className="text-sm text-muted-foreground">Todos los correos que tenemos: los de los leads del CRM y los de los clientes de Reparaciones, una vez cada uno. Los que tienen baja, rebotaron o están en «No contactar» salen marcados y no recibirán envíos.</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por correo o nombre…" value={q} onChange={(e) => { setQ(e.target.value); setLimite(POR_PAGINA); }} />
        </div>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={fuente} onChange={(e) => { setFuente(e.target.value); setLimite(POR_PAGINA); }} aria-label="Origen">
          <option value="">Todos los orígenes</option>
          <option value="cliente">Clientes de Reparaciones</option>
          {ORIGENES.map((o) => <option key={o.id} value={o.id}>Lead · {o.nombre}</option>)}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm"><input type="checkbox" checked={soloAptos} onChange={(e) => { setSoloAptos(e.target.checked); setLimite(POR_PAGINA); }} /> Solo aptos</label>
        <Button variant="outline" className="ml-auto gap-1.5" disabled={filas.length === 0} onClick={exportar}><Download className="size-4" /> Exportar</Button>
      </div>
      {error && <p className="text-sm text-destructive">No se pudo cargar: {error}</p>}
      {!datos && !error && <Skeleton className="h-48 w-full" />}
      {datos && (
        <div className="rounded-lg border bg-card">
          <p className="border-b px-3 py-2 text-xs text-muted-foreground">{filas.length} contacto{filas.length === 1 ? "" : "s"}{filas.length === 2000 ? " (se muestran los primeros 2.000; afina con los filtros)" : ""}</p>
          <Table>
            <TableHeader><TableRow><TableHead>Correo</TableHead><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Canal</TableHead><TableHead>Etapa</TableHead><TableHead>Envío</TableHead></TableRow></TableHeader>
            <TableBody>
              {filas.slice(0, limite).map((c) => (
                <TableRow key={c.email}>
                  <TableCell className="text-xs">{c.email}</TableCell>
                  <TableCell className="font-medium">{c.nombre || "—"}</TableCell>
                  <TableCell className="text-xs">{c.tipo === "cliente" ? "Cliente" : "Lead"}</TableCell>
                  <TableCell className="text-xs">{c.canal ? nombreOrigen(c.canal) : "—"}</TableCell>
                  <TableCell className="text-xs">{c.etapa ? nombreEtapa(c.etapa) : "—"}</TableCell>
                  <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${c.bloqueo ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{c.bloqueo ?? "Apto"}</span></TableCell>
                </TableRow>
              ))}
              {filas.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No hay contactos con estos filtros.</TableCell></TableRow>}
            </TableBody>
          </Table>
          {filas.length > limite && <div className="border-t p-3 text-center"><Button variant="outline" size="sm" onClick={() => setLimite((n) => n + POR_PAGINA)}>Mostrar {Math.min(POR_PAGINA, filas.length - limite)} más ({filas.length - limite} restantes)</Button></div>}
        </div>
      )}
    </div>
  );
}
