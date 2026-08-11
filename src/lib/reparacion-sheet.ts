/**
 * Tipos y lógica compartidos por el Sheet de "Nueva Reparación" /
 * "Confirmar formulario pendiente" — mismo panel que en el original
 * (Index.html, #modalNuevaReparacion / abrirModalConfirmarFormulario),
 * reconstruido aquí como un único componente reutilizado en los dos
 * modos, igual que hacía el original.
 */

import { DatosCintasTipos } from "./reparaciones";
import { PiezaForm, TipoPieza } from "./presupuesto-form";

export type TipoRecepcion = "LOCAL" | "ENVIO";
/** "aceptar_ahora" no es un estado real de la reparación — es una señal para crear y aceptar un presupuesto en el acto (ver _crearYAceptarPresupuestoTx en server.js). */
export type EstadoInicial = "Presupuesto Pendiente" | "Garantía" | "aceptar_ahora";

export const CINTAS_VACIAS: DatosCintasTipos = { vhs: 0, vhsc: 0, beta: 0, minidv: 0, "8mm": 0, cassette: 0, bobina: 0 };

/** Presupuesto inmediato ("Aceptar ahora") — subconjunto de piezas cuando no es cintas; solo elaboradoPor/descripcion cuando sí lo es (igual que esCintasAceptarAhora en el original: sin mano de obra ni piezas, el precio ya viene del cálculo de cintas). */
export interface DatosPresupuestoInmediato {
  elaboradoPor: string;
  descripcion: string;
  notas: string;
  manoObra: number;
  tipoPieza: TipoPieza;
  diasEntrega: number;
  piezas: PiezaForm[];
}

export function presupuestoInmediatoVacio(): DatosPresupuestoInmediato {
  return { elaboradoPor: "", descripcion: "", notas: "", manoObra: 0, tipoPieza: "no", diasEntrega: 0, piezas: [] };
}

export interface DatosReparacionSheet {
  fechaRecepcion: string;
  clienteNombre: string;
  telPrefijo: string;
  clienteTelefono: string;
  noTieneTelefono: boolean;
  clienteEmail: string;
  noTieneEmail: boolean;
  dniCif: string;
  direccionEnvio: string;
  esCintas: boolean;
  equipoModelo: string;
  sintoma: string;
  cintas: DatosCintasTipos;
  precioPorCintaPersonalizado: number | "";
  tipoRecepcion: TipoRecepcion;
  entregaMensajeria: boolean;
  estado: EstadoInicial;
  necesitaPieza: boolean;
  presupuestoInmediato: DatosPresupuestoInmediato;
  revisionPagada: "" | "corresponde" | "no_corresponde";
  dejaCargador: "" | "si" | "no";
}

export function datosSheetVacios(): DatosReparacionSheet {
  return {
    fechaRecepcion: new Date().toISOString().slice(0, 10),
    clienteNombre: "",
    telPrefijo: "+34",
    clienteTelefono: "",
    noTieneTelefono: false,
    clienteEmail: "",
    noTieneEmail: false,
    dniCif: "",
    direccionEnvio: "",
    esCintas: false,
    equipoModelo: "",
    sintoma: "",
    cintas: { ...CINTAS_VACIAS },
    precioPorCintaPersonalizado: "",
    tipoRecepcion: "LOCAL",
    entregaMensajeria: false,
    estado: "Presupuesto Pendiente",
    necesitaPieza: false,
    presupuestoInmediato: presupuestoInmediatoVacio(),
    revisionPagada: "",
    dejaCargador: "",
  };
}

/**
 * Reproduce calcularTotalCintas() de Index.html: tarifa escalonada por
 * cantidad de cintas normales (1-4=15€, 5-9=12€, 10-29=10€, 30+=8€),
 * bobina siempre a 20€ fijo al margen del tramo. Un precio personalizado
 * (>0) anula la tarifa automática para las cintas normales — la bobina
 * sigue a 20€ fijo incluso con precio personalizado, igual que el original.
 */
export function calcularTotalCintas(cintas: DatosCintasTipos, precioPersonalizado: number | "") {
  const PRECIO_BOBINA = 20;
  const totalNormal = cintas.vhs + cintas.vhsc + cintas.beta + cintas.minidv + cintas["8mm"] + cintas.cassette;
  const total = totalNormal + cintas.bobina;

  let precioPorCinta = 0;
  if (totalNormal >= 30) precioPorCinta = 8;
  else if (totalNormal >= 10) precioPorCinta = 10;
  else if (totalNormal >= 5) precioPorCinta = 12;
  else if (totalNormal >= 1) precioPorCinta = 15;

  if (typeof precioPersonalizado === "number" && precioPersonalizado > 0) precioPorCinta = precioPersonalizado;

  const totalSinIva = totalNormal * precioPorCinta + cintas.bobina * PRECIO_BOBINA;
  // precioUnitario "equivalente": el backend solo acepta un precio por
  // cinta uniforme (total*precioUnitario*1.21, ver server.js) — se
  // deriva para que el total resultante sea el mismo que el cálculo
  // fiel por tramos + bobina fija.
  const precioUnitarioEquivalente = total > 0 ? totalSinIva / total : 0;

  return { total, totalNormal, precioPorCinta, precioBobina: PRECIO_BOBINA, totalSinIva, totalConIva: totalSinIva * 1.21, precioUnitarioEquivalente };
}
