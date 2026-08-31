"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { colorAvatar, iniciales } from "@/lib/registro-acciones-estilo";
import { TipoFichajePill } from "../../pills";
import { Edit2 } from "@/lib/icons";

interface FichajeDetalle {
  id: number;
  employee_id: number;
  empleado_nombre: string;
  check_in: string;
  check_out: string | null;
  tipo_fichaje: string;
  firma_empleado: string | null;
  firmado: boolean;
  ip_registro: string | null;
  observaciones: string | null;
  creado_en: string | null;
}

interface AuditoriaEvento {
  id: number;
  fecha: string;
  usuario: string | null;
  campo: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
}

const TIPOS_FICHAJE = [
  { valor: "entrada", label: "Entrada" },
  { valor: "salida_comida", label: "Salida comida" },
  { valor: "vuelta_comida", label: "Vuelta comida" },
  { valor: "salida", label: "Salida" },
  { valor: "ausencia", label: "Ausencia" },
  { valor: "regreso_ausencia", label: "Regreso ausencia" },
];

function fechaHoraLarga(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function isoAInputLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function horasHHMM(desde: string | null, hasta: string | null): string {
  if (!desde || !hasta) return "00:00";
  const ms = new Date(hasta).getTime() - new Date(desde).getTime();
  if (ms <= 0) return "00:00";
  const totalMin = Math.round(ms / 60000);
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

function horasDecimal(desde: string | null, hasta: string | null): string {
  if (!desde || !hasta) return "0,00";
  const ms = new Date(hasta).getTime() - new Date(desde).getTime();
  const h = ms > 0 ? ms / 3600000 : 0;
  return h.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fechaDia(iso: string): string {
  const d = new Date(iso);
  const s = d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function tiempoRelativo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `hace ${diffD} día${diffD !== 1 ? "s" : ""}`;
  const diffMes = Math.round(diffD / 30);
  return `hace ${diffMes} mes${diffMes !== 1 ? "es" : ""}`;
}

const ETIQUETA_CAMPO: Record<string, string> = {
  "Check In": "Entrada",
  "Check Out": "Salida",
  "Tipo de Fichaje": "Tipo de fichaje",
  Observaciones: "Observaciones",
};

function formatValorAuditoria(valor: string | null): string {
  if (!valor) return "Ninguno";
  const d = new Date(valor);
  if (!Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(valor)) return fechaHoraLarga(valor);
  return valor;
}

/** Modal de detalle de un fichaje — inspirado en la vista de hr.attendance
    de Odoo que enseñó el usuario (bloque "Datos legales España RDL 8/2019"
    con tipo/IP/firma + resumen de entrada-salida). No reproducimos el
    chatter/mensajería de Odoo ni "Horas extras" (no tenemos un calendario
    de jornada esperada con el que calcularlas todavía) — solo lo que
    puede respaldarse con datos reales de asistencia.fichajes. Editable
    únicamente si el fichaje no está firmado, igual que ya impone
    actualizarFichajeAdmin en el backend. */
export function DetalleFichajeDialog({
  fichajeId,
  onClose,
  onActualizado,
}: {
  fichajeId: number | null;
  onClose: () => void;
  onActualizado: () => void;
}) {
  const [fichaje, setFichaje] = useState<FichajeDetalle | null>(null);
  const [eventos, setEventos] = useState<AuditoriaEvento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [campos, setCampos] = useState({ check_in: "", check_out: "", tipo_fichaje: "", observaciones: "" });

  useEffect(() => {
    if (!fichajeId) { setFichaje(null); setEventos([]); setEditando(false); return; }
    setCargando(true);
    Promise.all([
      fetch(`/api/asistencia/admin/fichajes/${fichajeId}`).then((r) => r.json()),
      fetch(`/api/asistencia/admin/auditoria?fichajeId=${fichajeId}`).then((r) => r.json()),
    ])
      .then(([dFichaje, dAuditoria]) => {
        if (dFichaje.ok) setFichaje(dFichaje.fichaje); else toast.error(dFichaje.error || "No se pudo cargar el fichaje");
        if (dAuditoria.ok) setEventos(dAuditoria.eventos);
      })
      .finally(() => setCargando(false));
  }, [fichajeId]);

  function iniciarEdicion() {
    if (!fichaje) return;
    setCampos({
      check_in: isoAInputLocal(fichaje.check_in),
      check_out: isoAInputLocal(fichaje.check_out),
      tipo_fichaje: fichaje.tipo_fichaje,
      observaciones: fichaje.observaciones || "",
    });
    setEditando(true);
  }

  async function guardar() {
    if (!fichaje) return;
    setGuardando(true);
    try {
      const cambios = {
        check_in: campos.check_in ? new Date(campos.check_in).toISOString() : null,
        check_out: campos.check_out ? new Date(campos.check_out).toISOString() : null,
        tipo_fichaje: campos.tipo_fichaje,
        observaciones: campos.observaciones,
      };
      const res = await fetch(`/api/asistencia/admin/fichajes/${fichaje.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setFichaje((prev) => (prev ? { ...prev, ...data.fichaje } : data.fichaje));
      setEditando(false);
      toast.success("Fichaje actualizado");
      fetch(`/api/asistencia/admin/auditoria?fichajeId=${fichaje.id}`).then((r) => r.json()).then((d) => { if (d.ok) setEventos(d.eventos); });
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={fichajeId != null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Fichaje {fichaje ? `#${fichaje.id}` : ""}</DialogTitle>
        </DialogHeader>

        {cargando && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!cargando && fichaje && (
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="col-span-2 flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback className={colorAvatar(fichaje.empleado_nombre)}>{iniciales(fichaje.empleado_nombre)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{fichaje.empleado_nombre}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entrada</p>
                {editando ? (
                  <input type="datetime-local" className="mt-0.5 h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={campos.check_in} onChange={(e) => setCampos((c) => ({ ...c, check_in: e.target.value }))} />
                ) : (
                  <p>{fechaHoraLarga(fichaje.check_in)}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Salida</p>
                {editando ? (
                  <input type="datetime-local" className="mt-0.5 h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={campos.check_out} onChange={(e) => setCampos((c) => ({ ...c, check_out: e.target.value }))} />
                ) : (
                  <p>{fechaHoraLarga(fichaje.check_out)}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horas trabajadas</p>
                <p className="tabular-nums">{horasHHMM(fichaje.check_in, editando ? (campos.check_out ? new Date(campos.check_out).toISOString() : null) : fichaje.check_out)} ({horasDecimal(fichaje.check_in, fichaje.check_out)} h)</p>
              </div>
            </div>

            {/* Datos legales España · RDL 8/2019 */}
            <div className="space-y-2.5 rounded-lg border p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Datos legales España · RDL 8/2019</p>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tipo de Fichaje</span>
                {editando ? (
                  <Select value={campos.tipo_fichaje} onValueChange={(v) => setCampos((c) => ({ ...c, tipo_fichaje: v || c.tipo_fichaje }))}>
                    <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_FICHAJE.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <TipoFichajePill tipo={fichaje.tipo_fichaje} />
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">IP de Registro</span>
                <span className="text-xs">{fichaje.ip_registro || "—"}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Firmado</span>
                <Checkbox checked={fichaje.firmado} disabled />
              </div>

              <div className="space-y-1 text-sm">
                <span className="text-muted-foreground">Observaciones</span>
                {editando ? (
                  <Textarea rows={2} className="text-xs" value={campos.observaciones} onChange={(e) => setCampos((c) => ({ ...c, observaciones: e.target.value }))} />
                ) : (
                  <p className="text-xs">{fichaje.observaciones || "—"}</p>
                )}
              </div>

              <div className="space-y-1 text-sm">
                <span className="text-muted-foreground">Firma del Empleado</span>
                {fichaje.firma_empleado ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fichaje.firma_empleado} alt="Firma del empleado" className="h-20 rounded border bg-white object-contain" />
                ) : (
                  <p className="text-xs text-muted-foreground">{fichaje.firmado ? "Firmado sin imagen de firma disponible" : "Sin firma"}</p>
                )}
              </div>
            </div>

            {fichaje.firmado && (
              <p className="text-xs text-muted-foreground">Este fichaje está firmado y no puede modificarse.</p>
            )}
          </div>

          {/* Historial */}
          <div className="space-y-3 border-t pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Historial</p>
            <HistorialFichaje fichaje={fichaje} eventos={eventos} />
          </div>
          </div>
        )}

        <DialogFooter>
          {!cargando && fichaje && !fichaje.firmado && !editando && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={iniciarEdicion}>
              <Edit2 className="size-3.5" /> Editar
            </Button>
          )}
          {editando && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditando(false)} disabled={guardando}>Cancelar</Button>
              <Button size="sm" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</Button>
            </>
          )}
          {!editando && <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Historial tipo "chatter" de Odoo — quién y cuándo modificó este
    fichaje. Usa asistencia.auditoria (ya registrada por
    actualizarFichajeAdmin) más un evento sintético "Fichaje creado" con
    creado_en, ya que la creación en sí no se audita todavía. Sin
    attribution de usuario para ese primer evento cuando el fichaje viene
    del kiosco (no hay "admin" que lo haya creado, lo ficha el propio
    empleado). */
function HistorialFichaje({ fichaje, eventos }: { fichaje: FichajeDetalle; eventos: AuditoriaEvento[] }) {
  const grupos = new Map<string, { creado?: boolean; fecha: string; usuario: string | null; campo: string | null; valor_anterior: string | null; valor_nuevo: string | null }[]>();

  function agregar(fecha: string, entrada: { usuario: string | null; campo: string | null; valor_anterior: string | null; valor_nuevo: string | null; creado?: boolean }) {
    const dia = fechaDia(fecha);
    if (!grupos.has(dia)) grupos.set(dia, []);
    grupos.get(dia)!.push({ ...entrada, fecha });
  }

  for (const ev of eventos) agregar(ev.fecha, { usuario: ev.usuario, campo: ev.campo, valor_anterior: ev.valor_anterior, valor_nuevo: ev.valor_nuevo });
  if (fichaje.creado_en) agregar(fichaje.creado_en, { usuario: null, campo: null, valor_anterior: null, valor_nuevo: null, creado: true });

  const dias = Array.from(grupos.entries()).sort((a, b) => new Date(b[1][0].fecha).getTime() - new Date(a[1][0].fecha).getTime());
  for (const [, entradas] of dias) entradas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  if (dias.length === 0) return <p className="text-xs text-muted-foreground">Sin actividad registrada.</p>;

  return (
    <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
      {dias.map(([dia, entradas]) => (
        <div key={dia} className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">{dia}</p>
          {entradas.map((e, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <Avatar size="sm" className="mt-0.5 size-6 shrink-0">
                <AvatarFallback className={colorAvatar(e.usuario || fichaje.empleado_nombre)}>{iniciales(e.usuario || fichaje.empleado_nombre)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p>
                  <span className="font-medium">{e.usuario || fichaje.empleado_nombre}</span>
                  <span className="text-muted-foreground"> · {tiempoRelativo(e.fecha)}</span>
                </p>
                {e.creado ? (
                  <p className="text-muted-foreground">Fichaje creado</p>
                ) : (
                  <p className="text-muted-foreground">
                    {ETIQUETA_CAMPO[e.campo || ""] || e.campo}: {formatValorAuditoria(e.valor_anterior)} → {formatValorAuditoria(e.valor_nuevo)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
