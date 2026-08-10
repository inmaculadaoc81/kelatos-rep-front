"use client";

import { useState } from "react";
import { TickCircle, CloseCircle, CloseSquare, Edit2, Trash, Box } from "@/lib/icons";
import { m, elementoLista } from "@/lib/animacion";
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

// El estado tiñe la tarjeta entera, no solo el badge: en una lista de
// varias versiones es lo que permite ver de un vistazo cuál está viva.
const ESTILO_ESTADO: Record<string, { caja: string; badge: string }> = {
  aceptado: { caja: "border-emerald-500/40 bg-emerald-500/5", badge: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" },
  enviado: { caja: "border-sky-500/40 bg-sky-500/5", badge: "border-sky-500/40 text-sky-700 dark:text-sky-400" },
  rechazado: { caja: "border-destructive/30 bg-destructive/5", badge: "border-destructive/40 text-destructive" },
  anulado: { caja: "bg-muted/40 opacity-75", badge: "text-muted-foreground" },
  obsoleto: { caja: "bg-muted/40 opacity-75", badge: "text-muted-foreground" },
  borrador: { caja: "bg-card", badge: "text-muted-foreground" },
};

function Importe({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div className="px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd className={`tabular-nums ${destacado ? "text-sm font-semibold" : "text-sm"}`}>{valor}</dd>
    </div>
  );
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

  const acciones =
    p.estado === "enviado" ? (
      <>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-emerald-600" disabled={enviando} onClick={() => ejecutar("aceptar")}>
          <TickCircle className="size-3.5" /> Aceptar
        </Button>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-destructive" disabled={enviando} onClick={() => setMotivoAbierto("rechazar")}>
          <CloseCircle className="size-3.5" /> Rechazar
        </Button>
      </>
    ) : p.estado === "aceptado" ? (
      <Button size="sm" variant="outline" className="h-7 gap-1 text-amber-600" disabled={enviando} onClick={() => setMotivoAbierto("anular")}>
        <CloseSquare className="size-3.5" /> Anular
      </Button>
    ) : null;

  const accionesEdicion = editable ? (
    <>
      <Button size="sm" variant="ghost" className="h-7 gap-1" disabled={enviando} onClick={() => setEditarAbierto(true)}>
        <Edit2 className="size-3.5" /> Editar
      </Button>
      {p.estado === "borrador" && (
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" disabled={enviando} onClick={eliminar}>
          <Trash className="size-3.5" /> Eliminar
        </Button>
      )}
    </>
  ) : null;

  return (
    <m.div
      variants={elementoLista}
      className={`@container overflow-hidden rounded-xl border text-sm transition-colors ${ESTILO_ESTADO[p.estado]?.caja ?? "bg-card"}`}
    >
      <header className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <span className="rounded-md bg-card px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums ring-1 ring-border">
          v{p.version}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium" title={p.descripcion}>
          {p.descripcion || "Sin descripción"}
        </span>
        <Badge variant="outline" className={ESTILO_ESTADO[p.estado]?.badge}>
          {p.estado}
        </Badge>
      </header>

      {/* Los importes como columnas etiquetadas y alineadas a la derecha:
          antes iban en una fila de texto corrido donde no se podían comparar. */}
      {/* Container query, no breakpoint de ventana: esta tarjeta vive tanto
          a ancho completo como en una columna estrecha, y lo que decide
          si caben cuatro importes en fila es su propio ancho. */}
      <dl className="grid grid-cols-2 divide-x divide-y border-b @md:grid-cols-4 @md:divide-y-0">
        <Importe etiqueta="Mano de obra" valor={euros(p.manoObra)} />
        <Importe etiqueta="Piezas" valor={euros(p.precioPiezas)} />
        <Importe etiqueta="Total" valor={euros(p.total)} destacado />
        <Importe etiqueta="Entrega" valor={`${p.diasEntrega} d`} />
      </dl>

      {p.piezas.length > 0 && (
        <ul className="divide-y border-b text-xs">
          {p.piezas.map((pz) => (
            <li key={pz.piezaId} className="flex items-center gap-2 px-3 py-1.5">
              <Box className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{pz.descripcion || pz.tipo}</span>
              <span className="tabular-nums text-muted-foreground">{euros(pz.precio)}</span>
            </li>
          ))}
        </ul>
      )}

      {(acciones || accionesEdicion) && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
          {acciones}
          {acciones && accionesEdicion && <span className="mx-0.5 h-4 w-px bg-border" />}
          {accionesEdicion}
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
    </m.div>
  );
}
