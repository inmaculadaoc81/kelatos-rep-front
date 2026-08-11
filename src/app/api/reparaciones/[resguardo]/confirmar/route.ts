import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosReparacionSheet, calcularTotalCintas } from "@/lib/reparacion-sheet";

interface RespuestaConfirmarFormulario {
  ok: boolean;
  resguardo: string;
  reparacion: Record<string, unknown>;
  nuevoEstado: string;
}

/** Mismo cálculo que /api/reparaciones/altas — ver ahí el porqué de cada rama (esCintasAceptarAhora sin mano de obra/piezas, etc.). */
function construirPresupuestoInmediato(datos: DatosReparacionSheet) {
  const inm = datos.presupuestoInmediato;
  if (datos.esCintas) {
    return { elaboradoPor: inm.elaboradoPor, descripcion: inm.descripcion };
  }
  const piezas = datos.necesitaPieza
    ? inm.piezas.map((p) => ({ tipo: p.tipo, descripcion: p.descripcion.trim(), costo: Number(p.costo) || 0, precio: Number(p.precio) || 0, enlace: p.tipo === "pedido" ? p.enlace.trim() : "" }))
    : [];
  let tipoPieza: string = "no";
  if (datos.necesitaPieza && piezas.length > 0) {
    const tieneStock = piezas.some((p) => p.tipo === "stock");
    const tienePedido = piezas.some((p) => p.tipo === "pedido");
    tipoPieza = tieneStock && tienePedido ? "mixto" : tienePedido ? "pedido" : "stock";
  }
  return {
    elaboradoPor: inm.elaboradoPor,
    descripcion: inm.descripcion,
    manoObra: Number(inm.manoObra) || 0,
    tipoPieza,
    notas: inm.notas.trim(),
    diasEntrega: Number(inm.diasEntrega) || 0,
    piezas,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const datos = (await req.json()) as DatosReparacionSheet;

  if (!datos.clienteNombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre del cliente es obligatorio" }, { status: 400 });
  if (!datos.esCintas && !datos.equipoModelo?.trim()) return NextResponse.json({ ok: false, error: "El modelo del equipo es obligatorio" }, { status: 400 });

  const clienteTelefono = datos.noTieneTelefono ? "No tiene" : `${datos.telPrefijo} ${datos.clienteTelefono.trim()}`.trim();
  const clienteEmail = datos.noTieneEmail ? "No tiene" : datos.clienteEmail.trim();
  const esAceptarAhora = datos.estado === "aceptar_ahora";
  const equipoModelo = datos.esCintas ? "CONVERSION DE CINTAS" : datos.equipoModelo.trim();
  const sintoma = datos.esCintas ? "Digitalización y conversión de cintas" : datos.sintoma.trim();

  const datosConfirmar: Record<string, unknown> = {
    clienteNombre: datos.clienteNombre.trim(),
    clienteTelefono,
    clienteEmail,
    direccionEnvio: datos.direccionEnvio.trim(),
    equipoModelo,
    sintoma,
    estado: datos.estado,
    tipoRecepcion: datos.tipoRecepcion,
    entregaMensajeria: datos.tipoRecepcion === "ENVIO" && datos.entregaMensajeria,
    revisionPagada: datos.revisionPagada === "corresponde",
    dejaCargador: datos.dejaCargador === "si",
  };
  if (datos.esCintas) {
    const calculo = calcularTotalCintas(datos.cintas, datos.precioPorCintaPersonalizado);
    datosConfirmar.datosCintas = { tipos: datos.cintas, total: calculo.total, precioUnitario: calculo.precioUnitarioEquivalente };
  }

  const body: Record<string, unknown> = {
    requestId: crypto.randomUUID(),
    usuario,
    datos: datosConfirmar,
  };
  if (esAceptarAhora) {
    body.presupuesto = construirPresupuestoInmediato(datos);
  }

  try {
    const resultado = await kelatosApiPost<RespuestaConfirmarFormulario>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/formulario/confirmar`,
      body
    );

    return NextResponse.json({ ok: true, reparacion: resultado.reparacion, nuevoEstado: resultado.nuevoEstado });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
