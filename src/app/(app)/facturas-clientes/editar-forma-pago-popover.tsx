"use client";

import { useState } from "react";
import { Edit2 } from "@/lib/icons";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BANCOS } from "@/lib/bancos";
import { FacturaCliente, formaPagoLabel } from "@/lib/facturas-cliente";

const METODOS = [
  { value: "tarjeta", label: "Tarjeta bancaria" },
  { value: "tarjeta_virtual", label: "Tarjeta virtual" },
  { value: "bizum", label: "Bizum" },
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "efectivo", label: "Efectivo" },
];

/** Qué documentos admiten esta corrección todavía — cada combinación
    resuelve, en el backend (FORMA_PAGO_DISPATCH, server.js), a unas
    columnas fijas de forma_pago/banco ya existentes. Alquileres/Facturas
    Manuales y Multiforma quedan fuera por ahora (sin mapeo seguro/sin
    sentido editar un desglose de varias formas con un selector simple). */
function origenSoportado(f: FacturaCliente): string | null {
  if ((f.formaPago || "").trim().toLowerCase() === "multiforma") return null;
  if (f.esVenta) return "venta";
  if (f.esTicketManual) return "ticket_manual";
  if (f.esAlquiler || f.esManual) return null;
  return "reparacion";
}

/**
 * "Forma de pago" clicable (solo admin/superadmin): corrige a mano el dato
 * interno (forma_pago/banco del documento) si alguien se equivocó al
 * cobrar — nunca toca el PDF ya generado ni ningún total/estado. Petición
 * del usuario, 2026-10-12.
 */
export function EditarFormaPagoPopover({ f, onActualizado }: { f: FacturaCliente; onActualizado: (formaPago: string, banco: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [metodo, setMetodo] = useState("");
  const [banco, setBanco] = useState("");
  const [enviando, setEnviando] = useState(false);

  const origen = origenSoportado(f);
  if (!origen) {
    return <span className="text-sm text-muted-foreground">{formaPagoLabel(f)}</span>;
  }

  async function guardar() {
    if (!metodo) return toast.error("Elige una forma de pago");
    if ((metodo === "tarjeta" || metodo === "transferencia") && !banco) return toast.error("Selecciona el banco");
    setEnviando(true);
    try {
      const res = await fetch("/api/facturas-clientes/forma-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origen, entidadId: f.resguardo, tipo: f.tipo, tipoOriginal: f.tipoOriginal, esTicket: !!f.esTicket,
          numeroDocumento: f.numero, formaPago: metodo, banco,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Forma de pago corregida");
      setAbierto(false);
      onActualizado(data.formaPago, data.banco);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Popover
      open={abierto}
      onOpenChange={(o) => {
        if (enviando) return;
        if (o) {
          setMetodo((f.formaPago || "").trim().toLowerCase());
          setBanco(f.banco || "");
        }
        setAbierto(o);
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className="group inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground"
            title="Corregir forma de pago"
          >
            {formaPagoLabel(f)}
            <Edit2 className="size-3 opacity-0 group-hover:opacity-60" />
          </button>
        }
      />
      <PopoverContent className="w-64 p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Corregir forma de pago</p>
        <div className="space-y-2">
          <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); setBanco(""); }}>
            <SelectTrigger className="h-8 w-full"><SelectValue placeholder="Forma de pago" /></SelectTrigger>
            <SelectContent>
              {METODOS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {(metodo === "tarjeta" || metodo === "transferencia") && (
            <Select value={banco} onValueChange={(v) => setBanco(v || "")}>
              <SelectTrigger className="h-8 w-full"><SelectValue placeholder="Banco" /></SelectTrigger>
              <SelectContent>
                {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex justify-end gap-1.5 pt-1">
            <Button size="sm" variant="ghost" disabled={enviando} onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button size="sm" disabled={enviando} onClick={guardar}>{enviando ? "Guardando…" : "Guardar"}</Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Solo cambia el dato interno — la factura/ticket ya generado no se modifica.</p>
      </PopoverContent>
    </Popover>
  );
}
