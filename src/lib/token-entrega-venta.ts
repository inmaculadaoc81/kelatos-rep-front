/**
 * Verificación del token firmado del formulario público de entrega de
 * "Pedidos de piezas" (Ventas) — mismo diseño que token-recogida.ts
 * (reparaciones), payload "ventaId.entrega_venta.expiryMillis" en
 * base64url + "." + HMAC-SHA256 hex del payload en texto plano, firmado
 * con el mismo secreto compartido KELATOS_RECOGIDA_SIGNING_SECRET. El
 * literal "entrega_venta" en el payload (distinto de "recogida") impide
 * que un enlace de recogida de reparación se reutilice para confirmar la
 * entrega de una venta, o viceversa.
 */

import crypto from "node:crypto";

export function generarTokenEntregaVenta(ventaId: string, diasValidez = 30): string {
  const secreto = process.env.KELATOS_RECOGIDA_SIGNING_SECRET;
  if (!secreto) throw new Error("KELATOS_RECOGIDA_SIGNING_SECRET no está configurado");

  const expiry = Date.now() + diasValidez * 24 * 60 * 60 * 1000;
  const payload = `${ventaId}.entrega_venta.${expiry}`;
  const firmaHex = crypto.createHmac("sha256", secreto).update(payload).digest("hex");
  return Buffer.from(payload, "utf8").toString("base64url") + "." + firmaHex;
}

export function validarTokenEntregaVenta(ventaId: string, token: string): { valido: boolean; error?: string } {
  const secreto = process.env.KELATOS_RECOGIDA_SIGNING_SECRET;
  if (!secreto) return { valido: false, error: "Firma de enlaces no configurada" };

  const partes = String(token || "").split(".");
  if (partes.length !== 2) return { valido: false, error: "Token con formato inválido" };

  let payloadStr: string;
  try {
    payloadStr = Buffer.from(partes[0], "base64url").toString("utf8");
  } catch {
    return { valido: false, error: "Token con formato inválido" };
  }

  const firmaEsperada = crypto.createHmac("sha256", secreto).update(payloadStr).digest("hex");
  if (firmaEsperada !== partes[1]) return { valido: false, error: "Firma de token inválida" };

  const campos = payloadStr.split(".");
  if (campos[0] !== String(ventaId) || campos[1] !== "entrega_venta") {
    return { valido: false, error: "Token no corresponde a este pedido" };
  }
  if (Date.now() > Number(campos[2])) return { valido: false, error: "Token expirado" };

  return { valido: true };
}
