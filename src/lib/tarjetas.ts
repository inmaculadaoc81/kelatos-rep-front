/**
 * Vista "Tarjetas" (Facturación): parte diario de lo vendido con tarjeta
 * (física + virtual, sumadas en una sola cifra) según el sistema, con una
 * celda editable para anotar lo que confirma el banco. Hermana de
 * "Efectivo" (lib/efectivo.ts) a nivel de día, no de movimiento individual
 * — reutiliza segunSistemaPorDia() de lib/tpv.ts para el cálculo del
 * sistema (misma fuente de datos, solo se combinan "tarjeta" y
 * "tarjeta_virtual" en una cifra). Petición del usuario, 2026-10-10.
 */
import { FacturaCliente } from "@/lib/facturas-cliente";
import { segunSistemaPorDia } from "@/lib/tpv";

export interface TarjetasImporteApi {
  id: number | string;
  fecha: string;
  importe_banco: number;
  notas: string;
  usuario: string;
  creado_en: string;
  actualizado_en: string;
  actualizado_por: string | null;
}

const TIMEZONE = "Europe/Madrid";

export function diaMadrid(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("sv-SE", { timeZone: TIMEZONE });
}

export function hoyMadrid(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TIMEZONE });
}

/** Según el sistema, cuánto se cobró cada día en tarjeta (física + virtual
    sumadas) — reduce el desglose por método de segunSistemaPorDia() a una
    sola cifra por día. */
export function vendidoConTarjetaPorDia(facturas: FacturaCliente[]): Record<string, number> {
  const porMetodo = segunSistemaPorDia(facturas);
  const out: Record<string, number> = {};
  for (const [dia, metodos] of Object.entries(porMetodo)) {
    const total = (metodos.tarjeta || 0) + (metodos.tarjeta_virtual || 0);
    if (total !== 0) out[dia] = Math.round(total * 100) / 100;
  }
  return out;
}
