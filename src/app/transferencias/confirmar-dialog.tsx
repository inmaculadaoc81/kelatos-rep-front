"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateLeft } from "@/lib/icons";

/** Puerto del "Modal Revertir" del original: detalle + pregunta antes de confirmar, sin ejecutar directo. */
export function ConfirmarDialog({
  open,
  onOpenChange,
  titulo,
  detalles,
  pregunta,
  textoConfirmar,
  onConfirmar,
  confirmando,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  detalles: { label: string; value: string }[];
  pregunta: string;
  textoConfirmar: string;
  onConfirmar: () => void;
  confirmando: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !confirmando && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm" showCloseButton={!confirmando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <RotateLeft className="size-4" />
            </span>
            {titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
          {detalles.map((d) => (
            <div key={d.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-medium">{d.value}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">{pregunta}</p>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={confirmando}>Cancelar</Button>
          <Button className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700" onClick={onConfirmar} disabled={confirmando}>
            <RotateLeft className="size-4" /> {confirmando ? "Revirtiendo..." : textoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
