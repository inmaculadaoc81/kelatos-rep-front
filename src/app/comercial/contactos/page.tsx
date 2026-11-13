"use client";

import { useCallback, useEffect, useState } from "react";
import { Call, ArrowLeft2, ArrowRight2, SearchNormal1 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiComercial, ETIQUETA_ESTADO_CONTACTO, fechaHoraCorta, type Contacto } from "@/lib/comercial";
import { useSoftphone, type ResumenFinLlamada } from "../../(app)/softphone";
import { useComercial } from "../contexto";
import { AvisoSinTelefonia, FichaDialog, InsigniaEstado, ResultadoDialog, SelectorAgente, useLlamarContacto } from "../componentes";

const POR_PAGINA = 25;
const TODOS = "__todos";

export default function ContactosPage() {
  const { admin, email } = useComercial();
  const softphone = useSoftphone();
  const [agente, setAgente] = useState("");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<{ total: number; contactos: Contacto[] } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<{ contacto: Contacto; llamadaId: string | null; contestada: boolean } | null>(null);

  const cargar = useCallback(async (pag: number) => {
    setCargando(true); setError(null);
    try {
      const d = await apiComercial<{ total: number; contactos: Contacto[] }>("contactos", {
        params: { agente: admin ? agente : email, q: q.trim(), estado, limit: POR_PAGINA, offset: (pag - 1) * POR_PAGINA },
      });
      setDatos(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    } finally {
      setCargando(false);
    }
  }, [admin, agente, email, q, estado]);

  useEffect(() => {
    const t = setTimeout(() => { setPagina(1); void cargar(1); }, 350);
    return () => clearTimeout(t);
  }, [cargar]);

  const alColgar = useCallback((c: Contacto, fin: ResumenFinLlamada) => setPendiente({ contacto: c, llamadaId: fin.llamadaId, contestada: fin.contestada }), []);
  const { llamar, ocupado } = useLlamarContacto(alColgar);

  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const irA = (p: number) => { setPagina(p); void cargar(p); };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Contactos</h1>
        <p className="text-sm text-muted-foreground">{admin ? "Todos los contactos de las listas, de cualquier agente." : "Todos los contactos de tus listas. Busca por empresa, teléfono, ciudad o sector."}</p>
      </div>
      {!softphone.disponible && <AvisoSinTelefonia />}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
        <div className="relative">
          <SearchNormal1 className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar empresa, teléfono, ciudad…" className="w-72 pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Estado</label>
          <Select value={estado || TODOS} onValueChange={(v) => setEstado(!v || v === TODOS ? "" : v)}>
            <SelectTrigger className="h-9 w-48" aria-label="Estado"><SelectValue>{(v: string) => (v === TODOS ? "Todos" : ETIQUETA_ESTADO_CONTACTO[v] ?? v)}</SelectValue></SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {Object.entries(ETIQUETA_ESTADO_CONTACTO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <SelectorAgente valor={agente} onCambio={setAgente} />
        {datos && <span className="ml-auto inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{total.toLocaleString("es-ES")} contactos</span>}
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Ciudad / sector</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="whitespace-nowrap">Última gestión</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && !datos && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {datos && datos.contactos.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No hay contactos con esos filtros.</TableCell></TableRow>
            )}
            {datos?.contactos.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setFicha(c.id)}>
                <TableCell className="text-sm font-medium">{c.empresa}<div className="text-xs font-normal text-muted-foreground">{c.lista}</div></TableCell>
                <TableCell className="text-sm">{c.contacto || "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{c.telefono}</TableCell>
                <TableCell className="text-sm">{[c.ciudad, c.sector].filter(Boolean).join(" · ") || "—"}</TableCell>
                <TableCell><InsigniaEstado estado={c.estado} /></TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fechaHoraCorta(c.ultima_gestion)}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={ocupado || !softphone.disponible} onClick={(e) => { e.stopPropagation(); llamar(c); }}>
                    <Call className="size-3.5" /> Llamar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {datos && paginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" disabled={pagina <= 1} onClick={() => irA(pagina - 1)}><ArrowLeft2 className="size-4" /></Button>
          <span className="text-sm text-muted-foreground">Página {pagina} de {paginas}</span>
          <Button variant="outline" size="icon" disabled={pagina >= paginas} onClick={() => irA(pagina + 1)}><ArrowRight2 className="size-4" /></Button>
        </div>
      )}

      {ficha && <FichaDialog id={ficha} onCerrar={() => setFicha(null)} onCambio={() => void cargar(pagina)} />}
      {pendiente && (
        <ResultadoDialog
          contacto={pendiente.contacto}
          llamadaId={pendiente.llamadaId}
          contestada={pendiente.contestada}
          onCerrar={() => { setPendiente(null); void cargar(pagina); }}
          onGuardado={() => { setPendiente(null); void cargar(pagina); }}
        />
      )}
    </div>
  );
}
