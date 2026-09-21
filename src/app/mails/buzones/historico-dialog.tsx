"use client";

import { useState } from "react";
import { Clock } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Buzon } from "@/lib/mails";

function isoMenos(dias: number, desde: string): string {
  const d = new Date(`${desde}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Ampliar el histórico de un buzón: se elige una fecha anterior y el buzón se
 * vuelve a recorrer desde ahí. Lo que ya está guardado no se duplica y nada se
 * toca en el servidor de correo.
 */
export function HistoricoDialog({ buzon, open, onOpenChange, onHecho }: { buzon: Buzon; open: boolean; onOpenChange: (o: boolean) => void; onHecho: () => void }) {
  const [desde, setDesde] = useState(isoMenos(90, buzon.sincronizar_desde));
  const [enviando, setEnviando] = useState(false);

  async function ampliar() {
    setEnviando(true);
    try {
      const res = await fetch(`/api/mails/buzones/${buzon.id}/historico`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desde }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Recorriendo ${buzon.email} desde ${data.desde}. Los correos antiguos irán apareciendo en unos minutos.`);
      onOpenChange(false);
      onHecho();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5" /> Ampliar histórico
          </DialogTitle>
          <DialogDescription>
            {buzon.email} trae hoy los correos desde el <strong>{buzon.sincronizar_desde}</strong>. Elige una fecha anterior para traer también los más antiguos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="hsDesde">Traer correos desde</Label>
          <Input id="hsDesde" type="date" max={new Date().toISOString().slice(0, 10)} value={desde} onChange={(e) => setDesde(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Se vuelve a recorrer el buzón por tandas de hasta 200 correos cada 2 minutos, así que un histórico grande tarda un rato. Lo ya guardado no se duplica y el buzón real no se modifica.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={enviando || !desde} onClick={ampliar}>
            {enviando ? "Iniciando…" : "Ampliar histórico"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
