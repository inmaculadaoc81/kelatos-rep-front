import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearReparacionDetalle } from "@/lib/reparacion-detalle";

interface ListaGenerica<T> {
  ok: boolean;
  rows: T[];
}

interface FilaPresupuesto {
  presupuesto_id: string;
  [key: string]: unknown;
}

interface FilaPieza {
  presupuesto_id: string;
  [key: string]: unknown;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const { resguardo } = await params;
  try {
    const [reparacion, presupuestos, pedidos, historial] = await Promise.all([
      kelatosApiGet<{ ok: boolean; row: Record<string, unknown> }>(`/v1/reparaciones/${resguardo}`),
      kelatosApiGet<ListaGenerica<FilaPresupuesto>>("/v1/presupuestos", {
        resguardo,
        limit: 1000,
        order: "version",
        direction: "asc",
      }),
      kelatosApiGet<ListaGenerica<Record<string, unknown>>>("/v1/pedidos", {
        resguardo,
        limit: 1000,
        order: "pedido_id",
        direction: "asc",
      }),
      kelatosApiGet<ListaGenerica<Record<string, unknown>>>("/v1/historial", {
        resguardo,
        limit: 1000,
        order: "fecha_hora",
        direction: "desc",
      }),
    ]);

    const piezasPorPresupuesto: Record<string, FilaPieza[]> = {};
    await Promise.all(
      presupuestos.rows.map(async (p) => {
        const piezas = await kelatosApiGet<ListaGenerica<FilaPieza>>("/v1/piezas_presupuesto", {
          presupuesto_id: p.presupuesto_id,
          limit: 1000,
          order: "pieza_id",
          direction: "asc",
        });
        piezasPorPresupuesto[p.presupuesto_id] = piezas.rows;
      })
    );

    const detalle = mapearReparacionDetalle(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reparacion.row as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      presupuestos.rows as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      piezasPorPresupuesto as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pedidos.rows as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      historial.rows as any
    );

    return NextResponse.json({ ok: true, detalle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
