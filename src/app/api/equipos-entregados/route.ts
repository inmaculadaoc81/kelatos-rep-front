import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearFilaReparacion, RespuestaLecturasReparaciones } from "@/lib/reparaciones";
import { EquipoEntregado, puedeVerEquiposEntregados } from "@/lib/equipos-entregados";
import { diaMadrid } from "@/lib/tpv";

export const dynamic = "force-dynamic";

/**
 * GET /api/equipos-entregados — equipos que ya salieron del taller (entregados en local o enviados por
 * mensajería), con la fecha de entrega. Reutiliza la lectura de reparaciones finalizadas que usa el Historial y
 * devuelve solo lo necesario para la vista (no la reparación completa). Solo administradores, superadmins y la
 * cuenta de empleados (ver puedeVerEquiposEntregados).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!puedeVerEquiposEntregados(session.user)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  try {
    const data = await kelatosApiGet<RespuestaLecturasReparaciones>("/v1/lecturas/reparaciones", {
      finalizadas: "true",
      pagina: "1",
      porPagina: "0",
    });
    const equipos: EquipoEntregado[] = [];
    for (const row of data.resultados) {
      const r = mapearFilaReparacion(row, {}, {});
      if ((r.estadoEntrega !== "ENTREGADO" && r.estadoEntrega !== "ENVIO") || !r.fechaEntrega) continue;
      const dia = diaMadrid(r.fechaEntrega);
      if (!dia) continue;
      equipos.push({
        resguardo: r.resguardo,
        dia,
        fechaEntrega: r.fechaEntrega,
        tipoEntrega: r.estadoEntrega === "ENVIO" ? "mensajeria" : "local",
        cliente: r.cliente.nombre,
        telefono: r.cliente.telefono,
        equipo: r.equipo.modelo,
        tecnico: r.tecnicoAsignado,
        estado: r.estado,
        tipoIngreso: r.tipoIngreso,
        documento: r.numeroFactura || r.numeroTicket || r.numeroFacturaMensajeria || r.numeroTicketMensajeria || "",
      });
    }
    equipos.sort((a, b) => b.fechaEntrega.localeCompare(a.fechaEntrega));
    return NextResponse.json({ ok: true, equipos });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
