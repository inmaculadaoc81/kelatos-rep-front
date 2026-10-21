"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ESTADOS_ENVIO, chipEncaje, chipEstadoEnvio, nombreEstadoEnvio, type EnvioDetalle, type EnvioLista, type LeadMail } from "@/lib/prospeccion";
import { haceCuanto, fechaHora } from "@/lib/crm";
import { useApi } from "../../crm/use-api";

const SELECT = "h-9 rounded-md border bg-background px-2 text-sm";

async function llamar(url: string, metodo: string, cuerpo?: object) {
  const res = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; mensaje?: string };
  if (!res.ok || !d.ok) throw new Error(d.error || "No se pudo completar la acción");
  return d;
}

export default function ProspeccionEnviosPage() {
  const [recarga, setRecarga] = useState(0);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [encaje, setEncaje] = useState("");
  const [abierto, setAbierto] = useState<number | null>(null);
  const [redactando, setRedactando] = useState(false);

  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (estado) params.set("estado", estado);
  if (encaje) params.set("encaje", encaje);
  const { datos, error } = useApi<{ ok: boolean; envios: EnvioLista[] }>(`/api/prospeccion/envios?${params.toString()}`, recarga);
  const recargar = () => setRecarga((n) => n + 1);
  const filas = datos?.envios ?? [];

  async function redactar() {
    setRedactando(true);
    try {
      const d = await llamar("/api/prospeccion/generar", "POST", { cantidad: 3 });
      toast.success(d.mensaje ?? "Redactando…");
      setTimeout(recargar, 90_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setRedactando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Prospección · Mensajes</h1>
          <p className="text-sm text-muted-foreground">Cada correo que la IA ha redactado para una empresa, con su análisis. Ábrelo para revisarlo, editarlo, aprobarlo o descartarlo. {datos ? `${filas.length} resultado${filas.length === 1 ? "" : "s"}.` : ""}</p>
        </div>
        <Button variant="outline" disabled={redactando} onClick={redactar}>{redactando ? "Lanzando…" : "Redactar 3 de prueba"}</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por empresa, correo o asunto…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={SELECT} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ESTADOS_ENVIO.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select className={SELECT} value={encaje} onChange={(e) => setEncaje(e.target.value)} aria-label="Encaje">
          <option value="">Todo encaje</option>
          <option value="alto">Encaje alto</option>
          <option value="medio">Encaje medio</option>
          <option value="bajo">Encaje bajo</option>
        </select>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      {!datos && !error && <Skeleton className="h-48 w-full" />}
      {datos && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Encaje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Buzón</TableHead>
                <TableHead>Cuándo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f) => (
                <TableRow key={f.id} className="cursor-pointer" onClick={() => setAbierto(f.id)}>
                  <TableCell className="font-medium">{f.empresa}{f.sector ? <span className="block text-xs font-normal text-muted-foreground">{f.sector}</span> : null}</TableCell>
                  <TableCell className="text-xs">{f.email}</TableCell>
                  <TableCell className="max-w-64 truncate text-xs">{f.asunto}</TableCell>
                  <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${chipEncaje(f.encaje)}`}>{f.encaje ?? "—"}{f.puntuacion !== null ? ` · ${f.puntuacion}` : ""}</span></TableCell>
                  <TableCell><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${chipEstadoEnvio(f.estado)}`}>{nombreEstadoEnvio(f.estado)}</span></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.buzon_email ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{haceCuanto(f.enviado_en ?? f.generado_en)}</TableCell>
                </TableRow>
              ))}
              {filas.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Todavía no hay mensajes. Configura el agente y pulsa «Redactar 3 de prueba».</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {abierto !== null && <DetalleEnvio id={abierto} onCerrar={() => setAbierto(null)} onCambio={recargar} />}
    </div>
  );
}

function DetalleEnvio({ id, onCerrar, onCambio }: { id: number; onCerrar: () => void; onCambio: () => void }) {
  const [version, setVersion] = useState(0);
  const { datos, error } = useApi<{ ok: boolean; envio: EnvioDetalle; lead: LeadMail | null }>(`/api/prospeccion/envios/${id}`, version);
  const [asunto, setAsunto] = useState<string | null>(null);
  const [cuerpo, setCuerpo] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const e = datos?.envio;
  const editable = e?.estado === "borrador" || e?.estado === "aprobado";
  const asuntoActual = asunto ?? e?.asunto ?? "";
  const cuerpoActual = cuerpo ?? e?.cuerpo ?? "";

  async function accion(texto: string, fn: () => Promise<unknown>) {
    setTrabajando(true);
    try {
      await fn();
      toast.success(texto);
      setAsunto(null);
      setCuerpo(null);
      setVersion((n) => n + 1);
      onCambio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setTrabajando(false);
    }
  }
  const guardarCambios = async () => {
    if (asunto !== null || cuerpo !== null) await llamar(`/api/prospeccion/envios/${id}`, "PATCH", { asunto: asuntoActual, cuerpo: cuerpoActual });
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !trabajando) onCerrar(); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{e?.empresa ?? "Mensaje"}</DialogTitle>
          <DialogDescription>{e ? `${e.email} · ${nombreEstadoEnvio(e.estado)}` : "Cargando…"}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!e && !error && <Skeleton className="h-48 w-full" />}
        {e && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold">Análisis de la IA</h3>
              <p><span className={`rounded-full px-2 py-0.5 text-xs ${chipEncaje(e.analisis?.encaje ?? null)}`}>Encaje {e.analisis?.encaje ?? "—"}{e.puntuacion !== null ? ` · ${e.puntuacion}/100` : ""}</span></p>
              <p className="text-muted-foreground">{e.analisis?.resumen || "Sin resumen."}</p>
              {!!e.analisis?.motivos?.length && <Lista titulo="Por qué encaja" items={e.analisis.motivos} />}
              {!!e.analisis?.riesgos?.length && <Lista titulo="Riesgos" items={e.analisis.riesgos} />}
              {datos?.lead && (
                <div className="rounded-md border bg-muted/30 p-2 text-xs">
                  <p className="font-medium">Datos del lead</p>
                  <p>{[datos.lead.sector, datos.lead.ciudad, datos.lead.pais].filter(Boolean).join(" · ") || "—"}</p>
                  {datos.lead.web && <p>{datos.lead.web}</p>}
                  <p>Estado en la base: {datos.lead.estado}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Redactado {fechaHora(e.generado_en)}{e.modelo ? ` con ${e.modelo}` : ""}{e.ms_ia ? ` en ${Math.round(e.ms_ia / 1000)} s` : ""}.
                {e.enviado_en ? ` Enviado ${fechaHora(e.enviado_en)} desde ${e.buzon_email ?? "—"}.` : ""}
                {e.aprobado_por ? ` Aprobado por ${e.aprobado_por}.` : ""}
              </p>
              {e.error && <p className="rounded-md bg-rose-50 p-2 text-xs text-rose-800">Error: {e.error}</p>}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Correo</h3>
              <Input value={asuntoActual} disabled={!editable} onChange={(ev) => setAsunto(ev.target.value)} aria-label="Asunto" />
              <Textarea rows={14} value={cuerpoActual} disabled={!editable} onChange={(ev) => setCuerpo(ev.target.value)} aria-label="Mensaje" />
            </div>
          </div>
        )}
        {e && (
          <DialogFooter className="flex-wrap gap-2">
            {(e.estado === "borrador" || e.estado === "aprobado" || e.estado === "error") && (
              <Button variant="outline" disabled={trabajando} onClick={() => accion("Descartado", () => llamar(`/api/prospeccion/envios/${id}/omitir`, "POST"))}>Descartar</Button>
            )}
            {editable && (asunto !== null || cuerpo !== null) && (
              <Button variant="outline" disabled={trabajando} onClick={() => accion("Cambios guardados", guardarCambios)}>Guardar cambios</Button>
            )}
            {e.estado === "borrador" && (
              <Button disabled={trabajando} onClick={() => accion("Aprobado: se enviará en su turno", async () => { await guardarCambios(); await llamar(`/api/prospeccion/envios/${id}/aprobar`, "POST"); })}>Aprobar</Button>
            )}
            {e.estado === "aprobado" && (
              <Button disabled={trabajando} onClick={() => accion("Enviado", async () => { await guardarCambios(); await llamar(`/api/prospeccion/envios/${id}/enviar`, "POST"); })}>Enviar ahora</Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Lista({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div>
      <p className="font-medium">{titulo}</p>
      <ul className="list-disc pl-5 text-muted-foreground">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}
