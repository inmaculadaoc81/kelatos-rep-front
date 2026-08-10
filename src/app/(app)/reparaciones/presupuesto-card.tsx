"use client";

import { useState } from "react";
import { TickCircle, CloseCircle, CloseSquare, Edit2, Trash } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Presupuesto } from "@/lib/reparacion-detalle";
import { AccionCambioEstadoPresupuesto } from "@/lib/presupuesto-cambiar-estado";
import { PresupuestoFormDialog } from "./presupuesto-form-dialog";

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function PresupuestoCard({
  resguardo,
  presupuesto: p,
  onActualizado,
}: {
  resguardo: string;
  presupuesto: Presupuesto;
  onActualizado: () => void;
}) {
  const [motivoAbierto, setMotivoAbierto] = useState<"rechazar" | "anular" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [editarAbierto, setEditarAbierto] = useState(false);
  const editable = p.estado === "borrador" || p.estado === "enviado";

  async function ejecutar(accion: AccionCambioEstadoPresupuesto, motivoTexto?: string) {
    setEnviando(true);
    try {
      const res = await fetch("/api/presupuestos/cambiar-estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presupuestoId: p.presupuestoId, accion, motivo: motivoTexto }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(
        accion === "aceptar" ? "Presupuesto aceptado" : accion === "rechazar" ? "Presupuesto rechazado" : "Presupuesto anulado"
      );
      setMotivoAbierto(null);
      setMotivo("");
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  function confirmarConMotivo() {
    if (!motivoAbierto) return;
    if (motivoAbierto === "rechazar" && !motivo.trim()) return toast.error("El motivo del rechazo es obligatorio");
    ejecutar(motivoAbierto, motivo);
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar el presupuesto v${p.version} (borrador)? Esta acción no se puede deshacer.`)) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/presupuestos/${p.presupuestoId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Presupuesto eliminado");
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-md border p-2.5 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          v{p.version} — {p.descripcion || "sin descripción"}
        </span>
        <Badge variant="outline">{p.estado}</Badge>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-muted-foreground sm:grid-cols-4">
        <span>Mano obra: {euros(p.manoObra)}</span>
        <span>Piezas: {euros(p.precioPiezas)}</span>
        <span>Total: {euros(p.total)}</span>
        <span>Entrega: {p.diasEntrega}d</span>
      </div>
      {p.piezas.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t pt-2 text-xs">
          {p.piezas.map((pz) => (
            <li key={pz.piezaId} className="flex justify-between">
              <span className="text-muted-foreground">{pz.descripcion || pz.tipo}</span>
              <span>{euros(pz.precio)}</span>
            </li>
          ))}
        </ul>
      )}

      {p.estado === "enviado" && (
        <div className="mt-2 flex gap-1.5 border-t pt-2">
          <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600" disabled={enviando} onClick={() => ejecutar("aceptar")}>
            <TickCircle className="size-3.5" /> Aceptar
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-destructive" disabled={enviando} onClick={() => setMotivoAbierto("rechazar")}>
            <CloseCircle className="size-3.5" /> Rechazar
          </Button>
        </div>
      )}
      {p.estado === "aceptado" && (
        <div className="mt-2 flex gap-1.5 border-t pt-2">
          <Button size="sm" variant="outline" className="h-7 gap-1 text-amber-600" disabled={enviando} onClick={() => setMotivoAbierto("anular")}>
            <CloseSquare className="size-3.5" /> Anular
          </Button>
        </div>
      )}
      {editable && (
        <div className="mt-2 flex gap-1.5 border-t pt-2">
          <Button size="sm" variant="ghost" className="h-7 gap-1" disabled={enviando} onClick={() => setEditarAbierto(true)}>
            <Edit2 className="size-3.5" /> Editar
          </Button>
          {p.estado === "borrador" && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" disabled={enviando} onClick={eliminar}>
              <Trash className="size-3.5" /> Eliminar
            </Button>
          )}
        </div>
      )}

      <PresupuestoFormDialog
        resguardo={resguardo}
        presupuestoExistente={p}
        open={editarAbierto}
        onOpenChange={setEditarAbierto}
        onGuardado={onActualizado}
      />

      <Dialog open={motivoAbierto !== null} onOpenChange={(o) => !enviando && !o && setMotivoAbierto(null)}>
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton={!enviando}>
          <DialogHeader>
            <DialogTitle>{motivoAbierto === "rechazar" ? "Rechazar presupuesto" : "Anular presupuesto"}</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="Motivo..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMotivoAbierto(null)} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarConMotivo} disabled={enviando}>
              {enviando ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
