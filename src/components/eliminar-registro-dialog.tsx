"use client";

import { useState } from "react";
import { Trash, Warning2, CloseCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/**
 * Borrado real de un registro de la base de datos — reemplaza el borrado
 * manual que antes se hacía directamente en Sheets, ahora restringido al
 * superadmin (kelatoscielo@gmail.com) y auditado en
 * kelatos_app.registros_eliminados antes de ejecutarse (ver server.js).
 *
 * A diferencia del ConfirmProvider genérico (sí/no), esto exige escribir
 * el identificador exacto y un motivo — es una acción irreversible sobre
 * datos reales, no una confirmación cualquiera.
 */
export function EliminarRegistroDialog({
  tipo,
  id,
  apiUrl,
  tieneFacturaReal,
  open,
  onOpenChange,
  onEliminado,
}: {
  /** Etiqueta humana del tipo de registro, p.ej. "reparación", "cliente". */
  tipo: string;
  id: string;
  apiUrl: string;
  /** Si el registro tiene un número de factura fiscal real emitido — se muestra un aviso adicional, pero no bloquea el borrado. */
  tieneFacturaReal?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEliminado: () => void;
}) {
  const [confirmacion, setConfirmacion] = useState("");
  const [motivo, setMotivo] = useState("");
  const [eliminando, setEliminando] = useState(false);

  function cerrar(o: boolean) {
    if (eliminando) return;
    if (!o) {
      setConfirmacion("");
      setMotivo("");
    }
    onOpenChange(o);
  }

  async function eliminar() {
    if (confirmacion.trim() !== id.trim() || !motivo.trim()) return;
    setEliminando(true);
    try {
      const res = await fetch(apiUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo eliminar");
      toast.success(`${tipo} eliminado/a`);
      setConfirmacion("");
      setMotivo("");
      onOpenChange(false);
      onEliminado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEliminando(false);
    }
  }

  const puedeEliminar = confirmacion.trim() === id.trim() && !!motivo.trim();

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="gap-0 p-0 sm:max-w-sm" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-destructive px-4 py-3 text-destructive-foreground">
          <Trash className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-destructive-foreground">Eliminar {tipo}</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-destructive-foreground hover:bg-black/10" onClick={() => cerrar(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            Esto borra el registro <strong className="text-foreground">{id}</strong> de la base de datos de forma permanente. Queda registrado en la auditoría interna, pero no se puede deshacer desde aquí.
          </p>

          {tieneFacturaReal && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <Warning2 className="mt-0.5 size-4 shrink-0" />
              <span>
                Este registro tiene una <strong>factura fiscal real emitida</strong>. Borrarlo no libera ni anula ese número de factura — solo elimina la constancia interna del registro asociado. Piénsalo dos veces si no es un registro de prueba.
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="erMotivo">Motivo del borrado *</Label>
            <Textarea id="erMotivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Ej: registro de prueba del formulario público" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="erConfirmacion">
              Escribe <strong className="text-foreground">{id}</strong> para confirmar
            </Label>
            <Input id="erConfirmacion" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="off" />
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          <Button variant="secondary" onClick={() => cerrar(false)} disabled={eliminando}>
            Cancelar
          </Button>
          <Button variant="destructive" className="gap-1.5" disabled={!puedeEliminar || eliminando} onClick={eliminar}>
            <Trash className="size-3.5" /> {eliminando ? "Eliminando..." : "Eliminar definitivamente"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
