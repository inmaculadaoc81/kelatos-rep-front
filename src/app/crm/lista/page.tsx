"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BANDEJAS, CATEGORIAS, ETAPAS, ORIGENES, accionVencida, chipCategoria, euros, haceCuanto, nombreCategoria, nombreEtapa, nombreOrigen, type Lead } from "@/lib/crm";
import { descargarCsvLeads } from "@/lib/exportar-leads";
import { useApi } from "../use-api";
import { NuevoLeadDialog } from "../nuevo-lead-dialog";
import { FichaLeadDialog } from "../ficha-lead-dialog";

const POR_PAGINA = 50;

export default function CrmListaPage() {
  // useSearchParams (para abrir la tabla ya filtrada por etapa desde un enlace) exige un Suspense.
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full" />}>
      <ListaContenido />
    </Suspense>
  );
}

function ListaContenido() {
  const inicial = useSearchParams().get("etapa") ?? "";
  const [recarga, setRecarga] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [etapa, setEtapa] = useState(ETAPAS.some((e) => e.id === inicial) ? inicial : "");
  const [origen, setOrigen] = useState("");
  const [bandeja, setBandeja] = useState("");
  const [categoria, setCategoria] = useState("");
  const [soloCorreo, setSoloCorreo] = useState(false);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [nuevo, setNuevo] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);

  const params = new URLSearchParams();
  if (busqueda.trim()) params.set("q", busqueda.trim());
  if (etapa) params.set("etapa", etapa);
  if (origen) params.set("origen", origen);
  if (bandeja) params.set("bandeja", bandeja);
  if (categoria) params.set("categoria", categoria);
  const { datos, error } = useApi<{ ok: boolean; leads: Lead[] }>(`/api/crm/leads?${params.toString()}`, recarga);
  const recargar = () => setRecarga((n) => n + 1);
  // Al cambiar un filtro se vuelve a las primeras 50 filas.
  const cambiar = (fn: () => void) => { fn(); setLimite(POR_PAGINA); };
  const filas = (datos?.leads ?? []).filter((l) => !soloCorreo || !!l.email);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">CRM · Todos los leads</h1>
          <p className="text-sm text-muted-foreground">Todos los canales juntos en una tabla, para revisar, filtrar y descargar (por ejemplo, los que tienen correo para escribirles). Para trabajar un lead y ver su conversación, entra en su canal. {datos ? `${filas.length} resultado${filas.length === 1 ? "" : "s"}.` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" disabled={filas.length === 0} onClick={() => descargarCsvLeads(filas, "leads")} title="Descarga en Excel (CSV) lo que ves con los filtros actuales"><Download className="size-4" /> Exportar</Button>
          <Button className="gap-1.5" onClick={() => setNuevo(true)}><Plus className="size-4" /> Nuevo lead</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por nombre, teléfono, correo o DNI…" value={busqueda} onChange={(e) => cambiar(() => setBusqueda(e.target.value))} />
        </div>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={etapa} onChange={(e) => cambiar(() => setEtapa(e.target.value))} aria-label="Etapa">
          <option value="">Todas las etapas</option>
          {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={origen} onChange={(e) => cambiar(() => setOrigen(e.target.value))} aria-label="Origen">
          <option value="">Todos los orígenes</option>
          {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={bandeja} onChange={(e) => cambiar(() => setBandeja(e.target.value))} aria-label="WhatsApp">
          <option value="">Todos los WhatsApp</option>
          {BANDEJAS.map((b) => <option key={b.id} value={b.id}>{b.nombre} · {b.numero}</option>)}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm"><input type="checkbox" checked={soloCorreo} onChange={(e) => cambiar(() => setSoloCorreo(e.target.checked))} /> Solo con correo</label>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={categoria} onChange={(e) => cambiar(() => setCategoria(e.target.value))} aria-label="Clasificación">
          <option value="">Todas las clasificaciones</option>
          {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
                <TableHead>Línea o agente</TableHead>
                <TableHead>Clasificación</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Próxima acción</TableHead>
                <TableHead>Último contacto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.slice(0, limite).map((l) => {
                const et = ETAPAS.find((e) => e.id === l.etapa);
                return (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => setAbierto(l.id)}>
                    <TableCell className="font-medium">{l.nombre}</TableCell>
                    <TableCell className="text-xs">{l.telefono ?? "—"}{l.email ? <span className="block text-muted-foreground">{l.email}</span> : null}</TableCell>
                    <TableCell>{nombreOrigen(l.origen)}</TableCell>
                    <TableCell className="text-xs">{l.bandeja_nombre ?? "—"}{l.numero_destino ? <span className="block text-muted-foreground">{l.numero_destino}</span> : null}</TableCell>
                    <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${chipCategoria(l.categoria)}`}>{nombreCategoria(l.categoria)}</span></TableCell>
                    <TableCell><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${et?.chip ?? ""}`}>{nombreEtapa(l.etapa)}</span></TableCell>
                    <TableCell className="text-xs">{l.responsable ?? "—"}</TableCell>
                    <TableCell className="text-right">{euros(l.valor_estimado)}</TableCell>
                    <TableCell className={`text-xs ${accionVencida(l) ? "font-medium text-rose-700" : ""}`}>{l.proxima_accion ?? "—"}{l.proxima_accion_fecha ? ` · ${l.proxima_accion_fecha.split("-").reverse().join("/")}` : ""}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.ultimo_contacto ? haceCuanto(l.ultimo_contacto) : "—"}</TableCell>
                  </TableRow>
                );
              })}
              {filas.length === 0 && (
                <TableRow><TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">No hay leads con estos filtros.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {filas.length > limite && (
            <div className="border-t p-3 text-center">
              <Button variant="outline" size="sm" onClick={() => setLimite((n) => n + POR_PAGINA)}>Mostrar {Math.min(POR_PAGINA, filas.length - limite)} más ({filas.length - limite} restantes)</Button>
            </div>
          )}
        </div>
      )}

      {nuevo && <NuevoLeadDialog onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); recargar(); setAbierto(id); }} onAbrir={(id) => { setNuevo(false); setAbierto(id); }} />}
      {abierto !== null && <FichaLeadDialog id={abierto} onCerrar={() => setAbierto(null)} onCambio={recargar} />}
    </div>
  );
}
