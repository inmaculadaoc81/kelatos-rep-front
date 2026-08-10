/**
 * Verificación del token firmado de FormularioRecogida — replica
 * EXACTAMENTE _validarTokenRecogidaFirmado (backend/Code.js): payload
 * "resguardo.recogida.expiryMillis" en base64url + "." + HMAC-SHA256 hex
 * del payload en texto plano, firmado con KELATOS_RECOGIDA_SIGNING_SECRET
 * (mismo nombre de Script Property en Apps Script — secreto compartido,
 * generado nuevo para esta migración, nunca activado aquí en Apps Script
 * por mí, solo copiado por el usuario).
 */

import crypto from "node:crypto";

// Replica _generarTokenRecogidaFirmado (backend/Code.js) — mismo formato
// de payload y firma que validarTokenRecogida verifica. Generado y
// verificado íntegramente dentro de Next.js: no depende de Apps Script.
export function generarTokenRecogida(resguardo: string, diasValidez = 30): string {
  const secreto = process.env.KELATOS_RECOGIDA_SIGNING_SECRET;
  if (!secreto) throw new Error("KELATOS_RECOGIDA_SIGNING_SECRET no está configurado");

  const expiry = Date.now() + diasValidez * 24 * 60 * 60 * 1000;
  const payload = `${resguardo}.recogida.${expiry}`;
  const firmaHex = crypto.createHmac("sha256", secreto).update(payload).digest("hex");
  return Buffer.from(payload, "utf8").toString("base64url") + "." + firmaHex;
}

export function validarTokenRecogida(resguardo: string, token: string): { valido: boolean; error?: string } {
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
  if (campos[0] !== String(resguardo) || campos[1] !== "recogida") {
    return { valido: false, error: "Token no corresponde a este resguardo" };
  }
  if (Date.now() > Number(campos[2])) return { valido: false, error: "Token expirado" };

  return { valido: true };
}
