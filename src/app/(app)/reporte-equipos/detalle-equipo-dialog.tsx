"use client";

import { ClipboardTick } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Reparacion, COLOR_ESTADO } from "@/lib/reparaciones";
import { formatearFecha } from "@/lib/dias-entrega";

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="text-sm">{valor}</p>
    </div>
  );
}

function EstadoBadgePill({ estado }: { estado: string }) {
  const color = COLOR_ESTADO[estado];
  if (!color) return <span className="text-sm">{estado}</span>;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: color.bg, color: color.fg }}>
      {estado}
    </span>
  );
}

/** Reproduce el modal #modalDetalleEquipo2 (_re2AbrirDetalle/_re2RenderDetalle) del original — la fila ya viene cargada en la tabla, así que no hace falta volver a pedirla. */
export function DetalleEquipoDialog({
  reparacion,
  open,
  onOpenChange,
}: {
  reparacion: Reparacion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0 sm:max-w-2xl" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-slate-800 px-5 py-3.5 text-white">
          <ClipboardTick className="size-5 shrink-0" />
          <DialogTitle className="text-base font-semibold text-white">
            Parte — {reparacion?.resguardo}
          </DialogTitle>
        </header>

        {reparacion && (
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 border-b pb-1 text-[.7rem] font-bold text-muted-foreground uppercase">Datos del parte</h3>
                <Campo label="N° Resguardo" valor={reparacion.resguardo || "—"} />
                <Campo label="Fecha entrada" valor={formatearFecha(reparacion.fechaRecepcion)} />
                <Campo label="Estado" valor={<EstadoBadgePill estado={reparacion.estado} />} />
                <Campo label="Técnico" valor={reparacion.tecnicoAsignado || "—"} />
              </div>
              <div>
                <h3 className="mb-2 border-b pb-1 text-[.7rem] font-bold text-muted-foreground uppercase">Cliente</h3>
                <Campo label="Nombre" valor={reparacion.cliente.nombre || "—"} />
                <Campo label="Teléfono" valor={reparacion.cliente.telefono || "—"} />
                <Campo label="Email" valor={reparacion.cliente.email || "—"} />
                <Campo label="Dirección" valor={reparacion.cliente.direccion || "—"} />
              </div>
            </div>

            <div>
              <h3 className="mb-2 border-b pb-1 text-[.7rem] font-bold text-muted-foreground uppercase">Equipo</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <Campo label="Modelo / N° Serie" valor={reparacion.equipo.modelo || "—"} />
                <Campo label="Síntoma" valor={reparacion.equipo.sintoma || "—"} />
              </div>
              {reparacion.observaciones && (
                <div className="mt-2">
                  <p className="mb-1 text-xs font-bold">Observaciones</p>
                  <p className="rounded-md bg-muted/50 p-2 text-sm">{reparacion.observaciones}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="flex justify-end border-t bg-muted/50 px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
