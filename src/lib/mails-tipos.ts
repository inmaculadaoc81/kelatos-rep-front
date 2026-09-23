export interface TipoCorreo {
  tipo: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  activo: boolean;
  desactivable: boolean;
  enviados: number;
  enviados_hoy: number;
  enviados_7d: number;
  enviados_30d: number;
  fallidos: number;
  omitidos: number;
  ultimo: string | null;
  ultimo_omitido: string | null;
  actualizado_por: string | null;
  actualizado_en: string | null;
}

export interface TiposCorreoRespuesta {
  ok: boolean;
  tipos: TipoCorreo[];
  categorias: string[];
}

export const ETIQUETA_CATEGORIA: Record<string, string> = {
  automatizacion: "Automatizaciones",
  reparaciones: "Reparaciones",
  presupuestos: "Presupuestos",
  facturacion: "Facturación",
  alquiler: "Alquiler",
  ventas: "Ventas",
  marketing: "Marketing",
  interno: "Internos",
  otros: "Otros",
};
