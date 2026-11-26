"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CloseCircle, Edit2, TickCircle } from "@/lib/icons";

/**
 * Nº de pedido de una fila de Compras que un superadmin corrige haciendo clic encima: Enter (o ✓) guarda y Esc (o ✗) cancela.
 * Nada de lo que pase aquí dentro llega a la fila, que al pulsarla abre el resguardo o la venta.
 */
export function CeldaNumeroPedido({ pedidoId, numero, onGuardado }: { pedidoId: string; numero: string; onGuardado: (nuevo: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(numero);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const nuevo = valor.replace(/\s+/g, " ").trim();
    if (guardando) return;
    if (!nuevo) return void toast.error("El nº de pedido no puede quedar vacío");
    if (nuevo === numero) return setEditando(false);
    setGuardando(true);
    try {
      const r = await fetch("/api/compras/numero-pedido", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: pedidoId, numeroPedido: nuevo }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "No se pudo guardar");
      onGuardado(d.numeroPedido);
      setEditando(false);
      toast.success(`Nº de pedido de ${pedidoId} actualizado`);
    } catch (e) {
      // lo escrito no se pierde: se puede volver a intentar
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setValor(numero); setEditando(true); }}
        title="Clic para editar el nº de pedido"
        aria-label={`Editar el nº de pedido de ${pedidoId}`}
        className="group/num -mx-1.5 flex min-h-8 min-w-24 cursor-text items-center gap-1.5 rounded-md border border-transparent px-1.5 text-left hover:border-input hover:bg-background"
      >
        <span>{numero || "—"}</span>
        <Edit2 className="size-3 text-muted-foreground opacity-0 group-hover/num:opacity-100 group-focus-visible/num:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Input
        autoFocus
        value={valor}
        disabled={guardando}
        maxLength={100}
        aria-label={`Nº de pedido de ${pedidoId}`}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") { e.preventDefault(); void guardar(); }
          if (e.key === "Escape") { e.preventDefault(); setEditando(false); }
        }}
        className="h-8 w-48 font-mono text-xs"
      />
      <Button type="button" size="icon-sm" disabled={guardando} onClick={() => void guardar()} aria-label="Guardar" title="Guardar (Enter)">
        <TickCircle className="size-4" />
      </Button>
      <Button type="button" size="icon-sm" variant="outline" disabled={guardando} onClick={() => setEditando(false)} aria-label="Cancelar" title="Cancelar (Esc)">
        <CloseCircle className="size-4" />
      </Button>
    </div>
  );
}
