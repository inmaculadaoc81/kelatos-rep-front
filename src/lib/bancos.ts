/**
 * Bancos/datáfonos reales de la tienda — fuente única. Se usa tanto para
 * "Tarjeta bancaria" (qué datáfono procesó el cobro) como, desde
 * 2026-10-12, para "Transferencia bancaria" (a qué cuenta llegó), para
 * poder desglosar la vista "Facturación del día" (TPV) banco a banco en
 * vez de en un único total por método. Petición del usuario.
 */
export const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];
