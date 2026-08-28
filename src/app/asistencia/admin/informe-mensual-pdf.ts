// Puerto de lib/reports/informe-mensual.ts (asistencia-app, renderInformeMensualHtml)
// — mismo contenido/formato oficial ("Registro de Jornada Laboral", RDL
// 8/2019, firma del empleado), pero generado con jsPDF (misma librería ya
// usada en el PDF del kiosco) en vez de un renderizador HTML->PDF con
// Puppeteer, para no añadir esa dependencia pesada solo para esto.

export interface FilaInforme {
  fecha: string;
  tipo: string;
  horaEntrada: string;
  horaSalida: string;
  totalHoras: string;
  firmado: string;
}

export interface GrupoInforme {
  employeeId: number;
  nombre: string;
  dni: string;
  firmaBase64: string | null;
  filas: FilaInforme[];
}

const COLS = ["Fecha", "Tipo", "Entrada", "Salida", "Total horas", "Firmado"];
const COL_W = [26, 34, 22, 22, 28, 24];

export async function exportarInformeMensualPdf(grupos: GrupoInforme[], periodoLabel: string): Promise<boolean> {
  if (!grupos.length) return false;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  grupos.forEach((grupo, idx) => {
    if (idx > 0) doc.addPage();

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Registro de Jornada Laboral", 105, 18, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text("RDL 8/2019 - Control de Asistencia", 105, 25, { align: "center" });
    doc.setTextColor(0, 0, 0);

    doc.setDrawColor(228, 228, 231);
    doc.setFillColor(244, 244, 245);
    doc.roundedRect(14, 32, 182, 14, 2, 2, "FD");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Empleado: ", 18, 40);
    doc.setFont("helvetica", "normal");
    doc.text(grupo.nombre, 45, 40);
    doc.setFont("helvetica", "bold");
    doc.text("DNI/NIE: ", 120, 40);
    doc.setFont("helvetica", "normal");
    doc.text(grupo.dni || "No registrado", 143, 40);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Periodo: ${periodoLabel}`, 18, 50);

    let y = 60;
    let x = 14;
    doc.setFillColor(244, 244, 245);
    doc.rect(14, y - 5, 182, 8, "F");
    doc.setDrawColor(228, 228, 231);
    doc.rect(14, y - 5, 182, 8, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    for (let c = 0; c < COLS.length; c++) {
      doc.text(COLS[c], x + 2, y + 1);
      x += COL_W[c];
    }

    doc.setFont("helvetica", "normal");
    y += 8;
    grupo.filas.forEach((f, i) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      if (i % 2 === 0) {
        doc.setFillColor(249, 249, 250);
        doc.rect(14, y - 4, 182, 7, "F");
      }
      const row = [f.fecha, f.tipo, f.horaEntrada, f.horaSalida, f.totalHoras, f.firmado];
      x = 14;
      for (let c = 0; c < row.length; c++) {
        doc.text(String(row[c] || "-"), x + 2, y + 1);
        x += COL_W[c];
      }
      y += 7;
    });

    y += 10;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Firma digital del empleado:", 14, y);
    if (grupo.firmaBase64) {
      try {
        doc.addImage(grupo.firmaBase64, "PNG", 14, y + 4, 60, 22);
      } catch {
        doc.setFont("helvetica", "normal");
        doc.text("(no se pudo incrustar la firma)", 14, y + 12);
      }
    } else {
      doc.setDrawColor(180, 180, 180);
      doc.line(14, y + 18, 90, y + 18);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    const fechaExport = new Date().toLocaleDateString("es-ES");
    doc.text(`Generado el ${fechaExport} | Conforme al art. 34.9 ET y RDL 8/2019`, 14, 285);
  });

  doc.save(`registro_jornada_${periodoLabel.replace(/[^\w-]/g, "_")}.pdf`);
  return true;
}
