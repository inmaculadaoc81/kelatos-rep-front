"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Refresh2, SearchNormal1, DocumentUpload, Sms, Category, Clock, Send2, Timer1, TickCircle, CloseCircle, Warning2,
  ArrowLeft2, ArrowLeft3, ArrowRight2, ArrowRight3,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import { EstadoLead, KpisLeads, LeadLista } from "@/lib/mails";
import { PastillaEstado, fechaHora } from "../componentes-correo";
import { ImportarLeadsDialog } from "./importar-leads-dialog";

const FILAS_POR_PAGINA_OPCIONES = ["15", "20", "30", "40", "50", "100"];

// Mismos colores que COLOR_ESTADO_LEAD (lib/mails.ts) — la tarjeta y la
// pastilla del estado deben leerse como el mismo código de color.
const TARJETAS: { clave: keyof KpisLeads; etiqueta: string; estado: EstadoLead | null; icono: typeof Category; color: string }[] = [
  { clave: "total", etiqueta: "Todos", estado: null, icono: Category, color: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
  { clave: "Pendiente", etiqueta: "Pendiente", estado: "Pendiente", icono: Clock, color: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
  { clave: "Enviado", etiqueta: "Enviado", estado: "Enviado", icono: Send2, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { clave: "Follow up", etiqueta: "Follow up", estado: "Follow up", icono: Timer1, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { clave: "Respondió", etiqueta: "Respondió", estado: "Respondió", icono: TickCircle, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { clave: "No contactar", etiqueta: "No contactar", estado: "No contactar", icono: CloseCircle, color: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300" },
  { clave: "Inválido", etiqueta: "Inválido", estado: "Inválido", icono: Warning2, color: "bg-red-500/10 text-red-600 dark:text-red-400" },
];

const KPIS_VACIOS: KpisLeads = { total: 0, Pendiente: 0, Enviado: 0, "Follow up": 0, Respondió: 0, "No contactar": 0, Inválido: 0 };

export default function LeadsPage() {
  const esSuperadmin = useEsSuperadmin();
  const [leads, setLeads] = useState<LeadLista[]>([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState<KpisLeads>(KPIS_VACIOS);
  // Por defecto se abre viendo "No contactar" — es donde caen los leads
  // recién traídos (de un CSV o de Reparaciones) antes de decidir a
  // quiénes arrancar una campaña de verdad.
  const [estado, setEstado] = useState<EstadoLead | null>("No contactar");
  const [grupo, setGrupo] = useState("");
  const [grupos, setGrupos] = useState<{ grupo: string; n: number }[]>([]);
  const [sector, setSector] = useState("");
  const [sectores, setSectores] = useState<{ sector: string; n: number }[]>([]);
  const [paso, setPaso] = useState("");
  const [orden, setOrden] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(15);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importar, setImportar] = useState(false);
  const [importandoReparaciones, setImportandoReparaciones] = useState(false);
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const parametros = useCallback(
    (pag: number, porPagina: number) => {
      const p = new URLSearchParams({ limit: String(porPagina), offset: String((pag - 1) * porPagina) });
      if (estado) p.set("estado", estado);
      if (grupo) p.set("grupo", grupo);
      if (sector) p.set("sector", sector);
      if (paso) p.set("paso", paso);
      if (orden) p.set("orden", orden);
      if (busquedaAplicada.trim()) p.set("q", busquedaAplicada.trim());
      return p.toString();
    },
    [estado, grupo, sector, paso, orden, busquedaAplicada]
  );

  // Cualquier filtro (no la página en sí) vuelve a la página 1 — si no, se
  // podría quedar viendo una página que ya no existe con el filtro nuevo.
  useEffect(() => {
    setPagina(1);
  }, [estado, grupo, sector, paso, orden, busquedaAplicada, filasPorPagina]);

  const cargar = useCallback(async () => {
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/mails/leads?${parametros(pagina, filasPorPagina)}`);
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
  }, [parametros, pagina, filasPorPagina]);

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

  const cargarSectores = useCallback(async () => {
    try {
      const res = await fetch("/api/mails/leads/sectores");
      const data = await res.json();
      if (data.ok) setSectores(data.sectores);
    } catch {
      /* el filtro por categoría es secundario */
    }
  }, []);

  useEffect(() => {
    cargarGrupos();
    cargarSectores();
  }, [cargarGrupos, cargarSectores]);

  /** Trae como leads (en "No contactar": solo la lista, no dispara ningún
      envío) a los clientes de Reparaciones que marcaron la casilla de
      marketing del formulario público. */
  async function importarDeReparaciones() {
    setImportandoReparaciones(true);
    try {
      const res = await fetch("/api/mails/leads/importar-reparaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actualizar: true }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`${data.creados} nuevos, ${data.actualizados} actualizados (en "No contactar": no se les escribe solo por traerlos aquí)`);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setImportandoReparaciones(false);
    }
  }

  const hayFiltros = !!(grupo || sector || paso || orden);
  const totalPaginas = Math.max(1, Math.ceil(total / filasPorPagina));
  const inicio = total === 0 ? 0 : (pagina - 1) * filasPorPagina;
  const fin = Math.min(inicio + filasPorPagina, total);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-blue-600 text-white">
            <Category className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Leads</h1>
            <p className="text-sm text-muted-foreground">Empresas y contactos a los que se escribe: su estado, lo que se les envió y lo que respondieron</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {esSuperadmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={importandoReparaciones}
              onClick={importarDeReparaciones}
              title='Clientes de Reparaciones que marcaron "Deseo recibir promociones..." en el formulario'
            >
              <Sms className="size-4" /> {importandoReparaciones ? "Importando…" : "Traer de Reparaciones"}
            </Button>
          )}
          {esSuperadmin && (
            <Button size="sm" className="gap-1.5" onClick={() => setImportar(true)}>
              <DocumentUpload className="size-4" /> Importar leads
            </Button>
          )}
          <Button variant="outline" size="icon" className="size-8" onClick={() => { cargar(); cargarGrupos(); cargarSectores(); }} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {TARJETAS.map((t) => {
          const activa = estado === t.estado;
          return (
            <button
              key={t.clave}
              type="button"
              aria-pressed={activa}
              onClick={() => setEstado(activa ? null : t.estado)}
              className={`flex items-center gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-muted/40 ${activa ? "ring-2 ring-primary/50" : ""}`}
            >
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${t.color}`}>
                <t.icono className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs text-muted-foreground">{t.etiqueta}</span>
                <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !leads.length ? "…" : kpis[t.clave].toLocaleString("es-ES")}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar empresa, email, contacto, ciudad…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        {sectores.length > 0 && (
          <Select value={sector || "Todos"} onValueChange={(v) => setSector(v && v !== "Todos" ? v : "")}>
            <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todas las categorías</SelectItem>
              {sectores.map((s) => (
                <SelectItem key={s.sector} value={s.sector}>{s.sector} ({s.n.toLocaleString("es-ES")})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {grupos.length > 0 && (
          <Select value={grupo || "Todos"} onValueChange={(v) => setGrupo(v && v !== "Todos" ? v : "")}>
            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Grupo de envío" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos los grupos</SelectItem>
              {grupos.map((g) => (
                <SelectItem key={g.grupo} value={g.grupo}>{g.grupo} ({g.n.toLocaleString("es-ES")})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={paso || "Todos"} onValueChange={(v) => setPaso(v && v !== "Todos" ? v : "")}>
          <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Paso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Cualquier paso</SelectItem>
            {Array.from({ length: 21 }, (_, i) => i).map((n) => (
              <SelectItem key={n} value={String(n)}>Paso {n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={orden || "reciente"} onValueChange={(v) => setOrden(v && v !== "reciente" ? v : "")}>
          <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Orden" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="reciente">Actividad reciente</SelectItem>
            <SelectItem value="nombre">Nombre (A-Z)</SelectItem>
            <SelectItem value="envio">Último envío</SelectItem>
            <SelectItem value="respuesta">Última respuesta</SelectItem>
          </SelectContent>
        </Select>
        {hayFiltros && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setGrupo(""); setSector(""); setPaso(""); setOrden(""); }}>
            Quitar filtros
          </Button>
        )}
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Paso</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead className="text-right">Enviados</TableHead>
              <TableHead className="text-right">Recibidos</TableHead>
              <TableHead className="text-right">Rebotes</TableHead>
              <TableHead>Último envío</TableHead>
              <TableHead>Última respuesta</TableHead>
              <TableHead>Creado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 13 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!cargando && leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="py-8 text-center text-muted-foreground">
                  {busquedaAplicada || estado || grupo || sector || paso ? "Ningún lead coincide con los filtros" : `Todavía no hay leads.${esSuperadmin ? " Pulsa «Importar leads» para cargar tu base." : ""}`}
                </TableCell>
              </TableRow>
            )}
            {!cargando &&
              leads.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/40">
                  <TableCell>
                    <Link href={`/mails/leads/${l.id}`} className="block hover:underline">
                      <span className="text-sm font-medium">{l.nombre}</span>
                      {(l.contacto || l.ciudad) && <span className="block text-xs text-muted-foreground">{[l.contacto, l.ciudad].filter(Boolean).join(" · ")}</span>}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{l.email || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{l.telefono || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="max-w-32 truncate text-sm" title={l.sector || undefined}>{l.sector || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <PastillaEstado estado={l.estado} />
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums">{l.paso || "—"}</TableCell>
                  <TableCell className="text-sm">{l.grupo_envio || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{l.enviados}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{l.recibidos}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{l.rebotes > 0 ? <span className="font-medium text-red-600 dark:text-red-400">{l.rebotes}</span> : l.rebotes}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fechaHora(l.ultimo_envio)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fechaHora(l.ultima_respuesta)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fechaHora(l.creado_en)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {total.toLocaleString("es-ES")} lead{total !== 1 ? "s" : ""}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filas por página:</span>
              <Select value={String(filasPorPagina)} onValueChange={(v) => { if (v) setFilasPorPagina(parseInt(v, 10)); }}>
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FILAS_POR_PAGINA_OPCIONES.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" disabled={pagina <= 1} onClick={() => setPagina(1)}>
                <ArrowLeft3 className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                <ArrowLeft2 className="size-3.5" />
              </Button>
              <span className="px-1 text-xs whitespace-nowrap text-muted-foreground">
                {total === 0 ? "" : `Página ${pagina} de ${totalPaginas} (${inicio + 1}–${fin})`}
              </span>
              <Button variant="outline" size="icon-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>
                <ArrowRight2 className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina(totalPaginas)}>
                <ArrowRight3 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {esSuperadmin && (
        <ImportarLeadsDialog open={importar} onOpenChange={setImportar} onImportado={() => { cargar(); cargarGrupos(); cargarSectores(); }} />
      )}
    </div>
  );
}
