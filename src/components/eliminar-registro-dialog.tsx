"use client";

import { useEffect, useState } from "react";
import { Trash, Warning2, CloseCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface FilaResumen {
  tabla: string;
  cantidad: number;
}

/**
 * Borrado real de un registro de la base de datos — reemplaza el borrado
 * manual que antes se hacía directamente en Sheets, restringido al
 * superadmin y auditado en kelatos_app.registros_eliminados antes de
 * ejecutarse (ver server.js). Al abrirse consulta {apiUrl}/eliminar-preview
 * (solo lectura) para mostrar qué filas dependientes se borrarían junto
 * con el registro, antes de que el usuario confirme nada.
 *
 * A diferencia del ConfirmProvider genérico (sí/no), esto exige escribir
 * el identificador exacto y un motivo — es una acción irreversible sobre
 * datos reales, no una confirmación cualquiera.
 */
export function EliminarRegistroDialog({
  tipo,
  id,
  apiUrl,
  open,
  onOpenChange,
  onEliminado,
}: {
  /** Etiqueta humana del tipo de registro, p.ej. "reparación", "cliente". */
  tipo: string;
  id: string;
  apiUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEliminado: () => void;
}) {
  const [confirmacion, setConfirmacion] = useState("");
  const [motivo, setMotivo] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [preview, setPreview] = useState<{ tieneFacturaReal: boolean; resumen: FilaResumen[] } | null | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setPreview(undefined);
    fetch(`${apiUrl}/eliminar-preview`)
      .then((r) => r.json())
      .then((data) => setPreview(data.ok ? { tieneFacturaReal: !!data.tieneFacturaReal, resumen: data.resumen || [] } : null))
      .catch(() => setPreview(null));
  }, [open, apiUrl]);

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
  const filasConDatos = preview?.resumen.filter((f) => f.cantidad > 0) || [];

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="gap-0 p-0 sm:max-w-md" showCloseButton={false}>
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

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Se eliminarán también, ligados a {id}</Label>
            {preview === undefined && (
              <div className="space-y-1.5 rounded-md border p-2.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
            {preview === null && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                No se pudo comprobar qué registros dependientes se borrarían. Comprueba la conexión antes de continuar.
              </p>
            )}
            {preview && filasConDatos.length === 0 && (
              <p className="rounded-md border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                Sin filas dependientes — solo se borra este registro.
              </p>
            )}
            {preview && filasConDatos.length > 0 && (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 text-xs">Tabla</TableHead>
                      <TableHead className="h-8 text-right text-xs">Filas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasConDatos.map((f) => (
                      <TableRow key={f.tabla}>
                        <TableCell className="py-1.5 text-sm capitalize">{f.tabla}</TableCell>
                        <TableCell className="py-1.5 text-right text-sm tabular-nums">{f.cantidad}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {preview?.tieneFacturaReal && (
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
