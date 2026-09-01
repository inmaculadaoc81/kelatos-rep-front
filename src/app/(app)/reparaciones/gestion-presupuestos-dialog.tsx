"use client";

import { useState } from "react";
import { Receipt, Add, CloseCircle, Warning2, ArrowRight2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { m, lista as listaAnim, ProveedorAnimacion } from "@/lib/animacion";
import { ReparacionDetalle, esPptoAceptado } from "@/lib/reparacion-detalle";
import { PresupuestoCard } from "./presupuesto-card";
import { PresupuestoFormDialog } from "./presupuesto-form-dialog";
import { PresupuestosEnvioBar } from "./presupuestos-envio-bar";

const ESTADOS_BLOQUEADOS_ACEPTACION = new Set(["Presupuesto Pendiente", "Presupuesto Enviado"]);

/**
 * Reproduce el modal #modalGestionPresupuestos del original
 * (abrirModalGestionPresupuestos/renderizarListaPresupuestos) — cabecera
 * azul "Presupuestos - Resguardo X" y "+ Nuevo Presupuesto" en verde. El
 * original intercambia la vista lista/formulario dentro del MISMO modal;
 * aquí el formulario se abre como un diálogo apilado (PresupuestoFormDialog)
 * en vez de sustituir el contenido — mismo resultado para quien lo usa,
 * sin duplicar el formulario completo en dos sitios.
 */
export function GestionPresupuestosDialog({
  detalle,
  open,
  onOpenChange,
  onActualizado,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const hayAceptados = detalle.presupuestos.some((p) => esPptoAceptado(p.estado));
  const estadoBloqueado = ESTADOS_BLOQUEADOS_ACEPTACION.has(detalle.estado);

  async function finalizarAceptacion() {
    setFinalizando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/finalizar-aceptacion`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Estado actualizado a "${data.reparacion?.estado || ""}"`);
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl" showCloseButton={false}>
          <header className="flex items-center gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
            <Receipt className="size-4.5 shrink-0" />
            <DialogTitle className="text-sm font-semibold text-primary-foreground">
              Presupuestos — Resguardo {detalle.resguardo}
            </DialogTitle>
            <Button variant="ghost" size="icon-sm" className="ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={() => onOpenChange(false)}>
              <CloseCircle className="size-4" />
            </Button>
          </header>

          {/* Proveedor propio: este modal se monta fuera del <ProveedorAnimacion>
              de detalle-dialog.tsx (son diálogos hermanos, no anidados en el
              árbol de React), así que PresupuestoCard —que usa m.div
              internamente— necesita su propia instancia de LazyMotion aquí. */}
          <ProveedorAnimacion>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Presupuestos creados</h3>
                <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setNuevoAbierto(true)}>
                  <Add className="size-3.5" /> Nuevo Presupuesto
                </Button>
              </div>

              {detalle.presupuestos.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed py-8 text-center text-muted-foreground">
                  <Receipt className="size-6 text-muted-foreground/60" />
                  <p className="text-sm">No hay presupuestos creados.</p>
                  <p className="text-xs">Haga clic en &quot;Nuevo Presupuesto&quot; para crear uno.</p>
                </div>
              ) : (
                <m.div className="space-y-2" variants={listaAnim} initial="inicial" animate="visible">
                  {detalle.presupuestos.map((p) => (
                    <PresupuestoCard key={p.presupuestoId} resguardo={detalle.resguardo} presupuesto={p} pedidos={detalle.pedidos} revisionPagada={detalle.revisionPagada === "SI"} clienteNombre={detalle.cliente.nombre} clienteEmail={detalle.cliente.email} onActualizado={onActualizado} />
                  ))}
                </m.div>
              )}
              {hayAceptados && estadoBloqueado && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                  <Warning2 className="size-4.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Hay presupuestos aceptados pero la reparación no avanzó.</p>
                    <p className="text-xs">Se marcó que habría más presupuestos por aceptar. Si ya no hay más, confirma para continuar.</p>
                  </div>
                  <Button size="sm" className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700" onClick={finalizarAceptacion} disabled={finalizando}>
                    <ArrowRight2 className="size-3.5" /> {finalizando ? "Actualizando..." : "No hay más — Continuar"}
                  </Button>
                </div>
              )}
              <PresupuestosEnvioBar
                resguardo={detalle.resguardo}
                presupuestos={detalle.presupuestos}
                clienteTelefono={detalle.cliente.telefono}
                onActualizado={onActualizado}
              />
            </div>
          </ProveedorAnimacion>
        </DialogContent>
      </Dialog>

      <PresupuestoFormDialog
        resguardo={detalle.resguardo}
        presupuestoExistente={null}
        revisionPagada={detalle.revisionPagada === "SI"}
        open={nuevoAbierto}
        onOpenChange={setNuevoAbierto}
        onGuardado={onActualizado}
      />
    </>
  );
}
