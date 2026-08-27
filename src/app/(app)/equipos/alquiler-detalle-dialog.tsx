"use client";

import Link from "next/link";
import { Bank, Calendar, CloseCircle, DocumentText, Hashtag, Money, Profile, Wallet } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Equipo } from "@/lib/equipos";

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fecha(v: string | null): string {
  return v ? new Date(v).toLocaleDateString("es-ES") : "—";
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="min-w-0 wrap-break-word">{valor}</dd>
    </div>
  );
}

function Tarjeta({ titulo, icono, children }: { titulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center gap-1.5 rounded-t-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">
        {icono} {titulo}
      </div>
      <dl className="divide-y px-3">{children}</dl>
    </div>
  );
}

/**
 * Vista de solo lectura del alquiler vigente (o del último histórico) de
 * un equipo — petición del usuario, 2026-08-27: "No puedo meterme dentro
 * de los alquileres para ver los datos del cliente ni el método de pago
 * ni el número de pedido". Los datos ya llegaban al frontend completos
 * (Equipo.alquilerActivo, vía GET /v1/equipos) — solo faltaba una vista
 * para mostrarlos; no reutiliza AlquilerModalShell (facturas-clientes)
 * porque ese está orientado a factura/PDF/Devolución/Eliminar, acciones
 * que no pintan en esta pantalla de inventario.
 */
export function AlquilerDetalleDialog({
  equipo,
  open,
  onOpenChange,
}: {
  equipo: Equipo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!equipo) return null;
  const al = equipo.alquilerActivo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0 sm:max-w-2xl" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
          <Wallet className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-primary-foreground">
            {equipo.marca} {equipo.modelo} <span className="font-normal opacity-80">— {equipo.id}</span>
          </DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={() => onOpenChange(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <div className="space-y-3 p-4">
          {!al ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Este equipo no tiene ningún alquiler registrado.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 px-3 py-2">
                <span className="flex items-center gap-1 text-xs font-bold text-primary">
                  <Hashtag className="size-3" /> {al.alquilerId}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="size-3" /> {fecha(al.fechaInicio)} → {fecha(al.fechaFinPrevista)}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Money className="size-3" /> {euros(al.totalCobrado || al.totalPrevisto)}
                </span>
              </div>

              <Tarjeta titulo="Cliente" icono={<Profile className="size-3.5" />}>
                <Fila etiqueta="Nombre" valor={al.clienteNombre || "—"} />
                <Fila etiqueta="Teléfono" valor={al.clienteTelefono || "—"} />
                <Fila etiqueta="Email" valor={al.clienteEmail || "—"} />
                <Fila etiqueta="DNI / NIF" valor={al.clienteDNI || "—"} />
                <Fila etiqueta="Dirección" valor={al.clienteDireccion || "—"} />
              </Tarjeta>

              <Tarjeta titulo="Alquiler y pago" icono={<Bank className="size-3.5" />}>
                <Fila etiqueta="Duración" valor={`${al.meses}m ${al.semanas}s ${al.dias}d`} />
                <Fila etiqueta="Tarifas" valor={`${al.precioDia}€/d · ${al.precioSemana}€/s · ${al.precioMes}€/m`} />
                <Fila etiqueta="Forma de pago" valor={al.metodoPago || "—"} />
                <Fila etiqueta="Fianza cobrada" valor={euros(al.fianzaCobrada)} />
                <Fila etiqueta="Subtotal / IVA" valor={`${euros(al.subtotal)} / ${euros(al.iva)}`} />
                <Fila etiqueta="Total previsto" valor={euros(al.totalPrevisto)} />
                {al.totalCobrado > 0 && <Fila etiqueta="Total cobrado" valor={euros(al.totalCobrado)} />}
                {al.envioActivado && <Fila etiqueta="Envío" valor="Sí, con recogida a domicilio" />}
                {al.observaciones && <Fila etiqueta="Observaciones" valor={al.observaciones} />}
              </Tarjeta>

              {al.numeroFactura && (
                <div className="flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <span>Factura <strong>{al.numeroFactura}</strong></span>
                  {al.urlFactura && (
                    <Button variant="outline" size="sm" className="gap-1.5" nativeButton={false} render={<Link href={al.urlFactura} target="_blank" rel="noreferrer" />}>
                      <DocumentText className="size-3.5" /> Ver PDF
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {equipo.historicoAlquileres.length > 0 && (
            <details className="rounded-md border px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                Alquileres anteriores ({equipo.historicoAlquileres.length})
              </summary>
              <div className="mt-2 space-y-1.5 divide-y">
                {equipo.historicoAlquileres.map((h) => (
                  <div key={h.alquilerId} className="pt-1.5 first:pt-0">
                    <p className="font-medium">{h.clienteNombre || "—"} <span className="font-normal text-xs text-muted-foreground">· {h.alquilerId}</span></p>
                    <p className="text-xs text-muted-foreground">{fecha(h.fechaInicio)} → {fecha(h.fechaDevolucionReal || h.fechaFinPrevista)} · {euros(h.totalCobrado || h.totalPrevisto)}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        <footer className="flex justify-end border-t bg-muted/50 px-4 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
