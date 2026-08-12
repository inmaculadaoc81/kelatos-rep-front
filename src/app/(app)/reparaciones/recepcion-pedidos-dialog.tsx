"use client";

import { useEffect, useState } from "react";
import { BoxSearch, TickCircle, CloseCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Pedido } from "@/lib/reparacion-detalle";

/**
 * Reproduce _mostrarModalRecepcionPedidos()/_confirmarRecepcionPedidos()
 * (Index.html) — cuando hay más de un pedido pendiente, en vez de
 * confirmar uno solo se listan todos con checkbox (todos marcados por
 * defecto) y se reciben de golpe los que queden marcados.
 */
export function RecepcionPedidosDialog({
  pendientes,
  open,
  onOpenChange,
  onRecibidos,
}: {
  pendientes: Pedido[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecibidos: () => void;
}) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMarcados(new Set(pendientes.map((p) => p.pedidoId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function alternar(pedidoId: string, marcado: boolean) {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (marcado) next.add(pedidoId);
      else next.delete(pedidoId);
      return next;
    });
  }

  async function confirmar() {
    if (marcados.size === 0) return toast.error("Selecciona al menos una pieza");
    setEnviando(true);
    try {
      const res = await fetch("/api/pedidos/cambiar-estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidos: Array.from(marcados), estado: "Recibido" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`${marcados.size} pieza(s) marcada(s) como recibida(s)`);
      onOpenChange(false);
      onRecibidos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-amber-500 px-4 py-3 text-white">
          <BoxSearch className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-white">Recepción de piezas</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => !enviando && onOpenChange(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <div className="space-y-2 p-4">
          <p className="text-xs text-muted-foreground">Selecciona las piezas que han llegado. Las no marcadas permanecerán en su estado actual.</p>
          {pendientes.map((p) => (
            <label key={p.pedidoId} className="flex items-start gap-2.5 rounded-md border p-2.5 text-sm">
              <Checkbox className="mt-0.5" checked={marcados.has(p.pedidoId)} onCheckedChange={(v) => alternar(p.pedidoId, v === true)} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 font-medium">
                  {p.notas || "Sin descripción"}
                  {p.numeroPedido && <Badge variant="secondary">{p.numeroPedido}</Badge>}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {p.pedidoId}
                  {p.compradoPor ? ` · ${p.compradoPor}` : ""} · {p.estado}
                </span>
              </span>
            </label>
          ))}
        </div>

        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button className="bg-amber-500 text-white hover:bg-amber-600 gap-1.5" onClick={confirmar} disabled={enviando}>
            <TickCircle className="size-3.5" /> {enviando ? "Guardando…" : "Marcar recibidas"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
