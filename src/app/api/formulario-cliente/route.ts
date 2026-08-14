import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosFormularioCliente } from "@/lib/formulario-cliente";
import { normalizarNumeroLocal } from "@/lib/telefono";

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
  const telefonoLocal = normalizarNumeroLocal(datos.telPrefijo, datos.telefono.trim().replace(/[^\d]/g, ""));
  const telefono = `${datos.telPrefijo} ${telefonoLocal}`.trim();
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

  // Reproduce _insertarFilaFormulario (backend/FormularioCliente.js): mismo
  // cálculo de total, precioUnitario 0 hasta que se acepte el presupuesto.
  const datosCintas = esCintas
    ? {
        tipos: datos.cintas,
        total: Object.values(datos.cintas).reduce((acc, n) => acc + (Number(n) || 0), 0),
        precioUnitario: 0,
      }
    : null;

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

    let fotoUrl = "";
    let firmaUrl = "";
    if (datos.fotos.length > 0 || datos.firmaBase64) {
      try {
        const archivos = await kelatosApiPost<{ ok: boolean; fotoUrl: string; firmaUrl: string }>(
          `/v1/formulario/${preparado.resguardo}/archivos`,
          { fotos: datos.fotos.map((f) => ({ base64: f.base64, mime: f.mime })), firmaBase64: datos.firmaBase64 }
        );
        fotoUrl = archivos.fotoUrl;
        firmaUrl = archivos.firmaUrl;
      } catch (archivosError) {
        // La subida a Drive puede fallar (cuota, red) sin que deba perderse
        // la solicitud ya reservada — se confirma sin foto/firma antes que
        // dejar al cliente sin resguardo.
        console.error("Error subiendo foto/firma del formulario:", archivosError);
      }
    }

    try {
      const confirmado = await kelatosApiPost<{ ok: boolean; resguardo: string }>("/v1/reparaciones/altas/confirmar", {
        requestId,
        origen,
        payloadHash,
        usuario: "Formulario Web",
        tipoAlta: "simple",
        reparacion: {
          fechaRecepcion: new Date().toISOString(),
          clienteNombre: datos.nombre.trim(),
          clienteTelefono: telefono,
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
          fotoUrl,
          firmaUrl,
          datosCintas,
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

      // Rota el código de acceso activo tras cada envío exitoso — reproduce
      // generarCodigoPublicoNuevaSolicitud() (FormularioCliente.js:1466),
      // que en el original nunca llegó a invocarse desde ningún sitio real
      // (función "muerta": definida y expuesta como apiGenerarCodigoPublico
      // NuevaSolicitud, pero sin ningún llamador en FormularioCliente.html
      // ni en el resto del código). Sin esto, el mismo código de acceso
      // (pensado como un solo uso: un cliente, una visita) se puede reutilizar
      // indefinidamente hasta que caduque (24h) o el personal genere otro a
      // mano — cualquiera que lo capture puede registrar solicitudes
      // ilimitadas con él. Best-effort: un fallo aquí no debe impedir que el
      // cliente reciba su resguardo ya confirmado.
      kelatosApiPost("/v1/formulario/codigo-acceso", { usuario: "Formulario Web (auto tras envío)" }).catch((e) => {
        console.error("Error rotando código de acceso tras envío del formulario:", e);
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
