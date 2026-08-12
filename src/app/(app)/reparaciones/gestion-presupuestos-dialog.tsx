"use client";

import { useState } from "react";
import { Receipt, Add, CloseCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { m, lista as listaAnim, ProveedorAnimacion } from "@/lib/animacion";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { PresupuestoCard } from "./presupuesto-card";
import { PresupuestoFormDialog } from "./presupuesto-form-dialog";
import { PresupuestosEnvioBar } from "./presupuestos-envio-bar";

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
                    <PresupuestoCard key={p.presupuestoId} resguardo={detalle.resguardo} presupuesto={p} revisionPagada={detalle.revisionPagada === "SI"} onActualizado={onActualizado} />
                  ))}
                </m.div>
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
