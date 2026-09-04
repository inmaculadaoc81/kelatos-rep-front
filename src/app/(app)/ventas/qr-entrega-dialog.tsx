"use client";

import { useEffect, useState } from "react";
import { ScanBarcode, Copy, TickCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

/** Mismo patrón que QrRecogidaDialog (reparaciones) — QR para que el
    cliente confirme la entrega de su pedido de pieza con DNI + firma. */
export function QrEntregaVentaDialog({
  ventaId,
  open,
  onOpenChange,
}: {
  ventaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCargando(true);
    setError("");
    setCopiado(false);
    fetch(`/api/ventas/${ventaId}/qr-entrega`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        setUrl(data.url);
        setDataUrl(data.dataUrl);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error desconocido"))
      .finally(() => setCargando(false));
  }, [open, ventaId]);

  function copiar() {
    navigator.clipboard.writeText(url);
    setCopiado(true);
    toast.success("Enlace copiado");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="size-5" /> QR de entrega — Pedido #{ventaId}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          {cargando && <Skeleton className="size-52" />}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!cargando && !error && dataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR de entrega" className="size-52 rounded-md border" />
          )}
          {!cargando && !error && !dataUrl && (
            <p className="text-center text-sm text-muted-foreground">
              No se pudo generar la imagen del QR — usa el enlace directo abajo.
            </p>
          )}
          {!cargando && !error && url && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={copiar}>
              {copiado ? <TickCircle className="size-3.5" /> : <Copy className="size-3.5" />} Copiar enlace
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            El cliente escanea este código o abre el enlace para identificarse (DNI/NIE/Pasaporte) y firmar la recogida de su pedido.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
