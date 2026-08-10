import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import {
  construirDatosReportes,
  construirAlertas,
  FilaReparacionReporte,
  FilaPresupuestoReporte,
  FilaVentaReporte,
  FilaItemVentaReporte,
} from "@/lib/reportes";

interface RespuestaReparaciones {
  ok: boolean;
  resultados: FilaReparacionReporte[];
  total: number;
}

interface RespuestaGenerica<T> {
  ok: boolean;
  rows: T[];
  count: number;
}

interface RespuestaVentas {
  ok: boolean;
  ventas: FilaVentaReporte[];
  itemsPorVenta: Record<string, FilaItemVentaReporte[]>;
}

// El CRUD genérico tope a 1000 filas por llamada; hoy hay ~2200
// presupuestos, así que se pagina hasta agotar.
const PAGINA = 1000;

async function todosLosPresupuestos(): Promise<FilaPresupuestoReporte[]> {
  const filas: FilaPresupuestoReporte[] = [];
  for (let offset = 0; ; offset += PAGINA) {
    const pagina = await kelatosApiGet<RespuestaGenerica<FilaPresupuestoReporte>>("/v1/presupuestos", {
      limit: PAGINA,
      offset,
    });
    filas.push(...pagina.rows);
    if (pagina.rows.length < PAGINA) break;
    // Cortafuegos: nunca más de 20 páginas (20.000 filas).
    if (offset / PAGINA >= 19) break;
  }
  return filas;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const umbralDias = Math.max(1, Math.min(365, parseInt(searchParams.get("umbral") || "14", 10) || 14));

  try {
    const [reparaciones, presupuestos, ventas] = await Promise.all([
      // Sin el filtro "finalizadas" el endpoint devuelve TODAS las
      // reparaciones (activas + cerradas), que es lo que necesitan los
      // reportes; porPagina=0 desactiva el límite.
      kelatosApiGet<RespuestaReparaciones>("/v1/lecturas/reparaciones", { porPagina: 0 }),
      todosLosPresupuestos(),
      kelatosApiGet<RespuestaVentas>("/v1/lecturas/ventas", { limit: 5000 }),
    ]);

    const datos = construirDatosReportes(
      reparaciones.resultados,
      presupuestos,
      ventas.ventas,
      ventas.itemsPorVenta || {}
    );
    const alertas = construirAlertas(reparaciones.resultados, presupuestos, umbralDias);

    return NextResponse.json({ ok: true, datos, alertas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
