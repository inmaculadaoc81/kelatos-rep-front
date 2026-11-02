"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Segmento } from "@/lib/prospeccion";
import { haceCuanto, fechaHora } from "@/lib/crm";
import { useApi } from "@/app/crm/use-api";

type Respuesta = {
  envio_id: number; lead_id: number; empresa: string | null; email: string; asunto_enviado: string; enviado_en: string; estado_lead: string;
  mensaje_id: number; respondio_en: string; asunto_respuesta: string; texto: string; leido: boolean; automatica: boolean; respuestas: number;
};
type DatosRespuestas = { ok: boolean; respuestas: Respuesta[]; totales: { enviados: number; respondieron: number; reales: number; automaticas: number } };
type Mensaje = { id: number; fecha: string; remitente: string; remitente_nombre: string | null; asunto: string; vista: string; leido: boolean; es_rebote: boolean; automatica: boolean; lead_id: number | null };
type DatosBandeja = {
  ok: boolean; buzon: { id: number; nombre: string; email: string; ultima_sincronizacion: string | null; ultimo_error: string | null } | null;
  mensajes: Mensaje[]; totales: { total: number; sin_leer: number; rebotes: number };
};

/** Primera parte útil de la respuesta: sin saltos ni texto citado. */
function resumen(texto: string) {
  const propio = String(texto || "").replace(/\r/g, "").split(/\n\s*(?:El .{5,80} escribi[oó]:|On .{5,80} wrote:|De: |From: |-{2,}\s*Original|>)/)[0];
  const t = propio.replace(/\s+/g, " ").trim();
  return t.length > 160 ? `${t.slice(0, 157)}…` : t || "(sin texto)";
}

const abrirEnMails = (email: string) => `/mails/bandeja?email=${encodeURIComponent(email)}`;

/** Respuestas de una parte de Prospección: tabla de quién respondió y la bandeja de entrada del buzón con el que envía. */
export function RespuestasVista({ segmento }: { segmento: Segmento }) {
  const [pestana, setPestana] = useState<"respondieron" | "bandeja">("respondieron");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("");
  const resp = useApi<DatosRespuestas>(`/api/prospeccion/respuestas?segmento=${segmento}`, 0);
  const band = useApi<DatosBandeja>(`/api/prospeccion/bandeja?segmento=${segmento}`, 0);
  const titulo = segmento === "clientes" ? "Clientes" : "Empresas";
  const t = resp.datos?.totales;
  const tasa = t && t.enviados > 0 ? Math.round((t.reales / t.enviados) * 1000) / 10 : 0;

  const filas = (resp.datos?.respuestas ?? []).filter((f) => {
    if (filtro === "reales" && f.automatica) return false;
    if (filtro === "automaticas" && !f.automatica) return false;
    const buscado = q.trim().toLowerCase();
    return !buscado || `${f.empresa ?? ""} ${f.email} ${f.texto}`.toLowerCase().includes(buscado);
  });
  const mensajes = (band.datos?.mensajes ?? []).filter((m) => {
    const buscado = q.trim().toLowerCase();
    return !buscado || `${m.remitente} ${m.remitente_nombre ?? ""} ${m.asunto} ${m.vista}`.toLowerCase().includes(buscado);
  });

  const tarjetas: [string, string | number][] = t
    ? [["Correos enviados", t.enviados], ["Han respondido", t.reales], ["Respuesta automática", t.automaticas], ["% que responde", `${tasa} %`]]
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{titulo} · Respuestas</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Quién ha contestado a los correos de esta parte y la bandeja de entrada del buzón con el que se envía. Para contestar a alguien, ábrelo en el Centro de mails.
        </p>
      </div>

      {resp.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {resp.error}</div>}
      {t && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tarjetas.map(([nombre, valor]) => (
            <div key={nombre} className="rounded-lg border bg-card p-3"><p className="text-2xl font-semibold">{valor}</p><p className="text-xs text-muted-foreground">{nombre}</p></div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border p-0.5 text-sm">
          {([["respondieron", `Quién respondió${t ? ` (${t.respondieron})` : ""}`], ["bandeja", `Bandeja de entrada${band.datos?.totales ? ` (${band.datos.totales.total})` : ""}`]] as const).map(([id, texto]) => (
            <button key={id} type="button" onClick={() => setPestana(id)} className={`rounded px-3 py-1.5 ${pestana === id ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>{texto}</button>
          ))}
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, correo o texto" className="pl-8" />
        </div>
        {pestana === "respondieron" && (
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Tipo de respuesta">
            <option value="">Todas las respuestas</option>
            <option value="reales">Respuestas de una persona</option>
            <option value="automaticas">Respuestas automáticas</option>
          </select>
        )}
      </div>

      {pestana === "respondieron" && (
        resp.cargando && !resp.datos ? <Skeleton className="h-40 w-full" /> : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quién</TableHead>
                  <TableHead>Respuesta</TableHead>
                  <TableHead>Qué dijo</TableHead>
                  <TableHead>Enviado</TableHead>
                  <TableHead>Respondió</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {t && t.enviados === 0 ? "Todavía no se ha enviado ningún correo real, así que nadie ha podido responder." : "Nadie ha respondido todavía."}
                  </TableCell></TableRow>
                )}
                {filas.map((f) => (
                  <TableRow key={f.envio_id}>
                    <TableCell><p className="font-medium">{f.empresa || f.email}</p><p className="text-xs text-muted-foreground">{f.email}</p></TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${f.automatica ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-800"}`}>{f.automatica ? "Automática" : "De una persona"}</span>
                      {f.respuestas > 1 && <p className="mt-1 text-xs text-muted-foreground">{f.respuestas} mensajes</p>}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal text-sm text-muted-foreground">{resumen(f.texto)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{fechaHora(f.enviado_en)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs" title={fechaHora(f.respondio_en)}>{haceCuanto(f.respondio_en)}{!f.leido && <span className="ml-1 rounded-full bg-sky-100 px-1.5 text-sky-800">nuevo</span>}</TableCell>
                    <TableCell><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{f.estado_lead}</span></TableCell>
                    <TableCell><Link href={abrirEnMails(f.email)} className="text-sm text-primary underline-offset-2 hover:underline">Abrir y contestar</Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}

      {pestana === "bandeja" && (
        band.cargando && !band.datos ? <Skeleton className="h-40 w-full" /> : !band.datos?.buzon ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta parte todavía no tiene buzón de envío. Elígelo en <Link className="underline" href={`/prospeccion/${segmento}/agente`}>Agente</Link>; cuando lo tenga, su bandeja aparecerá aquí.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Buzón <strong className="text-foreground">{band.datos.buzon.email}</strong> · {band.datos.totales.sin_leer} sin leer · {band.datos.totales.rebotes} rebotes
              {band.datos.buzon.ultima_sincronizacion ? ` · sincronizado ${haceCuanto(band.datos.buzon.ultima_sincronizacion)}` : ""}
              {band.datos.buzon.ultimo_error ? <span className="ml-1 text-destructive"> · error: {band.datos.buzon.ultimo_error}</span> : null}
            </p>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>De</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Vista previa</TableHead>
                    <TableHead>Recibido</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensajes.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No hay mensajes en esta bandeja.</TableCell></TableRow>}
                  {mensajes.map((m) => (
                    <TableRow key={m.id} className={m.leido ? "" : "font-medium"}>
                      <TableCell><p>{m.remitente_nombre || m.remitente}</p>{m.remitente_nombre && <p className="text-xs font-normal text-muted-foreground">{m.remitente}</p>}</TableCell>
                      <TableCell className="max-w-xs whitespace-normal">
                        {m.asunto}
                        <span className="ml-1.5 inline-flex gap-1 align-middle">
                          {m.es_rebote && <span className="rounded-full bg-rose-100 px-1.5 text-xs font-normal text-rose-800">Rebote</span>}
                          {m.automatica && !m.es_rebote && <span className="rounded-full bg-muted px-1.5 text-xs font-normal">Automático</span>}
                          {m.lead_id && <span className="rounded-full bg-emerald-100 px-1.5 text-xs font-normal text-emerald-800">Contacto de prospección</span>}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md whitespace-normal text-sm font-normal text-muted-foreground">{resumen(m.vista)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs font-normal" title={fechaHora(m.fecha)}>{haceCuanto(m.fecha)}</TableCell>
                      <TableCell><Link href={abrirEnMails(m.remitente)} className="text-sm font-normal text-primary underline-offset-2 hover:underline">Abrir</Link></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
