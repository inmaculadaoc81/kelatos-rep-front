"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Mail, MessageCircle, Phone, StickyNote, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIAS, ETAPAS, ORIGENES, TIPOS_ACTIVIDAD, fechaHora, type Actividad, type Categoria, type Etapa, type Lead, type Origen, type TipoActividad } from "@/lib/crm";
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

/** Ficha de un lead: datos editables a la izquierda y línea de tiempo (llamadas, WhatsApp, notas…) a la derecha. */
export function FichaLeadDialog({ id, onCerrar, onCambio }: { id: number; onCerrar: () => void; onCambio: () => void }) {
  const [recarga, setRecarga] = useState(0);
  const { datos, error } = useApi<{ ok: boolean; lead: Lead; actividades: Actividad[] }>(`/api/crm/leads/${id}`, recarga);

  const refrescar = () => { setRecarga((n) => n + 1); onCambio(); };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{datos ? datos.lead.nombre : "Ficha del lead"}</DialogTitle>
          <DialogDescription>Datos del contacto y todo lo que ha pasado con él, de más reciente a más antiguo.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!datos && !error && <Skeleton className="h-64 w-full" />}
        {datos && (
          <div className="grid gap-6 md:grid-cols-2">
            <FormularioLead key={`${datos.lead.id}-${datos.lead.actualizado_en}`} lead={datos.lead} onGuardado={refrescar} />
            <LineaTiempo leadId={datos.lead.id} actividades={datos.actividades} onNueva={refrescar} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormularioLead({ lead, onGuardado }: { lead: Lead; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(lead.nombre);
  const [telefono, setTelefono] = useState(lead.telefono ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [origen, setOrigen] = useState<Origen>(lead.origen);
  const [etapa, setEtapa] = useState<Etapa>(lead.etapa);
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
        body: JSON.stringify({ nombre, telefono, email, origen, etapa, responsable, valor_estimado: valor, proxima_accion: accion, proxima_accion_fecha: fecha, notas, categoria, motivo_perdida: etapa === "perdido" ? motivo : "" }),
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
    <div className="space-y-3">
      {lead.bandeja_nombre && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Escribió a: <strong>{lead.bandeja_nombre}</strong>{lead.numero_destino ? ` · ${lead.numero_destino}` : ""}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="flEtapa">Etapa</Label>
        <select id="flEtapa" className={SELECT} value={etapa} onChange={(e) => setEtapa(e.target.value as Etapa)}>
          {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>
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

function LineaTiempo({ leadId, actividades, onNueva }: { leadId: number; actividades: Actividad[]; onNueva: () => void }) {
  const [tipo, setTipo] = useState<TipoActividad>("llamada");
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
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">Anotar una actividad</p>
        <div className="grid grid-cols-2 gap-2">
          <select className={SELECT} value={tipo} onChange={(e) => setTipo(e.target.value as TipoActividad)} aria-label="Tipo">
            {TIPOS_ACTIVIDAD.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          {tipo !== "nota" ? (
            <select className={SELECT} value={direccion} onChange={(e) => setDireccion(e.target.value as "entrante" | "saliente")} aria-label="Dirección">
              <option value="saliente">Yo contacté</option>
              <option value="entrante">Me contactó</option>
            </select>
          ) : <span />}
        </div>
        <Input value={resumen} maxLength={500} placeholder="Resumen: qué se habló o qué se decidió" onChange={(e) => setResumen(e.target.value)} />
        <Textarea rows={2} maxLength={5000} value={detalle} placeholder="Detalle (opcional)" onChange={(e) => setDetalle(e.target.value)} />
        {tipo === "llamada" && <Input type="number" min={0} value={minutos} placeholder="Duración en minutos (opcional)" onChange={(e) => setMinutos(e.target.value)} />}
        <Button size="sm" disabled={guardando} onClick={anotar}>{guardando ? "Anotando…" : "Anotar"}</Button>
        <p className="text-[11px] text-muted-foreground">Si el lead está en «Nuevo» y anotas un contacto tuyo, pasa solo a «Contactado».</p>
      </div>

      <ul className="space-y-3">
        {actividades.map((a) => {
          const Icono = ICONO[a.tipo] ?? StickyNote;
          return (
            <li key={a.id} className="flex gap-3">
              <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${COLOR_ICONO[a.tipo] ?? ""}`}><Icono className="size-3.5" /></span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">
                  {a.resumen}
                  {a.direccion && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({a.direccion === "entrante" ? "entrante" : "saliente"})</span>}
                </p>
                {a.detalle && <p className="whitespace-pre-line text-xs text-muted-foreground">{a.detalle}</p>}
                <p className="text-[11px] text-muted-foreground">
                  {fechaHora(a.creado_en)}{a.duracion_seg ? ` · ${Math.max(1, Math.round(a.duracion_seg / 60))} min` : ""}{a.usuario ? ` · ${a.usuario}` : ""}{a.canal_externo ? ` · ${a.canal_externo}` : ""}
                </p>
              </div>
            </li>
          );
        })}
        {actividades.length === 0 && <li className="text-sm text-muted-foreground">Todavía no hay actividad.</li>}
      </ul>
    </div>
  );
}
