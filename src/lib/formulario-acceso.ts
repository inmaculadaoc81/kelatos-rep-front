/**
 * Código de acceso al formulario público — réplica de
 * generarCodigoAccesoFormulario/obtenerCodigoAccesoActual/
 * validarCodigoAccesoFormulario (FormularioCliente.js). Ver migración
 * 021_formulario_codigos_acceso.sql (kelatos-rep-back) para el porqué de
 * la tabla en vez de las Script Properties del original.
 */

export interface CodigoAcceso {
  codigo: string;
  visitaId: number;
  expiraEn: string;
  generadoEn: string;
}

interface FilaCodigoAccesoSql {
  codigo: string;
  visita_id: string | number;
  expira_en: string;
  generado_en?: string;
}

export function mapearCodigoAcceso(row: FilaCodigoAccesoSql): CodigoAcceso {
  return {
    codigo: row.codigo,
    visitaId: Number(row.visita_id),
    expiraEn: row.expira_en,
    generadoEn: row.generado_en || "",
  };
}
