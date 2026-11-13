"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft2, ArrowRight2, Clock } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiComercial, duracionCorta, ETIQUETA_RESULTADO, fechaHoraCorta, type LlamadaHistorial } from "@/lib/comercial";
import { useComercial } from "../contexto";
import { FichaDialog, SelectorAgente } from "../componentes";

const POR_PAGINA = 30;

const ESTADO_LLAMADA: Record<string, string> = {
  completada: "Contestada",
  contestada: "Contestada",
  no_contesta: "No contesta",
  ocupado: "Ocupado",
  fallida: "No se pudo llamar",
  iniciada: "En curso",
};

/** Mis llamadas: a quién se llamó, cuándo, cuánto duró y qué resultado se anotó. No hay transcripción ni audio: eso es solo de la dirección. */
export default function HistorialPage() {
  const { admin, email } = useComercial();
  const [agente, setAgente] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<{ total: number; llamadas: LlamadaHistorial[] } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<string | null>(null);

  const cargar = useCallback(async (pag: number) => {
    setCargando(true); setError(null);
    try {
      setDatos(await apiComercial("historial", { params: { agente: admin ? agente : email, desde, hasta, limit: POR_PAGINA, offset: (pag - 1) * POR_PAGINA } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    } finally {
      setCargando(false);
    }
  }, [admin, agente, email, desde, hasta]);

  useEffect(() => {
    const t = setTimeout(() => { setPagina(1); void cargar(1); }, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const irA = (p: number) => { setPagina(p); void cargar(p); };
  const columnas = admin ? 8 : 7;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{admin ? "Llamadas de los agentes" : "Mis llamadas"}</h1>
        <p className="text-sm text-muted-foreground">A quién se ha llamado y cómo ha ido. Pulsa una fila para ver la ficha de la empresa.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
        <SelectorAgente valor={agente} onCambio={setAgente} />
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
          <Input type="date" className="w-40" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
          <Input type="date" className="w-40" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        {(desde || hasta) && <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setDesde(""); setHasta(""); }}>Limpiar fechas</Button>}
        {datos && <span className="ml-auto inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{total.toLocaleString("es-ES")} llamadas</span>}
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Fecha / hora</TableHead>
              {admin && <TableHead>Agente</TableHead>}
              <TableHead>Empresa</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="whitespace-nowrap">Duración</TableHead>
              <TableHead>Llamada</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && !datos && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: columnas }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {datos && datos.llamadas.length === 0 && (
              <TableRow><TableCell colSpan={columnas} className="py-10 text-center text-muted-foreground">Todavía no hay llamadas registradas.</TableCell></TableRow>
            )}
            {datos?.llamadas.map((l) => (
              <TableRow key={l.id} className={l.contacto_id ? "cursor-pointer hover:bg-muted/40" : ""} onClick={() => l.contacto_id && setFicha(l.contacto_id)}>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{fechaHoraCorta(l.inicio)}</TableCell>
                {admin && <TableCell className="text-sm">{l.agente}</TableCell>}
                <TableCell className="text-sm font-medium">{l.empresa || "—"}{l.contacto && <div className="text-xs font-normal text-muted-foreground">{l.contacto}</div>}</TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{l.telefono || "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-sm"><span className="inline-flex items-center gap-1"><Clock className="size-3.5 text-muted-foreground" />{duracionCorta(l.duracion_seg)}</span></TableCell>
                <TableCell className="text-sm">{ESTADO_LLAMADA[l.estado] || l.estado}</TableCell>
                <TableCell className="text-sm">{l.resultado ? ETIQUETA_RESULTADO[l.resultado] || l.resultado : <span className="text-amber-600 dark:text-amber-400">Sin registrar</span>}</TableCell>
                <TableCell className="max-w-xs text-sm text-muted-foreground"><span className="line-clamp-2">{l.nota || "—"}</span></TableCell>
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
    </div>
  );
}
