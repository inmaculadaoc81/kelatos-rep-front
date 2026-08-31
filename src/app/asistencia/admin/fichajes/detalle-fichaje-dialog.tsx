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
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [campos, setCampos] = useState({ check_in: "", check_out: "", tipo_fichaje: "", observaciones: "" });

  useEffect(() => {
    if (!fichajeId) { setFichaje(null); setEditando(false); return; }
    setCargando(true);
    fetch(`/api/asistencia/admin/fichajes/${fichajeId}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setFichaje(d.fichaje); else toast.error(d.error || "No se pudo cargar el fichaje"); })
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
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={fichajeId != null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
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
