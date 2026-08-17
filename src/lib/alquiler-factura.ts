/**
 * Reproduce la lógica de liquidación de devolución de alquiler del
 * original (vistas_equipos.html.html: recalcularDevolucion(),
 * devRecalcularAjuste(), devAjFechaChanged(), _calcTarifario()). Sin esto,
 * el operador tenía que calcular a mano el cargo por retraso, la
 * devolución de fianza y el importe de la nueva factura.
 */

export interface Tarifas {
  precioDia: number;
  precioSemana: number;
  precioMes: number;
}

export interface DuracionTarifario {
  meses: number;
  semanas: number;
  dias: number;
  importe: number;
}

/** Reproduce _calcTarifario(): descompone un número de días en
    meses/semanas/días (30/7/1) y calcula el importe con la tarifa dada. */
export function calcularTarifario(diasAbsolutos: number, tarifas: Tarifas): DuracionTarifario {
  const meses = Math.floor(diasAbsolutos / 30);
  const resto = diasAbsolutos % 30;
  const semanas = Math.floor(resto / 7);
  const dias = resto % 7;
  const importe = meses * tarifas.precioMes + semanas * tarifas.precioSemana + dias * tarifas.precioDia;
  return { meses, semanas, dias, importe };
}

/** Reproduce el cálculo de diasDiff/ajusteImporte de recalcularDevolucion():
    positivo = retraso (se descuenta de la fianza), negativo = adelanto (se
    suma a la fianza a devolver). */
export function calcularAjustePorDias(fechaDevolucion: string, fechaFinPrevista: string | null, tarifas: Tarifas): { diasDiferencia: number; ajusteImporte: number } {
  if (!fechaDevolucion || !fechaFinPrevista) return { diasDiferencia: 0, ajusteImporte: 0 };
  const fDev = fechaLocalDesdeIso(fechaDevolucion);
  const fFin = fechaLocalDesdeIso(fechaFinPrevista);
  if (!fDev || !fFin) return { diasDiferencia: 0, ajusteImporte: 0 };
  const msDia = 1000 * 60 * 60 * 24;
  const diasDiferencia = Math.round((fDev.getTime() - fFin.getTime()) / msDia);
  const { importe } = calcularTarifario(Math.abs(diasDiferencia), tarifas);
  return { diasDiferencia, ajusteImporte: diasDiferencia > 0 ? importe : -importe };
}

function fechaLocalDesdeIso(fecha: string): Date | null {
  const str = fecha.slice(0, 10);
  const [anio, mes, dia] = str.split("-").map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

export interface LiquidacionPuntual {
  diasDiferencia: number;
  ajusteImporte: number;
  descuentoDanos: number;
  /** Lo que se devuelve al cliente (nunca negativo). */
  fianzaDevolver: number;
  /** Cuando la fianza no cubre retraso + daños, lo que hay que cobrar de más. */
  cobrarExtra: number;
}

/** Reproduce recalcularDevolucion() para la devolución puntual — la fecha
    de devolución está fijada a la fecha fin prevista, así que en la
    práctica diasDiferencia siempre es 0 aquí; se calcula igual por
    fidelidad con el original y por si alguna vez se permite editarla. */
export function calcularLiquidacionPuntual(fechaDevolucion: string, fechaFinPrevista: string | null, fianzaCobrada: number, descuentoDanos: number, tarifas: Tarifas): LiquidacionPuntual {
  const { diasDiferencia, ajusteImporte } = calcularAjustePorDias(fechaDevolucion, fechaFinPrevista, tarifas);
  const fianzaDevolverRaw = fianzaCobrada - ajusteImporte - descuentoDanos;
  return {
    diasDiferencia,
    ajusteImporte,
    descuentoDanos,
    fianzaDevolver: Math.max(0, fianzaDevolverRaw),
    cobrarExtra: fianzaDevolverRaw < 0 ? Math.abs(fianzaDevolverRaw) : 0,
  };
}

export interface DuracionReal {
  meses: number;
  semanas: number;
  dias: number;
}

/** Reproduce devAjFechaChanged(): cuenta los días completos entre el
    inicio del alquiler y la fecha de devolución real, y los descompone
    en meses/semanas/días para recalcular la factura desde cero.
    Diferencia deliberada frente al original (que no tenía mínimo y daba
    0 días/0€ en una devolución el mismo día): decisión explícita del
    usuario — el coste mínimo es 1 día completo aunque el equipo se
    devuelva el mismo día que se alquiló, aunque hayan sido solo minutos.
    Solo se deja en 0 cuando la fecha de devolución es ANTERIOR al inicio
    (dato inválido — confirmarAjuste() ya bloquea el envío en ese caso). */
export function calcularDuracionDesdeFechas(fechaInicio: string, fechaDevolucion: string): DuracionReal {
  const inicio = fechaLocalDesdeIso(fechaInicio);
  const fin = fechaLocalDesdeIso(fechaDevolucion);
  if (!inicio || !fin) return { meses: 0, semanas: 0, dias: 0 };
  const diffDias = Math.round((fin.getTime() - inicio.getTime()) / 86400000);
  const totalDias = diffDias < 0 ? 0 : Math.max(1, diffDias);
  const { meses, semanas, dias } = calcularTarifario(totalDias, { precioDia: 0, precioSemana: 0, precioMes: 0 });
  return { meses, semanas, dias };
}

export interface LiquidacionAjuste {
  subtotal: number;
  iva: number;
  total: number;
}

/** Reproduce devRecalcularAjuste(): subtotal/IVA/total de la NUEVA factura
    con la duración real (sin fianza ni mensajería — ambas ya facturadas
    en la factura inicial). */
export function calcularLiquidacionAjuste(duracion: DuracionReal, tarifas: Tarifas): LiquidacionAjuste {
  const subtotal = duracion.meses * tarifas.precioMes + duracion.semanas * tarifas.precioSemana + duracion.dias * tarifas.precioDia;
  const iva = Math.round(subtotal * 0.21 * 100) / 100;
  const total = Math.round((subtotal + iva) * 100) / 100;
  return { subtotal, iva, total };
}

// ── Tipos del saga de facturación de alquiler ───────────────────────────

export interface LineaFacturaAlquiler {
  descripcion: string;
  cantidad: number;
  precio: number;
  descuento?: number;
}

export interface ClienteFacturaAlquiler {
  nombre: string;
  direccion: string;
  dni: string;
  telefono: string;
}

/** Cuerpo de POST /api/alquileres/:id/facturas — un único requestId por
    "clic lógico"; si el tipo genera dos documentos, el backend deriva los
    dos requestId hijos de forma determinista a partir de este mismo UUID
    (igual que _derivarUuidHijo() en el original), así un reintento con el
    mismo requestId reutiliza los mismos dos números, nunca un tercero. */
export type SolicitudFacturaAlquiler =
  | {
      tipo: "rectificativa_fianza";
      requestId: string;
      cliente: ClienteFacturaAlquiler;
      formaPago: string;
      banco?: string;
      fianza: number;
      equipoNombre: string;
    }
  | {
      /** Reproduce _apiGenerarDevolucionAlquilerModal() del original — el
          tab "Devolución" del modal genérico de Facturas de Clientes
          (#modalFcAcciones), distinto de "Devolver equipo": anula la
          factura completa del alquiler (líneas negativas por meses/
          semanas/días) en vez de solo la fianza. Comparte las MISMAS
          columnas de rectificativa que rectificativa_fianza/ajuste_*
          (igual que en el original — una sola rectificativa "vigente" a
          la vez por alquiler). */
      tipo: "alquiler_rectificativa";
      requestId: string;
      cliente: ClienteFacturaAlquiler;
      formaPago: string;
      banco?: string;
      /** El modal genérico de Facturas de Clientes (TabDevolucionRectificativo,
          compartido con reparaciones) nunca lo manda — el backend lo deriva de
          equipo_id si falta. */
      equipoNombre?: string;
      motivo?: string;
    }
  | {
      /** Reproduce _apiGenerarFacturaCorregidaAlquiler() del original —
          "¿Generaste la rectificativa por error?" tras alquiler_rectificativa,
          igual que FaseCorregida en reparaciones. Requiere que ya exista una
          rectificativa vigente (numero_factura_rectificativa); el backend
          reescribe meses/semanas/dias del alquiler a partir de las líneas de
          esta corregida, para que un ajuste de duración posterior parta ya
          de los datos corregidos, no de los originales erróneos. */
      tipo: "alquiler_corregida";
      requestId: string;
      cliente: ClienteFacturaAlquiler;
      formaPago: string;
      banco?: string;
      lineas: LineaFacturaAlquiler[];
      estadoFactura?: string;
      equipoNombre?: string;
    }
  | {
      tipo: "ajuste_duracion";
      requestId: string;
      cliente: ClienteFacturaAlquiler;
      formaPago: string;
      banco?: string;
      equipoNombre: string;
      duracionReal: DuracionReal;
      /** Estado de la nueva factura (Cobrada/Pendiente) — si no se manda,
          cae al estado_factura ya guardado en el alquiler. */
      estadoFactura?: string;
    }
  | {
      tipo: "alquiler";
      requestId: string;
      cliente: ClienteFacturaAlquiler;
      formaPago: string;
      banco?: string;
      equipoNombre: string;
      estadoFactura: string;
      /** Portes de mensajería, ya calculados por el cliente (12,40€, o 0 si la duración da derecho a envío gratis) — se añaden como línea normal, igual que el original. */
      envioLinea?: number;
      recogidaLinea?: number;
    };

export interface ResultadoFacturaAlquiler {
  numeroFactura?: string;
  url?: string;
  rectificativa?: { numero: string; url: string };
  nueva?: { numero: string; url: string };
  totalNuevo?: number;
  fianzaDevuelta?: number;
}
