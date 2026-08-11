import { NextResponse, type NextRequest } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { expandirVenta } from "@/lib/facturas-cliente";
import { obtenerTodasLasFacturas } from "@/lib/obtener-facturas";
import { calcularDesglose } from "@/lib/reporte-facturas";

interface RespuestaTabla<T> {
  ok: boolean;
  rows: T[];
}

interface FilaClienteSql {
  codigo: string;
  dni_cif: string | null;
  telefono: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fechaDesde = searchParams.get("fechaDesde") || "";
  const fechaHasta = searchParams.get("fechaHasta") || "";
  if (!fechaDesde || !fechaHasta) {
    return NextResponse.json({ ok: false, error: "fechaDesde y fechaHasta son obligatorios" }, { status: 400 });
  }

  try {
    const [base, ventas, clientes] = await Promise.all([
      obtenerTodasLasFacturas(),
      kelatosApiGet<RespuestaTabla<Parameters<typeof expandirVenta>[0]>>("/v1/ventas", { limit: 1000 }),
      kelatosApiGet<RespuestaTabla<FilaClienteSql>>("/v1/clientes", { limit: 1000 }),
    ]);

    // Reproduce _lookupCodigo(): por DNI/CIF primero, por teléfono si no.
    const porDni = new Map<string, string>();
    const porTelefono = new Map<string, string>();
    for (const c of clientes.rows) {
      const codigo = (c.codigo || "").trim();
      if (!codigo) continue;
      const dni = (c.dni_cif || "").trim().toLowerCase();
      const tel = (c.telefono || "").trim();
      if (dni) porDni.set(dni, codigo);
      if (tel) porTelefono.set(tel, codigo);
    }
    function lookupCodigo(dniCif: string, telefono: string): string {
      return porDni.get((dniCif || "").trim().toLowerCase()) || porTelefono.get((telefono || "").trim()) || "";
    }

    const todas = [...base, ...ventas.rows.flatMap(expandirVenta)];

    const enRango = todas.filter((f) => !!f.fecha && f.fecha.slice(0, 10) >= fechaDesde && f.fecha.slice(0, 10) <= fechaHasta);
    enRango.sort((a, b) => (a.fecha! < b.fecha! ? -1 : a.fecha! > b.fecha! ? 1 : 0));

    const facturas = enRango.map((f) => ({ ...calcularDesglose(f), codigoCliente: lookupCodigo(f.dniCif, f.telefono) }));

    return NextResponse.json({ ok: true, fechaDesde, fechaHasta, facturas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
