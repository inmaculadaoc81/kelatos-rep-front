import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosFormularioCliente } from "@/lib/formulario-cliente";

function hashCanonico(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

// Reproduce _construirSintomaFormularioSql (backend/FormularioCliente.js).
function construirSintoma(datos: DatosFormularioCliente, esCintas: boolean): string {
  if (esCintas) return "Digitalización y conversión de cintas";
  let s = datos.sintoma;
  if (datos.enciende) s += `\n¿Enciende?: ${datos.enciende}`;
  if (datos.golpe) {
    s += `\n¿Golpe?: ${datos.golpe}`;
    s += `\n¿Humedad?: ${datos.humedad || "No"}`;
    s += `\n¿Reparación anterior?: ${datos.reparacionAnterior || "No"}`;
  }
  if (datos.serie.trim()) s += `\nNº Serie: ${datos.serie.trim()}`;
  return s;
}

// Reproduce _construirObservacionesFormularioSql.
function construirObservaciones(datos: DatosFormularioCliente, esCintas: boolean): string {
  let obs = datos.obs.trim() ? (esCintas ? "Detalle: " : "Contraseña/PIN: ") + datos.obs.trim() : "";
  if (datos.aceptaMarketing) obs = (obs ? obs + " | " : "") + "[Marketing:Sí]";
  return obs;
}

export async function POST(req: Request) {
  const datos = (await req.json()) as DatosFormularioCliente;

  const esCintas = datos.tipoProducto === "Conversión de cintas";
  const tipoVal = datos.tipoProducto === "Otro" ? datos.tipoOtro.trim() || "Otro" : datos.tipoProducto;
  const equipoModelo = esCintas ? "CONVERSION DE CINTAS" : [tipoVal, datos.marca.trim(), datos.modelo.trim()].filter(Boolean).join(" ");
  const email = datos.noTieneEmail ? "" : datos.email.trim();
  const telefono = `${datos.telPrefijo} ${datos.telefono.trim()}`.trim();
  const direccion = [datos.viaTipo, datos.viaNombre.trim(), datos.viaNumero.trim(), datos.cp.trim(), datos.localidad.trim(), datos.provincia.trim()]
    .filter(Boolean)
    .join(", ");

  if (!datos.nombre.trim() || !telefono.replace(datos.telPrefijo, "").trim() || !equipoModelo.trim()) {
    return NextResponse.json({ ok: false, error: "Faltan campos obligatorios" }, { status: 400 });
  }
  const sintoma = construirSintoma(datos, esCintas);
  if (!sintoma.trim()) return NextResponse.json({ ok: false, error: "Faltan campos obligatorios" }, { status: 400 });

  const observaciones = construirObservaciones(datos, esCintas);
  const requestId = crypto.randomUUID();
  const origen = "formulario_publico";

  const cargaUtil = {
    clienteNombre: datos.nombre.trim(),
    clienteEmail: email,
    clienteTelefono: telefono,
    equipoModelo,
    sintoma,
    dniCif: datos.dniCif.trim(),
    direccionEnvio: direccion,
    envioDomicilio: false,
    tipoIngreso: "formulario_web",
    observaciones,
  };
  const payloadHash = hashCanonico(cargaUtil);

  try {
    const preparado = await kelatosApiPost<{ ok: boolean; resguardo: string; duplicate?: boolean; estado?: string }>(
      "/v1/reparaciones/altas/preparar",
      { requestId, origen, payloadHash }
    );

    if (preparado.duplicate === true && preparado.estado === "confirmada") {
      return NextResponse.json({ ok: true, resguardo: preparado.resguardo });
    }

    try {
      const confirmado = await kelatosApiPost<{ ok: boolean; resguardo: string }>("/v1/reparaciones/altas/confirmar", {
        requestId,
        origen,
        payloadHash,
        usuario: "Formulario Web",
        tipoAlta: "simple",
        rep: {
          fechaRecepcion: new Date().toISOString(),
          clienteNombre: datos.nombre.trim(),
          clienteTelefono: "",
          clienteEmail: email,
          equipoModelo,
          sintoma,
          estado: "Formulario Pendiente",
          estadoEntrega: "PENDIENTE",
          tipoRecepcion: "LOCAL",
          equipoEnLocal: "SI",
          entregaMensajeria: "NO",
          direccionEnvio: direccion,
          dniCif: datos.dniCif.trim(),
          tipoIngreso: "formulario_web",
          revisionPagada: false,
          observaciones,
          fotoUrl: "",
          firmaUrl: "",
        },
        cliente: {
          nombre: datos.nombre.trim(),
          telefono,
          email,
          dniCif: datos.dniCif.trim(),
          direccion,
          cp: datos.cp.trim(),
          localidad: datos.localidad.trim(),
          provincia: datos.provincia.trim(),
        },
        historial: { tipo: "entrada", descripcion: "Solicitud registrada desde el formulario público (web)" },
      });

      return NextResponse.json({ ok: true, resguardo: confirmado.resguardo });
    } catch (confirmError) {
      await kelatosApiPost("/v1/reparaciones/altas/fallar", {
        requestId,
        errorTecnico: confirmError instanceof Error ? confirmError.message.slice(0, 500) : "Error desconocido",
      }).catch(() => {});
      throw confirmError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
