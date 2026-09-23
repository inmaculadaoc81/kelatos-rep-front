"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { METODOS_PAGO, BANCOS } from "./factura-acciones-tabs";

/**
 * Componente compartido de "forma de pago", con soporte de Multiforma
 * (repartir el total entre 2 formas de pago distintas). Generaliza lo que
 * antes vivía solo en nueva-factura-manual-dialog.tsx (petición del
 * usuario, 2026-09-23: "que esté en todas las facturas... y en tickets",
 * ampliando la implementación aislada de 2026-09-22 "por el momento
 * añádela a factura manual, luego lo pruebo y lo implementamos en todos
 * lados").
 *
 * Dos campos nuevos respecto a la versión original de Factura Manual:
 * - `referencia`: aparece cuando el método es "transferencia", igual que
 *   `banco` aparece para "tarjeta" (petición del usuario: "cuando se
 *   selecciona transferencia [debe salir] un campo más").
 * - Validación reforzada: cada importe de Multiforma debe ser > 0 por sí
 *   solo, no basta con que la SUMA cuadre (antes se podía dejar un 0 de
 *   relleno mientras el otro cubriera el total sin que eso se marcara
 *   como error de ese campo — petición del usuario: "que cada campo sea
 *   obligatorio").
 */

export const METODO_MULTIFORMA = "multiforma";

export type DesgloseFormaPago = { forma: string; monto: number; banco?: string; referencia?: string };

export type ValorFormaPago = {
  metodo: string;
  banco: string;
  referencia: string;
  desglose: [DesgloseFormaPago, DesgloseFormaPago];
};

export function valorFormaPagoVacio(): ValorFormaPago {
  return { metodo: "", banco: "", referencia: "", desglose: [{ forma: "", monto: 0 }, { forma: "", monto: 0 }] };
}

function redondear(n: number) {
  return Math.round(n * 100) / 100;
}

/** Devuelve el mensaje de error o null si todo está completo — cada
    diálogo la llama en su propio submit, misma regla en todos lados.
    `total` puede venir undefined en algún tab de devolución/rectificativa
    que no calcula un importe propio (el backend lo deriva del documento
    original) — en ese caso se valida todo salvo el cuadre de la suma. */
export function validarFormaPago(valor: ValorFormaPago, total?: number): string | null {
  if (!valor.metodo) return "Selecciona la forma de pago";
  if (valor.metodo === "tarjeta" && !valor.banco) return "Selecciona el banco para tarjeta bancaria";
  if (valor.metodo === "transferencia" && !valor.referencia.trim()) return "Indica la referencia de la transferencia";

  if (valor.metodo === METODO_MULTIFORMA) {
    const [a, b] = valor.desglose;
    if (!a.forma || !b.forma) return "Elige las 2 formas de pago del desglose";
    if (a.forma === "tarjeta" && !a.banco) return "Selecciona el banco de la primera forma de pago";
    if (b.forma === "tarjeta" && !b.banco) return "Selecciona el banco de la segunda forma de pago";
    if (a.forma === "transferencia" && !a.referencia?.trim()) return "Indica la referencia de la primera forma de pago";
    if (b.forma === "transferencia" && !b.referencia?.trim()) return "Indica la referencia de la segunda forma de pago";
    if (!(a.monto > 0)) return "El importe de la primera forma de pago debe ser mayor que 0";
    if (!(b.monto > 0)) return "El importe de la segunda forma de pago debe ser mayor que 0";
    if (total !== undefined) {
      const suma = redondear(a.monto + b.monto);
      const totalRedondeado = redondear(total);
      if (Math.abs(suma - totalRedondeado) >= 0.01) {
        return `La suma del desglose (${suma.toFixed(2)} €) no coincide con el total de la factura (${totalRedondeado.toFixed(2)} €)`;
      }
    }
  }
  return null;
}

/** Traduce el valor del selector a lo que espera el backend: forma_pago
    se manda como el valor plano ("multiforma" incluido, nunca el
    desglose — así el PDF solo imprime una forma de pago), banco/
    referencia solo si el método activo los usa, y formaPagoDesglose solo
    cuando el método es multiforma (mismo criterio que ya usaba Factura
    Manual, migración 110). */
export function formaPagoParaPayload(valor: ValorFormaPago) {
  return {
    formaPago: valor.metodo,
    banco: valor.metodo === "tarjeta" ? valor.banco : "",
    referencia: valor.metodo === "transferencia" ? valor.referencia.trim() : "",
    formaPagoDesglose: valor.metodo === METODO_MULTIFORMA
      ? valor.desglose.map((d) => ({
          forma: d.forma,
          monto: d.monto,
          banco: d.forma === "tarjeta" ? d.banco : undefined,
          referencia: d.forma === "transferencia" ? d.referencia : undefined,
        }))
      : undefined,
  };
}

function actualizarDesglose(valor: ValorFormaPago, idx: 0 | 1, cambios: Partial<DesgloseFormaPago>): ValorFormaPago {
  const desglose: [DesgloseFormaPago, DesgloseFormaPago] = [...valor.desglose] as [DesgloseFormaPago, DesgloseFormaPago];
  desglose[idx] = { ...desglose[idx], ...cambios };
  return { ...valor, desglose };
}

function SubFormaPago({
  etiqueta, entrada, onChange, disabled,
}: {
  etiqueta: string;
  entrada: DesgloseFormaPago;
  onChange: (cambios: Partial<DesgloseFormaPago>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-40 flex-1 space-y-1.5 rounded-md border bg-card p-2">
      <Label className="text-[11px] text-muted-foreground">{etiqueta}</Label>
      <Select value={entrada.forma} onValueChange={(v) => onChange({ forma: v || "", banco: "", referencia: "" })} disabled={disabled}>
        <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
        <SelectContent>
          {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {entrada.forma === "tarjeta" && (
        <Select value={entrada.banco || ""} onValueChange={(v) => onChange({ banco: v || "" })} disabled={disabled}>
          <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
          <SelectContent>
            {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {entrada.forma === "transferencia" && (
        <Input
          placeholder="Referencia / justificante"
          value={entrada.referencia || ""}
          onChange={(e) => onChange({ referencia: e.target.value })}
          disabled={disabled}
        />
      )}
      <Input
        type="number" min={0} step="0.01" placeholder="Importe"
        value={entrada.monto || ""} onChange={(e) => onChange({ monto: parseFloat(e.target.value) || 0 })}
        disabled={disabled}
      />
    </div>
  );
}

export function SelectorFormaPago({
  value, onChange, total, disabled, etiqueta = "Forma de pago", metodos = METODOS_PAGO, className,
}: {
  value: ValorFormaPago;
  onChange: (valor: ValorFormaPago) => void;
  /** Total del documento — solo se usa para el aviso de cuadre en vivo bajo el desglose. Si no se conoce (algún tab de devolución que no calcula su propio importe), se omite el aviso de cuadre. */
  total?: number;
  disabled?: boolean;
  etiqueta?: string;
  /** Lista de métodos del selector principal (p.ej. METODOS_PAGO_RECT con Redsys en flujos de rectificativa). Los sub-selectores de Multiforma siempre usan METODOS_PAGO. */
  metodos?: { value: string; label: string }[];
  className?: string;
}) {
  const esMultiforma = value.metodo === METODO_MULTIFORMA;
  const [a, b] = value.desglose;
  const suma = redondear(a.monto + b.monto);
  const totalRedondeado = total !== undefined ? redondear(total) : undefined;
  const coincide = totalRedondeado === undefined || Math.abs(suma - totalRedondeado) < 0.01;

  function setMetodo(v: string | null) {
    onChange({
      metodo: v || "",
      banco: "",
      referencia: "",
      desglose: v === METODO_MULTIFORMA ? value.desglose : [{ forma: "", monto: 0 }, { forma: "", monto: 0 }],
    });
  }

  return (
    <div className={`space-y-1 ${esMultiforma ? "sm:col-span-3" : ""} ${className || ""}`}>
      <Label className="text-xs text-muted-foreground">{etiqueta}</Label>
      <div className="flex flex-wrap items-start gap-2">
        <div className="w-full sm:w-auto sm:min-w-44 sm:flex-1">
          <Select value={value.metodo} onValueChange={setMetodo} disabled={disabled}>
            <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
            <SelectContent>
              {metodos.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              <SelectItem value={METODO_MULTIFORMA}>Multiforma (varias formas de pago)</SelectItem>
            </SelectContent>
          </Select>
          {value.metodo === "tarjeta" && (
            <Select value={value.banco} onValueChange={(v) => onChange({ ...value, banco: v || "" })} disabled={disabled}>
              <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
              <SelectContent>
                {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {value.metodo === "transferencia" && (
            <Input
              className="mt-1.5"
              placeholder="Referencia / justificante"
              value={value.referencia}
              onChange={(e) => onChange({ ...value, referencia: e.target.value })}
              disabled={disabled}
            />
          )}
        </div>

        {esMultiforma && (
          <div className="flex flex-1 flex-wrap items-start gap-2">
            <SubFormaPago
              etiqueta="1ª forma de pago"
              entrada={a}
              onChange={(cambios) => onChange(actualizarDesglose(value, 0, cambios))}
              disabled={disabled}
            />
            <SubFormaPago
              etiqueta="2ª forma de pago"
              entrada={b}
              onChange={(cambios) => onChange(actualizarDesglose(value, 1, cambios))}
              disabled={disabled}
            />
          </div>
        )}
      </div>
      {esMultiforma && totalRedondeado !== undefined && (
        <p className={`text-xs font-medium ${coincide ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {coincide
            ? `Suma ${suma.toFixed(2)} € — coincide con el total`
            : `Suma ${suma.toFixed(2)} € de ${totalRedondeado.toFixed(2)} € — no coincide con el total`}
        </p>
      )}
      {esMultiforma && totalRedondeado === undefined && (
        <p className="text-xs font-medium text-muted-foreground">Suma {suma.toFixed(2)} €</p>
      )}
    </div>
  );
}
