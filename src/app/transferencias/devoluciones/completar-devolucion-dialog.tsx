"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TickCircle } from "@/lib/icons";
import type { Devolucion } from "./page";

function leerComoBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ base64: dataUrl.split(",")[1] || "", mime: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export function CompletarDevolucionDialog({
  devolucion,
  onOpenChange,
  onCompletada,
}: {
  devolucion: Devolucion | null;
  onOpenChange: (open: boolean) => void;
  onCompletada: () => void;
}) {
  const [observaciones, setObservaciones] = useState("");
  const [fotos, setFotos] = useState<{ base64: string; mime: string }[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setObservaciones("");
    setFotos([]);
  }, [devolucion]);

  async function onSeleccionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    const nuevas = await Promise.all(archivos.map(leerComoBase64));
    setFotos((prev) => [...prev, ...nuevas]);
  }

  async function completar() {
    if (!devolucion) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/devoluciones/${devolucion.id}/completar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observaciones, fotos }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Devolución #${devolucion.id} completada`);
      onOpenChange(false);
      onCompletada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={devolucion !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Completar devolución #{devolucion?.id}</DialogTitle>
        </DialogHeader>
        {devolucion && (
          <div className="grid gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              {devolucion.nombre_cliente} — {devolucion.importe ? `${Number(devolucion.importe).toFixed(2)} €` : "-"}
            </p>
            <div>
              <Label>Comprobante de pago</Label>
              <Input type="file" accept="image/*,application/pdf" multiple onChange={onSeleccionarFotos} />
              {fotos.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{fotos.length} archivo(s) adjunto(s)</p>}
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={completar} disabled={enviando}>
            <TickCircle className="size-4" /> {enviando ? "Guardando..." : "Marcar como completada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
