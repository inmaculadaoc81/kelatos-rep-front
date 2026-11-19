import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { obtenerTodasLasFacturas } from "@/lib/obtener-facturas";
import { calcularDesglose } from "@/lib/reporte-facturas";
import { estadoFacturaDerivado, etiquetaTipo, tipoVisible } from "@/lib/facturas-cliente";
import { fechaMadrid } from "@/lib/reportes";

interface LineaApi {
  numero: string;
  fecha: string;
  [k: string]: unknown;
}

/**
 * Reporte de ítems facturados. Las líneas reales (reparaciones, ventas, facturas y tickets manuales) vienen de la API. Los documentos que no guardan
 * sus líneas (alquileres, recogidas, mensajería, anticipos, revisión pagada, y el original/rectificativa de un ticket corregido) salen de la misma
 * lista que «Reporte de Facturas» y entran como UNA línea por su importe, marcada `sinDesglose`; así el reporte cubre todos los documentos y cuadra
 * con ese reporte. Solo lectura.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const desde = sp.get("desde") || "";
  const hasta = sp.get("hasta") || "";
  try {
    const [resultado, todas] = await Promise.all([
      kelatosApiGet<{ ok: boolean; lineas: LineaApi[]; truncado?: boolean; desde: string; hasta: string }>("/v1/reporte-items-facturados", {
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
      obtenerTodasLasFacturas(),
    ]);
    const conLineas = new Set((resultado.lineas || []).map((l) => l.numero));
    const sinLineas = todas
      .filter((f) => {
        if (!f.fecha || !f.numero || conLineas.has(f.numero)) return false;
        const dia = fechaMadrid(f.fecha);
        return !!dia && (!desde || dia >= desde) && (!hasta || dia <= hasta);
      })
      .map(calcularDesglose)
      .map((f) => {
        const tipo = tipoVisible(f);
        const descripcion =
          tipo === "alquiler" ? `Alquiler de equipo${f.equipo ? ` · ${f.equipo}` : ""} (incluye fianza y envío si los hay)`
          : tipo === "recogida" ? "Recogida de equipo alquilado"
          : tipo === "mensajeria" ? "Mensajería / envío"
          : tipo === "anticipo" ? "Anticipo"
          : tipo === "revision" ? "Revisión pagada"
          : tipo === "rectificativa" ? "Rectificativa (sin desglose de ítems)"
          : tipo === "corregida" ? "Documento corregido (sin desglose de ítems)"
          : "Documento sin desglose de ítems";
        return {
          numero: f.numero,
          tipo: etiquetaTipo(f),
          fecha: f.fecha as string,
          cliente: f.cliente || "",
          nif: f.dniCif || "",
          forma_pago: f.formaPago || "",
          banco: f.banco || "",
          estado: estadoFacturaDerivado(f),
          origen: f.esAlquiler || tipo === "alquiler" || tipo === "recogida" ? "Alquiler" : f.resguardo ? `Reparación ${f.resguardo}` : "",
          linea: 1,
          referencia: "",
          descripcion,
          cantidad: 1,
          precio: f.baseImponible,
          descuento: 0,
          base: f.baseImponible,
          iva: f.iva,
          total: f.totalConIva,
          sinDesglose: true,
        };
      });
    const lineas = [...(resultado.lineas || []), ...sinLineas].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : String(b.numero).localeCompare(String(a.numero))));
    return NextResponse.json({ ok: true, desde: resultado.desde, hasta: resultado.hasta, truncado: !!resultado.truncado, lineas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
