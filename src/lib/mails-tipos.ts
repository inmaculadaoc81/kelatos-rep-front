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
  tiene_plantilla: boolean;
}

export interface DetalleTipoCorreo {
  tipo: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  activo: boolean;
  plantilla_js: string | null;
  plantilla_datos_prueba: Record<string, unknown> | null;
  plantilla_actualizada_en: string | null;
  plantilla_actualizada_por: string | null;
}

export interface TiposCorreoRespuesta {
  ok: boolean;
  tipos: TipoCorreo[];
  categorias: string[];
}

export const ETIQUETA_CATEGORIA: Record<string, string> = {
  marketing: "Marketing",
  otros_servicios: "Otros servicios",
};
