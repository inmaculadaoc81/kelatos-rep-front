"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft2, Edit2, Paperclip2, Send2, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import { Buzon, ESTADOS_LEAD, EstadoLead, LeadDetalle, MensajeDetalle } from "@/lib/mails";
import { CuerpoMensaje, LinksAdjuntos, PastillaEstado, fechaHora, fechaLarga } from "../../componentes-correo";
import { BorradorCorreo, RedactarDialog } from "../../bandeja/redactar-dialog";

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="text-base font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

export default function LeadPage() {
  const { id } = useParams<{ id: string }>();
  const esSuperadmin = useEsSuperadmin();
  const [datos, setDatos] = useState<LeadDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buzones, setBuzones] = useState<Buzon[]>([]);
  const [redactar, setRedactar] = useState<{ abierto: boolean; n: number; borrador: BorradorCorreo }>({
    abierto: false,
    n: 0,
    borrador: { buzonId: null, para: "", cc: "", asunto: "", texto: "", respondeA: null },
  });
  // Edición (solo superadmin)
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState({ estado: "Pendiente" as EstadoLead, paso: "0", grupo_envio: "", notas: "" });
  const [guardando, setGuardando] = useState(false);
  // Mensaje abierto dentro del histórico
  const [abierto, setAbierto] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<MensajeDetalle | null>(null);
  const [cargandoMensaje, setCargandoMensaje] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/mails/leads/${id}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDatos({ lead: data.lead, mensajes: data.mensajes, invalidas: data.invalidas });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    fetch("/api/mails/buzones")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setBuzones(d.buzones as Buzon[]);
      })
      .catch(() => {});
  }, []);

  function empezarEdicion() {
    if (!datos) return;
    setF({ estado: datos.lead.estado, paso: String(datos.lead.paso), grupo_envio: datos.lead.grupo_envio || "", notas: datos.lead.notas || "" });
    setEditando(true);
  }

  async function guardar() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/mails/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: f.estado, paso: Number(f.paso) || 0, grupo_envio: f.grupo_envio, notas: f.notas }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Lead actualizado");
      setEditando(false);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  async function marcarDireccion(email: string, invalida: boolean) {
    try {
      const res = await fetch("/api/mails/direcciones/marcar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, invalida }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(invalida ? "Dirección marcada como inválida: sale de las secuencias" : "Dirección rehabilitada");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function abrirMensaje(mid: number) {
    if (abierto === mid) {
      setAbierto(null);
      return;
    }
    setAbierto(mid);
    setMensaje(null);
    setCargandoMensaje(true);
    try {
      const res = await fetch(`/api/mails/mensajes/${mid}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setMensaje(data.mensaje as MensajeDetalle);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
      setAbierto(null);
    } finally {
      setCargandoMensaje(false);
    }
  }

  if (cargando && !datos) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (error || !datos) {
    return (
      <div className="space-y-3">
        <Link href="/mails/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft2 className="size-4" /> Leads
        </Link>
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error || "Lead no encontrado"}</div>
      </div>
    );
  }

  const { lead, mensajes, invalidas } = datos;
  const extras = Object.entries(lead.datos_extra || {});
  const emailInvalido = invalidas.find((x) => x.email === (lead.email || "").toLowerCase());
  const puedeEscribir = esSuperadmin && !!lead.email && buzones.some((b) => b.activo);

  return (
    <div className="space-y-4">
      <Link href="/mails/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft2 className="size-4" /> Leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            {lead.nombre} <PastillaEstado estado={lead.estado} />
          </h1>
          <p className="text-sm text-muted-foreground">
            {[lead.contacto, lead.ciudad, lead.sector].filter(Boolean).join(" · ") || "Sin más datos"}
            {lead.grupo_envio ? ` · Grupo ${lead.grupo_envio}` : ""}
            {lead.paso ? ` · Paso ${lead.paso}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {puedeEscribir && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setRedactar((r) => ({ abierto: true, n: r.n + 1, borrador: { buzonId: null, para: lead.email || "", cc: "", asunto: "", texto: "", respondeA: null } }))}
            >
              <Send2 className="size-4" /> Escribir correo
            </Button>
          )}
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/mails/bandeja?lead=${lead.id}`} />}>
            Abrir en el Centro de mails
          </Button>
          {esSuperadmin && !editando && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={empezarEdicion}>
              <Edit2 className="size-4" /> Editar
            </Button>
          )}
        </div>
      </div>

      {invalidas.length > 0 && (
        <div className="flex flex-wrap items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <Warning2 className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Correo rebotado: no se le vuelve a escribir en las secuencias</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {invalidas.map((x) => (
                <li key={x.email}>
                  <strong>{x.email}</strong> · {fechaHora(x.detectado_en)}
                  {x.motivo ? ` · ${x.motivo}` : ""}
                  {esSuperadmin && (
                    <button type="button" className="ml-2 underline underline-offset-2" onClick={() => marcarDireccion(x.email, false)}>
                      Rehabilitar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {editando && (
        <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="leEstado">Estado</Label>
            <select id="leEstado" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value as EstadoLead })}>
              {ESTADOS_LEAD.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lePaso">Paso (0-20)</Label>
            <Input id="lePaso" type="number" min={0} max={20} value={f.paso} onChange={(e) => setF({ ...f, paso: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="leGrupo">Grupo / oleada</Label>
            <Input id="leGrupo" value={f.grupo_envio} onChange={(e) => setF({ ...f, grupo_envio: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-4">
            <Label htmlFor="leNotas">Notas</Label>
            <Textarea id="leNotas" rows={3} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button variant="outline" disabled={guardando} onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button disabled={guardando} onClick={guardar}>
              {guardando ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Cifra etiqueta="Correos enviados" valor={lead.enviados} />
        <Cifra etiqueta="Correos recibidos" valor={lead.recibidos} />
        <Cifra etiqueta="Rebotes" valor={lead.rebotes} />
        <Cifra etiqueta="Último envío" valor={<span className="text-sm">{fechaHora(lead.ultimo_envio)}</span>} />
        <Cifra etiqueta="Última respuesta" valor={<span className="text-sm">{fechaHora(lead.ultima_respuesta)}</span>} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Datos</h2>
          <dl className="space-y-2.5">
            <Dato etiqueta="Email">
              {lead.email}
              {lead.emails_extra.length > 0 && <span className="block text-xs text-muted-foreground">{lead.emails_extra.join(", ")}</span>}
              {esSuperadmin && lead.email && !emailInvalido && (
                <button type="button" className="mt-0.5 block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => marcarDireccion(lead.email!, true)}>
                  Marcar como inválido (no escribirle más)
                </button>
              )}
            </Dato>
            <Dato etiqueta="Teléfono">{lead.telefono}</Dato>
            <Dato etiqueta="Web">
              {lead.web && (
                <a href={/^https?:\/\//i.test(lead.web) ? lead.web : `https://${lead.web}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {lead.web}
                </a>
              )}
            </Dato>
            <Dato etiqueta="Ubicación">{[lead.ciudad, lead.provincia, lead.pais].filter(Boolean).join(", ")}</Dato>
            <Dato etiqueta="Sector">{lead.sector}</Dato>
            <Dato etiqueta="Notas">{lead.notas && <span className="whitespace-pre-wrap">{lead.notas}</span>}</Dato>
            <Dato etiqueta="Alta">
              {fechaHora(lead.creado_en)}
              {lead.origen ? ` · ${lead.origen}` : ""}
            </Dato>
            {extras.map(([k, v]) => (
              <Dato key={k} etiqueta={k}>
                {String(v)}
              </Dato>
            ))}
          </dl>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Histórico de correos</h2>
            <p className="text-xs text-muted-foreground">Todo lo que se le envió y lo que respondió, con fecha y buzón. Pulsa un correo para abrirlo.</p>
          </div>
          {mensajes.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Todavía no hay correos con este lead.</p>}
          {mensajes.map((m) => (
            <div key={m.id} className="border-b last:border-b-0">
              <button type="button" onClick={() => abrirMensaje(m.id)} className={`flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/40 ${abierto === m.id ? "bg-muted/50" : ""}`}>
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    m.es_rebote ? "bg-red-500/10 text-red-600" : m.direccion === "salida" ? "bg-blue-500/10 text-blue-600" : "bg-green-500/10 text-green-600"
                  }`}
                >
                  {m.es_rebote ? "Rebote" : m.direccion === "salida" ? "Enviado" : "Respondió"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{m.asunto || "(sin asunto)"}</span>
                    {m.tiene_adjuntos && <Paperclip2 className="size-3.5 shrink-0 text-muted-foreground" />}
                  </span>
                  {m.en_respuesta_a && (
                    <span className="block truncate text-xs text-muted-foreground">
                      En respuesta a «{m.en_respuesta_a.asunto || "(sin asunto)"}» ({fechaHora(m.en_respuesta_a.fecha)})
                    </span>
                  )}
                  <span className="block truncate text-xs text-muted-foreground">{m.resumen}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  {fechaHora(m.fecha)}
                  <span className="block">{m.buzon_email}</span>
                </span>
              </button>
              {abierto === m.id && (
                <div className="border-t bg-background">
                  {cargandoMensaje && <Skeleton className="m-4 h-32" />}
                  {mensaje && mensaje.id === m.id && (
                    <>
                      <div className="space-y-0.5 px-4 pt-3 text-xs text-muted-foreground">
                        <p>De: {mensaje.remitente_nombre ? `${mensaje.remitente_nombre} <${mensaje.remitente}>` : mensaje.remitente}</p>
                        <p>
                          Para: {mensaje.destinatarios || "—"}
                          {mensaje.cc ? ` · CC: ${mensaje.cc}` : ""}
                        </p>
                        <p>{fechaLarga(mensaje.fecha)}</p>
                        <LinksAdjuntos adjuntos={mensaje.adjuntos} />
                      </div>
                      <CuerpoMensaje m={mensaje} altura="h-[45vh]" />
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {esSuperadmin && (
        <RedactarDialog
          key={redactar.n}
          buzones={buzones}
          borrador={redactar.borrador}
          open={redactar.abierto}
          onOpenChange={(o) => setRedactar((r) => ({ ...r, abierto: o }))}
          onEnviado={cargar}
        />
      )}
    </div>
  );
}
