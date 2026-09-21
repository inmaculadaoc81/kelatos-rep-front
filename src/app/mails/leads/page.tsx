"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Refresh2, SearchNormal1, DocumentUpload } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import { ESTADOS_LEAD, EstadoLead, KpisLeads, LeadLista } from "@/lib/mails";
import { PastillaEstado, fechaHora } from "../componentes-correo";
import { ImportarLeadsDialog } from "./importar-leads-dialog";

const PAGINA = 50;

export default function LeadsPage() {
  const esSuperadmin = useEsSuperadmin();
  const [leads, setLeads] = useState<LeadLista[]>([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState<KpisLeads | null>(null);
  const [estado, setEstado] = useState<EstadoLead | null>(null);
  const [grupo, setGrupo] = useState("");
  const [grupos, setGrupos] = useState<{ grupo: string; n: number }[]>([]);
  const [orden, setOrden] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importar, setImportar] = useState(false);
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const parametros = useCallback(
    (offset: number) => {
      const p = new URLSearchParams({ limit: String(PAGINA), offset: String(offset) });
      if (estado) p.set("estado", estado);
      if (grupo) p.set("grupo", grupo);
      if (orden) p.set("orden", orden);
      if (busquedaAplicada.trim()) p.set("q", busquedaAplicada.trim());
      return p.toString();
    },
    [estado, grupo, orden, busquedaAplicada]
  );

  const cargar = useCallback(async () => {
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/mails/leads?${parametros(0)}`);
      const data = await res.json();
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setLeads(data.leads as LeadLista[]);
      setTotal(data.total as number);
      setKpis(data.kpis as KpisLeads);
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [parametros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cargarGrupos = useCallback(async () => {
    try {
      const res = await fetch("/api/mails/leads/grupos");
      const data = await res.json();
      if (data.ok) setGrupos(data.grupos);
    } catch {
      /* el filtro por grupo es secundario */
    }
  }, []);

  useEffect(() => {
    cargarGrupos();
  }, [cargarGrupos]);

  async function mostrarMas() {
    const id = consulta.current;
    setCargandoMas(true);
    try {
      const res = await fetch(`/api/mails/leads?${parametros(leads.length)}`);
      const data = await res.json();
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setLeads((prev) => {
        const vistos = new Set(prev.map((l) => l.id));
        return [...prev, ...(data.leads as LeadLista[]).filter((l) => !vistos.has(l.id))];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargandoMas(false);
    }
  }

  const tarjeta = (activa: boolean) => `rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/40 ${activa ? "ring-2 ring-primary/50" : ""}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">Empresas y contactos a los que se escribe: su estado, lo que se les envió y lo que respondieron</p>
        </div>
        <div className="flex items-center gap-2">
          {esSuperadmin && (
            <Button size="sm" className="gap-1.5" onClick={() => setImportar(true)}>
              <DocumentUpload className="size-4" /> Importar leads
            </Button>
          )}
          <Button variant="outline" size="icon" className="size-8" onClick={() => { cargar(); cargarGrupos(); }} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <button type="button" aria-pressed={estado === null} onClick={() => setEstado(null)} className={tarjeta(estado === null)}>
          <p className="text-xs text-muted-foreground">Todos</p>
          <p className="text-lg font-semibold tabular-nums">{kpis ? kpis.total.toLocaleString("es-ES") : "…"}</p>
        </button>
        {ESTADOS_LEAD.map((e) => (
          <button key={e} type="button" aria-pressed={estado === e} onClick={() => setEstado(estado === e ? null : e)} className={tarjeta(estado === e)}>
            <p className="text-xs text-muted-foreground">{e}</p>
            <p className="text-lg font-semibold tabular-nums">{kpis ? kpis[e].toLocaleString("es-ES") : "…"}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar empresa, email, contacto, ciudad…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        {grupos.length > 0 && (
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={grupo} onChange={(e) => setGrupo(e.target.value)} aria-label="Grupo de envío">
            <option value="">Todos los grupos</option>
            {grupos.map((g) => (
              <option key={g.grupo} value={g.grupo}>
                {g.grupo} ({g.n.toLocaleString("es-ES")})
              </option>
            ))}
          </select>
        )}
        <select className="h-8 rounded-md border bg-background px-2 text-sm" value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar">
          <option value="">Actividad reciente</option>
          <option value="nombre">Nombre (A-Z)</option>
          <option value="reciente">Más nuevos</option>
          <option value="envio">Último envío</option>
          <option value="respuesta">Última respuesta</option>
        </select>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Paso</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead className="text-right">Enviados</TableHead>
              <TableHead className="text-right">Recibidos</TableHead>
              <TableHead>Último envío</TableHead>
              <TableHead>Última respuesta</TableHead>
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
            {!cargando && leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  {busquedaAplicada || estado || grupo ? "Ningún lead coincide con los filtros" : `Todavía no hay leads.${esSuperadmin ? " Pulsa «Importar leads» para cargar tu base." : ""}`}
                </TableCell>
              </TableRow>
            )}
            {!cargando &&
              leads.map((l) => (
                <TableRow key={l.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell>
                    <Link href={`/mails/leads/${l.id}`} className="block">
                      <span className="text-sm font-medium">{l.nombre}</span>
                      {(l.contacto || l.ciudad) && <span className="block text-xs text-muted-foreground">{[l.contacto, l.ciudad].filter(Boolean).join(" · ")}</span>}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{l.email || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <PastillaEstado estado={l.estado} />
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums">{l.paso || "—"}</TableCell>
                  <TableCell className="text-sm">{l.grupo_envio || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{l.enviados}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{l.recibidos}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fechaHora(l.ultimo_envio)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fechaHora(l.ultima_respuesta)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        {!cargando && leads.length < total && (
          <div className="border-t p-3 text-center">
            <Button variant="outline" size="sm" disabled={cargandoMas} onClick={mostrarMas}>
              {cargandoMas ? "Cargando…" : `Mostrar más (${leads.length.toLocaleString("es-ES")} de ${total.toLocaleString("es-ES")})`}
            </Button>
          </div>
        )}
      </div>

      {esSuperadmin && (
        <ImportarLeadsDialog open={importar} onOpenChange={setImportar} onImportado={() => { cargar(); cargarGrupos(); }} />
      )}
    </div>
  );
}
