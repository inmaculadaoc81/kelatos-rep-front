import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosReparacionSheet, calcularTotalCintas } from "@/lib/reparacion-sheet";

interface RespuestaPreparar {
  ok: boolean;
  resguardo: string;
}

interface RespuestaConfirmar {
  ok: boolean;
  resguardo: string;
  reparacion: Record<string, unknown>;
  cliente: Record<string, unknown> | null;
}

function hashCanonico(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/** Reproduce la construcción de "piezas" de guardarNuevaReparacion (Index.html) — solo cuando no es cintas y se marcó "requiere pieza(s)". */
function construirPresupuestoInmediato(datos: DatosReparacionSheet) {
  const inm = datos.presupuestoInmediato;
  if (datos.esCintas) {
    // esCintasAceptarAhora: el precio ya viene del cálculo de cintas — el
    // presupuesto inmediato aquí es solo responsable + diagnóstico.
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

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = (await req.json()) as DatosReparacionSheet;

  const clienteTelefono = datos.noTieneTelefono ? "No tiene" : `${datos.telPrefijo} ${datos.clienteTelefono.trim()}`.trim();
  const clienteEmail = datos.noTieneEmail ? "No tiene" : datos.clienteEmail.trim();

  if (!datos.clienteNombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre del cliente es obligatorio" }, { status: 400 });
  if (!datos.dniCif?.trim()) return NextResponse.json({ ok: false, error: "El DNI / CIF es obligatorio" }, { status: 400 });
  if (!datos.direccionEnvio?.trim()) return NextResponse.json({ ok: false, error: "La dirección es obligatoria" }, { status: 400 });
  if (!datos.esCintas && !datos.equipoModelo?.trim()) return NextResponse.json({ ok: false, error: "El modelo del equipo es obligatorio" }, { status: 400 });
  if (!datos.esCintas && !datos.sintoma?.trim()) return NextResponse.json({ ok: false, error: "El síntoma es obligatorio" }, { status: 400 });

  const esAceptarAhora = datos.estado === "aceptar_ahora";
  const tipoAlta = datos.esCintas ? "cintas" : esAceptarAhora ? "con_presupuesto" : "simple";
  // El tipoAlta "cintas" no decide el estado final por sí mismo (a
  // diferencia de "con_presupuesto", que lo deriva de tipoPieza) — se
  // envía ya resuelto, igual que estadoInicial en el original.
  const estadoFinal = datos.esCintas ? (esAceptarAhora ? "Presupuesto Aceptado" : "En Reparación") : datos.estado === "aceptar_ahora" ? "Presupuesto Pendiente" : datos.estado;

  const equipoModelo = datos.esCintas ? "CONVERSION DE CINTAS" : datos.equipoModelo.trim();
  // /v1/reparaciones/altas/confirmar no tiene el hack de "deja cargador"
  // que sí existe en /formulario/confirmar (ver server.js) — se reproduce
  // aquí mismo, concatenado al síntoma, igual que hace el backend allí.
  let sintoma = datos.esCintas ? "Digitalización y conversión de cintas" : datos.sintoma.trim();
  if (!datos.esCintas && datos.dejaCargador) sintoma += (sintoma ? "\n" : "") + `¿Deja cargador?: ${datos.dejaCargador === "si" ? "Sí" : "No"}`;
  const revisionPagadaBool = datos.revisionPagada === "corresponde";

  const requestId = crypto.randomUUID();
  const origen = "dashboard";
  const payloadHash = hashCanonico({ requestId, origen, datos });

  try {
    const preparado = await kelatosApiPost<RespuestaPreparar>("/v1/reparaciones/altas/preparar", {
      requestId,
      origen,
      payloadHash,
    });

    try {
      const reparacionPayload: Record<string, unknown> = {
        fechaRecepcion: datos.fechaRecepcion,
        clienteNombre: datos.clienteNombre.trim(),
        clienteTelefono,
        clienteEmail,
        dniCif: datos.dniCif.trim(),
        direccionEnvio: datos.direccionEnvio.trim(),
        equipoModelo,
        sintoma,
        estado: estadoFinal,
        tipoRecepcion: datos.tipoRecepcion,
        equipoEnLocal: "SI",
        entregaMensajeria: datos.tipoRecepcion === "ENVIO" && datos.entregaMensajeria ? "SI" : "NO",
        revisionPagada: revisionPagadaBool,
      };

      const body: Record<string, unknown> = {
        requestId,
        origen,
        payloadHash,
        usuario,
        tipoAlta,
        reparacion: reparacionPayload,
        cliente: {
          nombre: datos.clienteNombre.trim(),
          telefono: clienteTelefono,
          email: clienteEmail,
          dniCif: datos.dniCif.trim(),
          direccion: datos.direccionEnvio.trim(),
        },
        historial: {
          tipo: "creacion",
          descripcion: `Reparación creada desde el dashboard por ${usuario}.`,
        },
      };

      if (datos.esCintas) {
        const calculo = calcularTotalCintas(datos.cintas, datos.precioPorCintaPersonalizado);
        reparacionPayload.datosCintas = {
          tipos: datos.cintas, total: calculo.total,
          // precioUnitario: promedio "equivalente" — el backend solo suma
          // qty*precioUnitario para el total (ver server.js), así que
          // debe seguir siendo ese promedio para que el importe cobrado no
          // cambie. precioPorCinta/precioBobina se guardan APARTE para que
          // el desglose por línea de la factura (construirLineasIniciales)
          // pueda mostrar el precio real de cada tipo en vez de ese
          // promedio en todas las líneas (bug real detectado: una bobina
          // a 20€ fijo salía impresa al mismo precio "medio" que el resto).
          precioUnitario: calculo.precioUnitarioEquivalente,
          precioPorCinta: calculo.precioPorCinta,
          precioBobina: calculo.precioBobina,
        };
      }
      if (tipoAlta === "cintas" || tipoAlta === "con_presupuesto") {
        body.presupuesto = construirPresupuestoInmediato(datos);
      }

      const confirmado = await kelatosApiPost<RespuestaConfirmar>("/v1/reparaciones/altas/confirmar", body);

      return NextResponse.json({
        ok: true,
        resguardo: confirmado.resguardo,
        reparacion: confirmado.reparacion,
        cliente: confirmado.cliente,
      });
    } catch (confirmError) {
      // El resguardo ya quedó reservado en preparar y NO se libera — se
      // marca la solicitud como fallida solo a efectos de auditoría.
      await kelatosApiPost("/v1/reparaciones/altas/fallar", {
        requestId,
        errorTecnico: confirmError instanceof Error ? confirmError.message.slice(0, 500) : "Error desconocido",
      }).catch(() => {});

      const message = confirmError instanceof Error ? confirmError.message : "Error desconocido";
      return NextResponse.json(
        { ok: false, error: `Resguardo ${preparado.resguardo} reservado pero la creación falló: ${message}` },
        { status: 502 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
