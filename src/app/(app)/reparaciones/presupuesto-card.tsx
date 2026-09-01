"use client";

import { useState } from "react";
import { TickCircle, CloseCircle, CloseSquare, Edit2, Trash, Eye, AddCircle } from "@/lib/icons";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { Pedido, Presupuesto, esPptoAceptado } from "@/lib/reparacion-detalle";
import { AccionCambioEstadoPresupuesto } from "@/lib/presupuesto-cambiar-estado";
import { PresupuestoFormDialog } from "./presupuesto-form-dialog";
import { PresupuestoDetalleDialog } from "./presupuesto-detalle-dialog";

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

function Importe({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono?: "info" | "primary" }) {
  return (
    <div className="px-3 py-2 text-center">
      <dt className="text-[11px] text-muted-foreground">{etiqueta}</dt>
      <dd className={`tabular-nums font-semibold ${tono === "info" ? "text-sky-600 dark:text-sky-400" : tono === "primary" ? "text-primary" : ""}`}>
        {valor}
      </dd>
    </div>
  );
}

function fechaHora(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-ES")} ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
}

export function PresupuestoCard({
  resguardo,
  presupuesto: p,
  pedidos = [],
  revisionPagada = false,
  reparacionCerrada = false,
  onActualizado,
}: {
  resguardo: string;
  presupuesto: Presupuesto;
  /** Pedidos de piezas de toda la reparación — se filtran aquí por piezaId
      para mostrar, en "Ver detalles", el estado real de compra de las
      piezas "por pedido" de este presupuesto concreto. */
  pedidos?: Pedido[];
  revisionPagada?: boolean;
  /** El equipo ya salió del taller (entregado/enviado/reciclado) — no tiene
      sentido aceptar/rechazar/anular/editar un presupuesto de una
      reparación ya cerrada, solo queda "Ver detalles". */
  reparacionCerrada?: boolean;
  onActualizado: () => void;
}) {
  const [motivoAbierto, setMotivoAbierto] = useState<"rechazar" | "anular" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [aceptarAbierto, setAceptarAbierto] = useState(false);
  const [hayMas, setHayMas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [editarAbierto, setEditarAbierto] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const confirmar = useConfirm();
  const editable = p.estado === "borrador" || p.estado === "enviado";

  async function ejecutar(accion: AccionCambioEstadoPresupuesto, motivoTexto?: string, hayMasVal?: boolean) {
    setEnviando(true);
    try {
      const res = await fetch("/api/presupuestos/cambiar-estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presupuestoId: p.presupuestoId, accion, motivo: motivoTexto, hayMas: hayMasVal }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(
        accion === "aceptar" ? "Presupuesto aceptado" : accion === "rechazar" ? "Presupuesto rechazado" : "Presupuesto anulado"
      );
      setMotivoAbierto(null);
      setMotivo("");
      setAceptarAbierto(false);
      setHayMas(false);
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  function confirmarConMotivo() {
    if (!motivoAbierto) return;
    if (!motivo.trim()) {
      return toast.error(motivoAbierto === "rechazar" ? "El motivo del rechazo es obligatorio" : "El motivo de la anulación es obligatorio");
    }
    ejecutar(motivoAbierto, motivo);
  }

  async function eliminar() {
    const ok = await confirmar(`¿Eliminar presupuesto v${p.version}?`);
    if (!ok) return;
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

  const acciones = reparacionCerrada ? null :
    p.estado === "enviado" ? (
      <>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-emerald-600" disabled={enviando} onClick={() => setAceptarAbierto(true)}>
          <TickCircle className="size-3.5" /> Aceptar
        </Button>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-destructive" disabled={enviando} onClick={() => setMotivoAbierto("rechazar")}>
          <CloseCircle className="size-3.5" /> Rechazar
        </Button>
      </>
    ) : esPptoAceptado(p.estado) ? (
      <Button size="sm" variant="outline" className="h-7 gap-1 text-amber-600" disabled={enviando} onClick={() => setMotivoAbierto("anular")}>
        <CloseSquare className="size-3.5" /> Anular
      </Button>
    ) : null;

  const accionesEdicion = editable && !reparacionCerrada ? (
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

      {/* Mismas 4 columnas que renderizarListaPresupuestos() del original
          (Mano Obra / Piezas cliente / Total Cliente / Ganancia Neta) — no
          Piezas/Total/Entrega, que era una simplificación de este puerto. */}
      <dl className="grid grid-cols-2 divide-x divide-y border-b @md:grid-cols-4 @md:divide-y-0">
        <Importe etiqueta="Mano Obra" valor={euros(p.manoObra)} />
        <Importe etiqueta="Piezas (cliente)" valor={euros(p.precioPiezas)} />
        <Importe etiqueta="Total Cliente" valor={euros(p.total)} tono="info" />
        <Importe etiqueta="Ganancia Neta" valor={euros(p.gananciaNeta)} tono="primary" />
      </dl>

      <p className="border-b px-3 py-1.5 text-xs text-muted-foreground">
        Elaborado por: {p.elaboradoPor || "-"} | Días: {p.diasEntrega || "-"} | Costo piezas: {euros(p.costoPiezas)}
        {p.fechaEnvio && <> | Enviado: {fechaHora(p.fechaEnvio)}</>}
      </p>

      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
        {acciones}
        {acciones && accionesEdicion && <span className="mx-0.5 h-4 w-px bg-border" />}
        {accionesEdicion}
        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setDetalleAbierto(true)}>
          <Eye className="size-3.5" /> Ver detalles
        </Button>
      </div>

      {p.motivoRechazo && (
        <div className="border-t bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          <strong>Motivo:</strong> {p.motivoRechazo}
        </div>
      )}

      <PresupuestoDetalleDialog
        resguardo={resguardo}
        presupuesto={p}
        pedidos={pedidos}
        open={detalleAbierto}
        onOpenChange={setDetalleAbierto}
      />

      <PresupuestoFormDialog
        resguardo={resguardo}
        presupuestoExistente={p}
        revisionPagada={revisionPagada}
        open={editarAbierto}
        onOpenChange={setEditarAbierto}
        onGuardado={onActualizado}
      />

      {/* Reproduce mostrarConfirmacionAceptacion() (Index.html) — antes de
          aceptar, pregunta si habrá más presupuestos por aceptar en esta
          reparación. Si la respuesta es "Sí", el backend NO rechaza a los
          demás ni cierra el estado todavía (ver el banner "No hay más —
          Continuar" en GestionPresupuestosDialog para retomarlo después). */}
      <Dialog open={aceptarAbierto} onOpenChange={(o) => { if (!enviando) { setAceptarAbierto(o); if (!o) setHayMas(false); } }}>
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton={!enviando}>
          <DialogHeader>
            <DialogTitle>¿El cliente aceptó el presupuesto v{p.version}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-semibold">¿Habrá más presupuestos a aceptar en esta reparación?</p>
            <RadioGroup value={hayMas ? "si" : "no"} onValueChange={(v) => setHayMas(v === "si")} className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="no" />
                <TickCircle className="size-4 text-emerald-600" /> No, es el único o último
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="si" />
                <AddCircle className="size-4 text-primary" /> Sí, se aceptarán más presupuestos
              </label>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAceptarAbierto(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => ejecutar("aceptar", undefined, hayMas)} disabled={enviando}>
              {enviando ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
