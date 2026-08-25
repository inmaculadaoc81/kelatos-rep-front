"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DocumentText, ExportSquare, ClipboardTick } from "@/lib/icons";
import type { Devolucion } from "./page";

function Fila({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-t py-1.5 text-sm first:border-0 first:pt-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">{titulo}</p>
      {children}
    </div>
  );
}

function EnlacesComprobante({ links, etiqueta }: { links: string; etiqueta: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.split(" | ").filter(Boolean).map((id, i) => (
        <a
          key={i}
          href={`https://drive.google.com/file/d/${id.trim()}/view`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-primary hover:bg-muted"
        >
          <ExportSquare className="size-3" /> {etiqueta} {i + 1}
        </a>
      ))}
    </div>
  );
}

/** Puerto fiel de "abrirModalDetalleDevoluciones()" del original. */
export function DetalleDevolucionDialog({ devolucion, onOpenChange }: { devolucion: Devolucion | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={devolucion !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
              <DocumentText className="size-4" />
            </span>
            Devolución #{devolucion?.id}
          </DialogTitle>
        </DialogHeader>

        {devolucion && (
          <div className="space-y-3">
            <Seccion titulo="Datos del cliente">
              <Fila label="Nombre" value={devolucion.nombre_cliente || "-"} />
              <Fila label="Email" value={devolucion.email || "-"} />
              <Fila label="Teléfono" value={devolucion.telefono || "-"} />
              <Fila label="Importe" value={devolucion.importe ? `${Number(devolucion.importe).toFixed(2)} €` : "-"} />
              <Fila label="Enviado por" value={devolucion.enviado_por || "-"} />
              <Fila label="Fecha registro" value={new Date(devolucion.fecha_registro).toLocaleDateString("es-ES")} />
            </Seccion>

            <Seccion titulo="Motivo">
              <p className="text-sm font-medium">
                {devolucion.motivo || "-"}
                {devolucion.motivo_detalle ? ` — ${devolucion.motivo_detalle}` : ""}
              </p>
            </Seccion>

            <Seccion titulo="Datos bancarios">
              <Fila label="Núm. cuenta" value={devolucion.numero_cuenta || "-"} />
              <Fila label="Banco" value={devolucion.banco || "-"} />
              <Fila label="Beneficiario" value={devolucion.nombre_beneficiario || "-"} />
              <Fila label="País de destino" value={devolucion.pais || "España"} />
            </Seccion>

            {devolucion.comentarios && (
              <Seccion titulo="Comentarios">
                <p className="text-sm">{devolucion.comentarios}</p>
              </Seccion>
            )}

            <Seccion titulo="Comprobantes">
              {devolucion.link_foto ? (
                <EnlacesComprobante links={devolucion.link_foto} etiqueta="Comprobante" />
              ) : (
                <p className="text-xs text-muted-foreground">Sin comprobantes adjuntos</p>
              )}
            </Seccion>

            {devolucion.estado === "Completada" && (
              <Seccion titulo="Cierre">
                <div className="mb-2 flex items-center gap-1.5">
                  <ClipboardTick className="size-3.5 text-emerald-600" />
                  <Badge>Completada</Badge>
                </div>
                <Fila label="Fecha cierre" value={devolucion.fecha_cierre ? new Date(devolucion.fecha_cierre).toLocaleDateString("es-ES") : "-"} />
                <Fila label="Cerrado por" value={devolucion.cerrado_por || "-"} />
                {devolucion.observaciones_cierre && (
                  <div className="mt-2 border-t pt-2">
                    <p className="mb-1 text-[11px] font-semibold text-muted-foreground uppercase">Observaciones</p>
                    <p className="text-sm">{devolucion.observaciones_cierre}</p>
                  </div>
                )}
                {devolucion.link_comprobante_pago && (
                  <div className="mt-2 border-t pt-2">
                    <p className="mb-1 text-[11px] font-semibold text-muted-foreground uppercase">Comprobante de pago</p>
                    <EnlacesComprobante links={devolucion.link_comprobante_pago} etiqueta="Justificante" />
                  </div>
                )}
              </Seccion>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
