"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Mail, MessageCircle, Phone, StickyNote, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIAS, ETAPAS, ORIGENES, TIPOS_ACTIVIDAD, chipCategoria, fechaHora, nombreCategoria, type Actividad, type Categoria, type Etapa, type Lead, type Origen, type TipoActividad } from "@/lib/crm";
import { useApi } from "./use-api";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";

const ICONO: Record<TipoActividad, typeof Phone> = {
  llamada: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  nota: StickyNote,
  cambio_etapa: ArrowRightLeft,
  alta: UserPlus,
};
const COLOR_ICONO: Record<TipoActividad, string> = {
  llamada: "bg-violet-100 text-violet-700",
  whatsapp: "bg-emerald-100 text-emerald-700",
  email: "bg-sky-100 text-sky-700",
  nota: "bg-amber-100 text-amber-700",
  cambio_etapa: "bg-zinc-100 text-zinc-600",
  alta: "bg-rose-100 text-rose-700",
};

/** Ficha en ventana (desde la Tabla). */
export function FichaLeadDialog({ id, onCerrar, onCambio }: { id: number; onCerrar: () => void; onCambio: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Ficha del lead</DialogTitle>
          <DialogDescription>Datos del contacto y todo lo que ha pasado con él.</DialogDescription>
        </DialogHeader>
        <FichaLead id={id} onCambio={onCambio} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Ficha de un lead: cabecera con la etapa (se cambia con un clic), la conversación y la línea de tiempo a la izquierda, y los
 * datos editables a la derecha. Se usa dentro de una ventana (Tabla) o como panel fijo (Leads). Se actualiza sola cada 30 s.
 */
export function FichaLead({ id, onCambio }: { id: number; onCambio: () => void }) {
  const [recarga, setRecarga] = useState(0);
  const { datos, error } = useApi<{ ok: boolean; lead: Lead; actividades: Actividad[] }>(`/api/crm/leads/${id}`, recarga);

  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") setRecarga((n) => n + 1); }, 30_000);
    return () => clearInterval(t);
  }, []);

  const refrescar = () => { setRecarga((n) => n + 1); onCambio(); };

  if (error) return <p className="p-4 text-sm text-destructive">{error}</p>;
  if (!datos) return <Skeleton className="h-64 w-full" />;
  const { lead, actividades } = datos;

  return (
    // @container: el reparto en dos columnas depende del ancho del PROPIO panel (no de la pantalla), así también cabe en el lateral.
    <div className="@container space-y-4">
      <CabeceraLead lead={lead} onCambio={refrescar} />
      <div className="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_21rem]">
        <LineaTiempo leadId={lead.id} actividades={actividades} onNueva={refrescar} />
        <FormularioLead key={`${lead.id}-${lead.actualizado_en}`} lead={lead} onGuardado={refrescar} />
      </div>
    </div>
  );
}

function CabeceraLead({ lead, onCambio }: { lead: Lead; onCambio: () => void }) {
  const [moviendo, setMoviendo] = useState(false);

  async function cambiarEtapa(etapa: Etapa) {
    if (etapa === lead.etapa || moviendo) return;
    setMoviendo(true);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ etapa }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar la etapa");
    } finally {
      setMoviendo(false);
    }
  }

  return (
    <div className="space-y-3 border-b pb-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold leading-tight">{lead.nombre}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {lead.telefono ?? "Sin teléfono"}{lead.email ? ` · ${lead.email}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {lead.bandeja_nombre && <span className={`rounded-full px-2 py-0.5 font-medium ${lead.origen === "llamada" ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"}`} title={lead.numero_destino ?? undefined}>{lead.origen === "llamada" ? "Llamó a" : "Escribió a"}: {lead.bandeja_nombre}{lead.numero_destino ? ` · ${lead.numero_destino}` : ""}</span>}
          <span className={`rounded-full px-2 py-0.5 font-medium ${chipCategoria(lead.categoria)}`}>{nombreCategoria(lead.categoria)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Etapa">
        {ETAPAS.map((e) => (
          <button
            key={e.id}
            type="button"
            disabled={moviendo}
            onClick={() => cambiarEtapa(e.id)}
            title={e.descripcion}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${lead.etapa === e.id ? `${e.chip} border-transparent ring-2 ring-offset-1 ring-current` : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <span className={`size-2 rounded-full ${e.punto}`} />{e.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

function FormularioLead({ lead, onGuardado }: { lead: Lead; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(lead.nombre);
  const [telefono, setTelefono] = useState(lead.telefono ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [origen, setOrigen] = useState<Origen>(lead.origen);
  const etapa: Etapa = lead.etapa;
  const [responsable, setResponsable] = useState(lead.responsable ?? "");
  const [valor, setValor] = useState(lead.valor_estimado === null ? "" : String(lead.valor_estimado));
  const [accion, setAccion] = useState(lead.proxima_accion ?? "");
  const [fecha, setFecha] = useState(lead.proxima_accion_fecha ?? "");
  const [notas, setNotas] = useState(lead.notas ?? "");
  const [motivo, setMotivo] = useState(lead.motivo_perdida ?? "");
  const [categoria, setCategoria] = useState<Categoria | "">(lead.categoria ?? "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim()) { toast.error("El nombre no puede quedar vacío"); return; }
    setGuardando(true);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono, email, origen, responsable, valor_estimado: valor, proxima_accion: accion, proxima_accion_fecha: fecha, notas, categoria, motivo_perdida: etapa === "perdido" ? motivo : "" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Lead actualizado");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-semibold">Datos del lead</p>
      {etapa === "perdido" && (
        <div className="space-y-1.5">
          <Label htmlFor="flMotivo">Motivo (opcional)</Label>
          <Input id="flMotivo" value={motivo} maxLength={300} placeholder="Precio, plazo, ya no lo necesita…" onChange={(e) => setMotivo(e.target.value)} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="flNombre">Nombre</Label>
        <Input id="flNombre" value={nombre} maxLength={160} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="flTel">Teléfono</Label>
          <Input id="flTel" value={telefono} maxLength={40} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="flMail">Correo</Label>
          <Input id="flMail" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="flOrigen">Cómo contactó</Label>
          <select id="flOrigen" className={SELECT} value={origen} onChange={(e) => setOrigen(e.target.value as Origen)}>
            {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="flValor">Valor estimado (€)</Label>
          <Input id="flValor" type="number" min={0} value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="flCat">Clasificación (de qué consulta)</Label>
        <select id="flCat" className={SELECT} value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria | "")}>
          <option value="">Sin clasificar</option>
          {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="flResp">Responsable</Label>
        <Input id="flResp" value={responsable} maxLength={254} placeholder="correo de quien lo lleva" onChange={(e) => setResponsable(e.target.value)} />
      </div>
      <div className="grid grid-cols-[1fr_9.5rem] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="flAccion">Próxima acción</Label>
          <Input id="flAccion" value={accion} maxLength={200} onChange={(e) => setAccion(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="flFecha">Para el día</Label>
          <Input id="flFecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="flNotas">Notas</Label>
        <Textarea id="flNotas" rows={3} maxLength={5000} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </div>
      <Button className="w-full" disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar cambios"}</Button>
    </div>
  );
}

/** «[15:17] Bot: hola» → burbujas. Devuelve null si la actividad no tiene ese formato (llamadas, notas…). */
function lineasChat(detalle: string | null) {
  if (!detalle) return null;
  const salida: { hora: string; quien: string; texto: string }[] = [];
  for (const l of detalle.split("\n")) {
    const m = /^\[(\d\d:\d\d)\] (Cliente|Bot|Agente|Sistema): ([\s\S]*)$/.exec(l);
    if (m) salida.push({ hora: m[1], quien: m[2], texto: m[3] });
    else if (salida.length) salida[salida.length - 1].texto += `\n${l}`;
    else return null;
  }
  return salida.length ? salida : null;
}

const MOTIVO_FIN: Record<string, string> = {
  user_hangup: "Colgó el cliente", agent_hangup: "Colgó el agente", call_transfer: "Transferida a una persona", inactivity: "Cortada por inactividad",
  dial_no_answer: "Sin respuesta", voicemail_reached: "Buzón de voz", credit_exhausted: "Sin créditos en Retell: la llamada no se pudo atender",
  error_no_audio_received: "Error: no llegó audio", max_duration_reached: "Duración máxima alcanzada",
};

/** Llamada de Retell: resumen y datos arriba, y la transcripción («Agent:» / «User:») como conversación. */
function partesLlamada(detalle: string | null) {
  if (!detalle || !/(Resumen:|Fin:|Transcripción:)/.test(detalle)) return null;
  const [cabeza, ...resto] = detalle.split(/\n?Transcripción:\n/);
  const meta = cabeza.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = /^Fin: (\S+)$/.exec(l);
    return m ? `Final: ${MOTIVO_FIN[m[1]] ?? m[1]}` : l;
  });
  const dialogo: { quien: string; texto: string }[] = [];
  for (const l of resto.join("\n").split("\n")) {
    const m = /^(Agent|User):\s?([\s\S]*)$/.exec(l);
    if (m) dialogo.push({ quien: m[1] === "Agent" ? "Bot" : "Cliente", texto: m[2] });
    else if (dialogo.length && l.trim()) dialogo[dialogo.length - 1].texto += `\n${l}`;
  }
  return { meta, dialogo };
}


const BURBUJA: Record<string, string> = {
  Cliente: "mr-auto bg-muted",
  Bot: "ml-auto bg-violet-100 text-violet-950",
  Agente: "ml-auto bg-emerald-100 text-emerald-950",
  Sistema: "mx-auto bg-zinc-100 text-zinc-600",
};

function LineaTiempo({ leadId, actividades, onNueva }: { leadId: number; actividades: Actividad[]; onNueva: () => void }) {
  // La llamada más reciente con transcripción se muestra abierta; las anteriores, plegadas.
  const primeraLlamadaId = actividades.find((x) => x.tipo === "llamada" && x.detalle?.includes("Transcripción:"))?.id;
  const [tipo, setTipo] = useState<TipoActividad>("nota");
  const [direccion, setDireccion] = useState<"entrante" | "saliente">("saliente");
  const [resumen, setResumen] = useState("");
  const [detalle, setDetalle] = useState("");
  const [minutos, setMinutos] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function anotar() {
    if (!resumen.trim()) { toast.error("Escribe un resumen corto"); return; }
    setGuardando(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/actividades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          direccion: tipo === "nota" ? null : direccion,
          resumen,
          detalle,
          duracion_seg: tipo === "llamada" && minutos.trim() ? Math.round(Number(minutos) * 60) : null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Anotado");
      setResumen("");
      setDetalle("");
      setMinutos("");
      onNueva();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">Anotar una actividad</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[10rem_10rem_1fr]">
          <select className={SELECT} value={tipo} onChange={(e) => setTipo(e.target.value as TipoActividad)} aria-label="Tipo">
            {TIPOS_ACTIVIDAD.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          {tipo !== "nota" ? (
            <select className={SELECT} value={direccion} onChange={(e) => setDireccion(e.target.value as "entrante" | "saliente")} aria-label="Dirección">
              <option value="saliente">Yo contacté</option>
              <option value="entrante">Me contactó</option>
            </select>
          ) : <span className="hidden sm:block" />}
          <Input className="col-span-2 sm:col-span-1" value={resumen} maxLength={500} placeholder="Resumen: qué se habló o qué se decidió" onChange={(e) => setResumen(e.target.value)} />
        </div>
        <Textarea rows={2} maxLength={5000} value={detalle} placeholder="Detalle (opcional)" onChange={(e) => setDetalle(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          {tipo === "llamada" && <Input className="w-56" type="number" min={0} value={minutos} placeholder="Duración en minutos (opcional)" onChange={(e) => setMinutos(e.target.value)} />}
          <Button size="sm" disabled={guardando} onClick={anotar}>{guardando ? "Anotando…" : "Anotar"}</Button>
          <p className="text-[11px] text-muted-foreground">Si el lead está en «Nuevo» y anotas un contacto tuyo, pasa solo a «Contactado».</p>
        </div>
      </div>

      <ul className="space-y-4">
        {actividades.map((a) => {
          const Icono = ICONO[a.tipo] ?? StickyNote;
          const chat = a.tipo === "whatsapp" ? lineasChat(a.detalle) : null;
          const llamada = a.tipo === "llamada" ? partesLlamada(a.detalle) : null;
          return (
            <li key={a.id} className="flex gap-3">
              <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${COLOR_ICONO[a.tipo] ?? ""}`}><Icono className="size-3.5" /></span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">
                  {a.resumen}
                  {a.direccion && !chat && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({a.direccion})</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {fechaHora(a.creado_en)}{a.duracion_seg ? ` · ${Math.max(1, Math.round(a.duracion_seg / 60))} min` : ""}{a.usuario ? ` · ${a.usuario}` : ""}
                </p>
                {llamada ? (
                  <div className="mt-2 space-y-2">
                    {llamada.meta.length > 0 && (
                      <ul className={`space-y-0.5 rounded-lg border p-2 text-xs ${llamada.meta.some((m) => m.includes("Sin créditos")) ? "border-amber-300 bg-amber-50 text-amber-900" : "bg-muted/40 text-muted-foreground"}`}>
                        {llamada.meta.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    )}
                    {llamada.dialogo.length > 0 ? (
                      <details className="rounded-lg border bg-card p-2" open={a.id === primeraLlamadaId}>
                        <summary className="cursor-pointer text-xs font-medium">Conversación ({llamada.dialogo.length} mensajes)</summary>
                        <div className="mt-2 space-y-1.5">
                          {llamada.dialogo.map((c, i) => (
                            <div key={i} className={`w-fit max-w-[85%] rounded-xl px-3 py-1.5 text-[13px] ${BURBUJA[c.quien] ?? BURBUJA.Cliente}`}>
                              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide opacity-60">{c.quien}</span>
                              <span className="whitespace-pre-line break-words">{c.texto}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sin transcripción: no hubo conversación.</p>
                    )}
                  </div>
                ) : chat ? (
                  <div className="mt-2 space-y-1.5 rounded-lg border bg-card p-2">
                    {chat.map((c, i) => (
                      <div key={i} className={`w-fit max-w-[85%] rounded-xl px-3 py-1.5 text-[13px] ${BURBUJA[c.quien] ?? BURBUJA.Cliente}`}>
                        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide opacity-60">{c.quien} · {c.hora}</span>
                        <span className="whitespace-pre-line break-words">{c.texto}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  a.detalle && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{a.detalle}</p>
                )}
              </div>
            </li>
          );
        })}
        {actividades.length === 0 && <li className="text-sm text-muted-foreground">Todavía no hay actividad.</li>}
      </ul>
    </div>
  );
}
