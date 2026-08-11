import {
  AddCircle,
  TickCircle,
  CloseCircle,
  DocumentText,
  Edit2,
  Trash,
  Send2,
  Box,
  Box1,
  Warning2,
  RotateLeft,
  Truck,
  Receipt,
  Wallet,
  Clock,
  Setting2,
  Personalcard,
  type Icon,
} from "@/lib/icons";

/**
 * Traduce el código interno de kelatos_app.historial.tipo (snake_case,
 * pensado para logs/debug) a algo presentable en la pestaña "Historial"
 * del detalle de reparación: icono + color por categoría. La propia
 * `descripcion` del evento ya es una frase completa en español (ej.
 * "Anticipo registrado. Nº 1-004723. Importe: 65.00€"), así que el tipo
 * ya no necesita mostrarse como texto — solo informa qué icono/color usar.
 */
export interface MetaEventoHistorial {
  icon: Icon;
  clase: string;
}

const NEUTRO: MetaEventoHistorial = { icon: Clock, clase: "bg-muted text-muted-foreground" };

const MAPA: Record<string, MetaEventoHistorial> = {
  entrada: { icon: AddCircle, clase: "bg-sky-500/10 text-sky-600" },
  creacion: { icon: AddCircle, clase: "bg-sky-500/10 text-sky-600" },
  recepcion_confirmada: { icon: TickCircle, clase: "bg-sky-500/10 text-sky-600" },

  presupuesto_creado: { icon: DocumentText, clase: "bg-violet-500/10 text-violet-600" },
  presupuesto_actualizado: { icon: Edit2, clase: "bg-violet-500/10 text-violet-600" },
  presupuesto_eliminado: { icon: Trash, clase: "bg-violet-500/10 text-violet-600" },
  presupuestos_obsoletos: { icon: Trash, clase: "bg-slate-500/10 text-slate-600" },
  pieza_presupuesto_creada: { icon: Box, clase: "bg-violet-500/10 text-violet-600" },
  pieza_presupuesto_actualizada: { icon: Box, clase: "bg-violet-500/10 text-violet-600" },
  pieza_presupuesto_eliminada: { icon: Box, clase: "bg-violet-500/10 text-violet-600" },
  presupuesto_enviado: { icon: Send2, clase: "bg-indigo-500/10 text-indigo-600" },
  presupuesto_aceptado: { icon: TickCircle, clase: "bg-emerald-500/10 text-emerald-600" },
  presupuesto_rechazado: { icon: CloseCircle, clase: "bg-rose-500/10 text-rose-600" },
  presupuesto_anulado: { icon: CloseCircle, clase: "bg-slate-500/10 text-slate-600" },

  pedido_registrado: { icon: Box1, clase: "bg-amber-500/10 text-amber-600" },
  pedido_estado: { icon: Box1, clase: "bg-amber-500/10 text-amber-600" },
  problema_pieza: { icon: Warning2, clase: "bg-amber-500/10 text-amber-600" },

  cambio_estado: { icon: RotateLeft, clase: "bg-slate-500/10 text-slate-600" },
  estado_anterior_guardado: { icon: Clock, clase: "bg-slate-500/10 text-slate-600" },
  sin_reparacion_sin_pieza: { icon: CloseCircle, clase: "bg-rose-500/10 text-rose-600" },
  deshacer_sin_reparacion: { icon: RotateLeft, clase: "bg-slate-500/10 text-slate-600" },
  revertir_abandonado: { icon: RotateLeft, clase: "bg-slate-500/10 text-slate-600" },
  formulario_rechazado: { icon: CloseCircle, clase: "bg-rose-500/10 text-rose-600" },

  entrega: { icon: Truck, clase: "bg-green-500/10 text-green-600" },
  equipo_recogido: { icon: TickCircle, clase: "bg-green-500/10 text-green-600" },
  recogida_estado_actualizado: { icon: Truck, clase: "bg-green-500/10 text-green-600" },
  firma_recogida_registrada: { icon: Edit2, clase: "bg-green-500/10 text-green-600" },
  reciclaje: { icon: Trash, clase: "bg-slate-500/10 text-slate-600" },

  factura_entrega: { icon: Receipt, clase: "bg-teal-500/10 text-teal-600" },
  factura_revision: { icon: Receipt, clase: "bg-teal-500/10 text-teal-600" },
  factura_rectificativa: { icon: Receipt, clase: "bg-teal-500/10 text-teal-600" },
  factura_corregida: { icon: Receipt, clase: "bg-teal-500/10 text-teal-600" },
  anticipo_registrado: { icon: Wallet, clase: "bg-teal-500/10 text-teal-600" },

  observacion: { icon: Edit2, clase: "bg-slate-500/10 text-slate-600" },

  reparacion_finalizada: { icon: TickCircle, clase: "bg-green-500/10 text-green-600" },
  actualizacion_equipo: { icon: Setting2, clase: "bg-blue-500/10 text-blue-600" },
  actualizacion_cliente: { icon: Personalcard, clase: "bg-blue-500/10 text-blue-600" },
};

export function derivarEventoHistorial(tipo: string): MetaEventoHistorial {
  return MAPA[tipo] || NEUTRO;
}
