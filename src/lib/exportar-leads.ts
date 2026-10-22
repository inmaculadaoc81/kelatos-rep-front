import { nombreCategoria, nombreEtapa, nombreOrigen, type Lead } from "@/lib/crm";

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "");
const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

/** Descarga los leads como CSV listo para Excel (separador «;», con BOM para que respete las tildes). */
export function descargarCsvLeads(leads: Lead[], nombreArchivo: string) {
  const cabecera = ["ID", "Nombre", "Teléfono", "Correo", "Canal", "Línea o agente", "Número al que contactó", "Clasificación", "Etapa", "Responsable", "Valor estimado", "Próxima acción", "Fecha de la acción", "Primer contacto", "Último contacto", "Notas"];
  const filas = leads.map((l) => [
    l.id, l.nombre, l.telefono, l.email, nombreOrigen(l.origen), l.bandeja_nombre, l.numero_destino, l.categoria ? nombreCategoria(l.categoria) : "", nombreEtapa(l.etapa),
    l.responsable, l.valor_estimado, l.proxima_accion, l.proxima_accion_fecha, fecha(l.creado_en), fecha(l.ultimo_contacto), l.notas,
  ]);
  const csv = "﻿" + [cabecera, ...filas].map((f) => f.map(celda).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombreArchivo}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
