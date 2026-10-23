"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaHora, haceCuanto, nombreOrigen } from "@/lib/crm";
import { ESTADOS_SEGUIMIENTO, llamarCorreos, type EstadoSeguimiento, type FilaSeguimiento } from "@/lib/crm-correos";
import { useApi } from "../use-api";

const POR_PAGINA = 100;
const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** La «tabla grande»: cada contacto con su estado de envío (sin enviar, enviado, respondió, rebotó…), el último tipo de correo y cuándo. */
export function TabSeguimiento() {
  const [recarga, setRecarga] = useState(0);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<"" | EstadoSeguimiento>("");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [revisando, setRevisando] = useState(false);
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (estado) params.set("estado", estado);
  const { datos, error } = useApi<{ ok: boolean; conteos: { estado: EstadoSeguimiento; n: number }[]; filas: FilaSeguimiento[] }>(`/api/crm/correos/seguimiento?${params.toString()}`, recarga);
  const filas = datos?.filas ?? [];
  const n = (e: EstadoSeguimiento) => datos?.conteos.find((c) => c.estado === e)?.n ?? 0;
  const total = datos?.conteos.reduce((s, c) => s + c.n, 0) ?? 0;

  async function revisar() {
    setRevisando(true);
    try {
      const d = await llamarCorreos("respuestas/revisar", "POST", {});
      toast.success(`Revisado: ${d.respondidos ?? 0} respuesta(s) nueva(s) y ${d.rebotados ?? 0} rebote(s)`);
      setRecarga((x) => x + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setRevisando(false);
    }
  }

  function exportar() {
    const cab = ["Correo", "Nombre", "Tipo", "Canal", "Estado", "Último tipo de correo", "Campaña", "Paso", "Enviados", "Último envío", "Respondió"];
    const cuerpo = filas.map((f) => [f.email, f.nombre, f.tipo === "cliente" ? "Cliente" : "Lead", f.canal ? nombreOrigen(f.canal) : "", ESTADOS_SEGUIMIENTO.find((e) => e.id === f.estado)?.nombre, f.tipo_nombre, f.campana, f.paso, f.enviados, f.enviado_en ? fechaHora(f.enviado_en) : "", f.respondido_en ? fechaHora(f.respondido_en) : ""]);
    const csv = "﻿" + [cab, ...cuerpo].map((r) => r.map(celda).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `seguimiento-correos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-3 pt-2">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Todos los contactos con su estado de envío: a quién se le ha enviado, qué tipo de correo, cuándo, y si ha respondido o ha rebotado. Hoy no hay envíos, así que todos salen «Sin enviar»; se irá llenando solo cuando empiecen.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Chip activa={estado === ""} onClick={() => { setEstado(""); setLimite(POR_PAGINA); }} texto="Todos" n={total} />
        {ESTADOS_SEGUIMIENTO.map((e) => <Chip key={e.id} activa={estado === e.id} onClick={() => { setEstado(e.id); setLimite(POR_PAGINA); }} texto={e.nombre} n={n(e.id)} />)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por correo o nombre…" value={q} onChange={(e) => { setQ(e.target.value); setLimite(POR_PAGINA); }} />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="gap-1.5" disabled={revisando} onClick={revisar} title="Mira el buzón de Soporte y marca como «Respondió» a quien haya contestado, y como «Rebotó» a quien haya devuelto el correo"><RefreshCw className={`size-4 ${revisando ? "animate-spin" : ""}`} /> Revisar respuestas</Button>
          <Button variant="outline" className="gap-1.5" disabled={filas.length === 0} onClick={exportar}><Download className="size-4" /> Exportar</Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">No se pudo cargar: {error}</p>}
      {!datos && !error && <Skeleton className="h-48 w-full" />}
      {datos && (
        <div className="rounded-lg border bg-card">
          <p className="border-b px-3 py-2 text-xs text-muted-foreground">{filas.length} contacto{filas.length === 1 ? "" : "s"}{filas.length === 1000 ? " (se muestran los primeros 1.000; afina con los filtros)" : ""}</p>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Contacto</TableHead><TableHead>Canal</TableHead><TableHead>Estado</TableHead><TableHead>Último correo</TableHead><TableHead>Campaña</TableHead><TableHead className="text-right">Enviados</TableHead><TableHead>Respuesta</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filas.slice(0, limite).map((f) => {
                const est = ESTADOS_SEGUIMIENTO.find((e) => e.id === f.estado);
                return (
                  <TableRow key={f.email}>
                    <TableCell className="font-medium">{f.nombre || f.email}{f.nombre ? <span className="block text-xs font-normal text-muted-foreground">{f.email}</span> : null}</TableCell>
                    <TableCell className="text-xs">{f.tipo === "cliente" ? "Cliente" : f.canal ? nombreOrigen(f.canal) : "—"}</TableCell>
                    <TableCell><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${est?.chip ?? ""}`}>{est?.nombre ?? f.estado}</span></TableCell>
                    <TableCell className="text-xs">{f.tipo_nombre ? <>{f.tipo_nombre}{f.paso ? ` · paso ${f.paso}` : ""}<span className="block text-muted-foreground">{f.enviado_en ? haceCuanto(f.enviado_en) : ""}</span></> : "—"}</TableCell>
                    <TableCell className="text-xs">{f.campana ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs">{f.enviados}</TableCell>
                    <TableCell className="text-xs">{f.respondido_en ? fechaHora(f.respondido_en) : "—"}</TableCell>
                  </TableRow>
                );
              })}
              {filas.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No hay contactos con estos filtros.</TableCell></TableRow>}
            </TableBody>
          </Table>
          {filas.length > limite && <div className="border-t p-3 text-center"><Button variant="outline" size="sm" onClick={() => setLimite((x) => x + POR_PAGINA)}>Mostrar {Math.min(POR_PAGINA, filas.length - limite)} más ({filas.length - limite} restantes)</Button></div>}
        </div>
      )}
    </div>
  );
}

function Chip({ activa, onClick, texto, n }: { activa: boolean; onClick: () => void; texto: string; n: number }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${activa ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
      {texto}<span className={activa ? "opacity-80" : "text-muted-foreground/70"}>{n}</span>
    </button>
  );
}
