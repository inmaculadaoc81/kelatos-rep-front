import type { SheetData } from "write-excel-file/browser";
import { labelDestino, labelEstadoPresupuesto, labelMotivo, type PuntoLimpioItem } from "@/lib/punto-limpio";

const NEGRITA = { fontWeight: "bold" as const };
const FORMATO_EURO = "#,##0.00 €";

type Celda = string | number | { value: string | number | null; type?: typeof Number | typeof String; format?: string; fontWeight?: "bold" };

function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}
function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
const cab = (t: string): Celda => ({ value: t, ...NEGRITA });

async function guardar(filas: SheetData, anchos: number[], nombre: string) {
  // Import dinámico: write-excel-file/browser usa un Web Worker y no debe entrar en el bundle del servidor.
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(filas, { columns: anchos.map((width) => ({ width })) }).toFile(nombre);
}

export function nombreFichero(base: string): string {
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  return `${base}-${hoy}.xlsx`;
}

/** Excel de «Equipos en reciclaje» (lo que se ve en pantalla, con el filtro aplicado). */
export async function descargarXlsxEquiposPuntoLimpio(items: PuntoLimpioItem[]) {
  const filas: Celda[][] = [[
    cab("Resguardo"), cab("Fecha"), cab("Cliente"), cab("Teléfono"), cab("Equipo"), cab("Estado"),
    cab("Nº presupuesto"), cab("Estado presupuesto"), cab("Total presupuesto"), cab("Concepto"), cab("Motivo de rechazo"),
    cab("Motivo"), cab("Detalle del motivo"), cab("Destino"), cab("Registrado por"), cab("Registrado el"),
  ]];
  for (const i of items) {
    const p = i.presupuesto;
    filas.push([
      i.resguardo,
      fechaCorta(i.fechaEntrega),
      i.clienteNombre,
      i.clienteTelefono,
      i.equipoModelo,
      i.estado,
      p ? `${p.numero}${p.version ? ` v${p.version}` : ""}` : "",
      p ? labelEstadoPresupuesto(p.estado) : "",
      p && p.total !== null ? { value: p.total, type: Number, format: FORMATO_EURO } : "",
      p?.concepto ?? "",
      p?.motivoRechazo ?? "",
      labelMotivo(i.motivo),
      i.motivoDetalle,
      labelDestino(i.destino),
      i.registradoPor,
      fechaHora(i.registradoEn),
    ]);
  }
  await guardar(filas as SheetData, [11, 12, 26, 15, 30, 18, 16, 16, 14, 40, 30, 34, 34, 18, 26, 18], nombreFichero("punto-limpio-equipos"));
}

export interface SolicitudExcel {
  referencia: string; creado_en: string; estado: string; nombre: string; email: string; telefono: string; tipo_solicitante: string | null; empresa: string | null;
  contacto_preferido: string | null; entrega: string | null; resumen: string | null; notas: string | null; atendido_por: string | null; atendido_en: string | null; adjuntos: number;
}

/** Excel de «Solicitudes web» (lo que se ve en pantalla, con el filtro aplicado). */
export async function descargarXlsxSolicitudesWeb(filas: SolicitudExcel[], etiquetaEstado: (e: string) => string) {
  const hoja: Celda[][] = [[
    cab("Referencia"), cab("Recibida"), cab("Estado"), cab("Nombre"), cab("Empresa"), cab("Tipo de solicitante"), cab("Correo"), cab("Teléfono"),
    cab("Contacto preferido"), cab("Qué quiere reciclar"), cab("Entrega"), cab("Adjuntos"), cab("Notas internas"), cab("Atendida por"), cab("Atendida el"),
  ]];
  for (const f of filas) {
    hoja.push([
      f.referencia, fechaHora(f.creado_en), etiquetaEstado(f.estado), f.nombre, f.empresa ?? "", f.tipo_solicitante ?? "", f.email, f.telefono,
      f.contacto_preferido ?? "", f.resumen ?? "", f.entrega ?? "", { value: f.adjuntos, type: Number }, f.notas ?? "", f.atendido_por ?? "", fechaHora(f.atendido_en),
    ]);
  }
  await guardar(hoja as SheetData, [14, 18, 20, 26, 24, 18, 30, 16, 18, 44, 30, 10, 36, 22, 18], nombreFichero("punto-limpio-solicitudes"));
}
