// Puerto de app/kiosk/lib/pdf-export.ts (asistencia-app) — mismo diseño
// del PDF, tal cual. La empresa se deja fija (AFFIRMA TECHNOLOGY GROUP
// SL, la misma que ya aparece en tickets/facturas de Kelatos) en vez de
// pedirla a un endpoint: es una única empresa, no tiene sentido montar
// una tabla "company" solo para esto.

const TIPO_LABEL: Record<string, string> = {
  entrada: "Entrada",
  salida_comida: "Sal. Comida",
  vuelta_comida: "Vta. Comida",
  salida: "Salida",
};

const EMPRESA = {
  nombre: "AFFIRMA TECHNOLOGY GROUP SL",
  cif: "B72990443",
  direccion: "Calle Blasco de Garay 63 BJ, Puerta 2",
  ciudad: "Madrid",
  cp: "28015",
  telefono: "918 294 660",
};

export interface RegistroMes {
  fecha: string;
  tipo: string;
  entrada: string;
  salida: string;
  trabajadas: string;
  diferencia: string;
  ok: boolean;
}

export async function exportarRegistrosPdf(params: {
  nombreEmpleado: string;
  mesNombre: string;
  totalMes: string;
  previstoMes: string;
  registros: RegistroMes[];
}): Promise<boolean> {
  const { nombreEmpleado, mesNombre, totalMes, previstoMes, registros } = params;
  if (!registros.length) return false;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  // Cabecera
  doc.setFillColor(248, 248, 249);
  doc.rect(0, 0, 210, 32, "F");
  doc.setDrawColor(228, 228, 231);
  doc.rect(0, 0, 210, 32, "S");
  doc.setTextColor(24, 24, 27);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA.nombre, 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const dir = `${EMPRESA.direccion}, ${EMPRESA.cp} ${EMPRESA.ciudad}`;
  doc.text(dir, 14, 21);
  doc.text(`CIF: ${EMPRESA.cif}   Tel: ${EMPRESA.telefono}`, 14, 28);

  // Título
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Registro de Jornada Laboral", 105, 44, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(113, 113, 122);
  doc.text("RDL 8/2019 - Control de Asistencia", 105, 51, { align: "center" });

  // Caja info empleado
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(228, 228, 231);
  doc.setFillColor(244, 244, 245);
  doc.roundedRect(14, 56, 182, 16, 2, 2, "FD");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Empleado: ", 18, 65);
  doc.setFont("helvetica", "normal");
  doc.text(nombreEmpleado, 45, 65);
  doc.setFont("helvetica", "bold");
  doc.text("Periodo: ", 120, 65);
  doc.setFont("helvetica", "normal");
  doc.text(mesNombre, 140, 65);

  // Resumen totales
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, 76, 85, 12, 2, 2, "F");
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(111, 76, 85, 12, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text("TOTAL TRABAJADO", 18, 82);
  doc.text("TOTAL PREVISTO", 115, 82);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text(totalMes, 18, 88);
  doc.setTextColor(37, 99, 235);
  doc.text(previstoMes, 115, 88);

  // Tabla
  doc.setTextColor(0, 0, 0);
  const startY = 100;
  const cols = ["Fecha", "Tipo", "Entrada", "Salida", "Trabajado", "Dif."];
  const colW = [26, 28, 20, 20, 28, 24];
  let x = 14;

  doc.setFillColor(244, 244, 245);
  doc.rect(14, startY - 5, 182, 8, "F");
  doc.setDrawColor(228, 228, 231);
  doc.rect(14, startY - 5, 182, 8, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(24, 24, 27);
  for (let c = 0; c < cols.length; c++) {
    doc.text(cols[c], x + 2, startY + 1);
    x += colW[c];
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let y = startY + 8;
  for (let i = 0; i < registros.length; i++) {
    const r = registros[i];
    if (y > 272) {
      doc.addPage();
      y = 20;
    }
    if (i % 2 === 0) {
      doc.setFillColor(249, 249, 250);
      doc.rect(14, y - 4, 182, 7, "F");
    }
    const tipoLabel = TIPO_LABEL[r.tipo] ?? r.tipo;
    const row = [r.fecha, tipoLabel, r.entrada, r.salida, r.trabajadas, r.diferencia];
    x = 14;
    for (let c = 0; c < row.length; c++) {
      if (c === 5) {
        doc.setTextColor(r.ok ? 22 : 220, r.ok ? 163 : 38, r.ok ? 74 : 38);
      } else {
        doc.setTextColor(0, 0, 0);
      }
      doc.text(String(row[c] || "-"), x + 2, y + 1);
      x += colW[c];
    }
    y += 7;
  }

  // Pie de página
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(228, 228, 231);
  doc.line(14, y + 5, 196, y + 5);
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  const fechaExport = new Date().toLocaleDateString("es-ES");
  doc.text(`Generado el ${fechaExport} | Conforme al art. 34.9 ET y RDL 8/2019`, 14, y + 11);
  doc.text("Pagina 1", 196, y + 11, { align: "right" });

  doc.save(`registro_${nombreEmpleado.replace(/ /g, "_")}_${mesNombre.replace(/ /g, "_")}.pdf`);
  return true;
}
