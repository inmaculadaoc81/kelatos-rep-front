/**
 * Formato del "Número de Pedido" según el proveedor (modal Registrar Pedido
 * de Pieza). Petición del usuario, 2026-09-21: que la casilla admita justo
 * los dígitos de cada tienda y muestre un ejemplo debajo.
 *
 *  - AliExpress: número solo con dígitos. Lo habitual son 16 (p. ej.
 *    3028845013100916), pero hay pedidos de 14 y 15 — se admiten 14–19.
 *  - eBay: 12 dígitos en grupos 2-5-5 con guiones (08-11027-53195).
 *  - Amazon: 17 dígitos en grupos 3-7-7 con guiones (123-1234567-1234567).
 *
 * El resto de proveedores (Asus, Lenovo, MSI, PCComponentes…) no tienen un
 * formato fijo conocido: la casilla queda libre.
 */

export interface FormatoPedido {
  /** Nombre a mostrar en los mensajes. */
  nombre: string;
  /** Explicación corta del formato, para el mensaje de ayuda. */
  descripcion: string;
  ejemplo: string;
  maxLength: number;
  /** Deja solo los caracteres válidos y coloca los guiones. */
  formatear: (valor: string) => string;
  /** true si el número (ya formateado) tiene la forma completa correcta. */
  esValido: (valor: string) => boolean;
}

function soloDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

/** Agrupa dígitos en bloques con guiones sin dejar un guion colgando. */
function agrupar(digitos: string, tamanos: number[]): string {
  const partes: string[] = [];
  let i = 0;
  for (const t of tamanos) {
    if (i >= digitos.length) break;
    partes.push(digitos.slice(i, i + t));
    i += t;
  }
  return partes.join("-");
}

const ALIEXPRESS: FormatoPedido = {
  nombre: "AliExpress",
  descripcion: "solo dígitos, normalmente 16",
  ejemplo: "3028845013100916",
  maxLength: 19,
  formatear: (v) => soloDigitos(v).slice(0, 19),
  esValido: (v) => /^\d{14,19}$/.test(v),
};

const EBAY: FormatoPedido = {
  nombre: "eBay",
  descripcion: "12 dígitos con guiones (2-5-5)",
  ejemplo: "08-11027-53195",
  maxLength: 14,
  formatear: (v) => agrupar(soloDigitos(v).slice(0, 12), [2, 5, 5]),
  esValido: (v) => /^\d{2}-\d{5}-\d{5}$/.test(v),
};

const AMAZON: FormatoPedido = {
  nombre: "Amazon",
  descripcion: "17 dígitos con guiones (3-7-7)",
  ejemplo: "404-1234567-1234567",
  maxLength: 19,
  formatear: (v) => agrupar(soloDigitos(v).slice(0, 17), [3, 7, 7]),
  esValido: (v) => /^\d{3}-\d{7}-\d{7}$/.test(v),
};

/** true si el proveedor es el comodín "Otro" del catálogo (el nombre real se escribe aparte). */
export function esProveedorOtro(nombreProveedor: string | undefined | null): boolean {
  return (nombreProveedor || "").trim().toLowerCase() === "otro";
}

/** Formato del número de pedido para un proveedor, o null si no tiene uno fijo. */
export function formatoPedidoDe(nombreProveedor: string | undefined | null): FormatoPedido | null {
  const n = (nombreProveedor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
  if (n.includes("aliexpress")) return ALIEXPRESS;
  if (n.includes("ebay")) return EBAY;
  if (n.includes("amazon")) return AMAZON;
  return null;
}
