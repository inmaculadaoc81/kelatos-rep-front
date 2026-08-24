import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosFormularioCliente } from "@/lib/formulario-cliente";
import { normalizarNumeroLocal } from "@/lib/telefono";
import { corregirTypoDominioEmail } from "@/lib/validacion";

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
  const datos = (await req.json()) as DatosFormularioCliente & { codigoAcceso?: string };

  // Consumo atómico del código de acceso ANTES de crear nada — reemplaza
  // la rotación "fire-and-forget" posterior al envío (no garantizada: un
  // fallo ahí dejaba el mismo código válido indefinidamente, bug real
  // reportado con 3 formularios registrados con un solo código). Si el
  // código ya se usó, caducó, o no es el activo, la solicitud se rechaza
  // aquí mismo — nunca se llega a crear la reparación.
  const codigoAcceso = typeof datos.codigoAcceso === "string" ? datos.codigoAcceso.trim() : "";
  if (!codigoAcceso) {
    return NextResponse.json({ ok: false, error: "Falta el código de acceso" }, { status: 400 });
  }
  try {
    const consumo = await kelatosApiPost<{ ok: boolean; consumido: boolean; error?: string }>(
      "/v1/formulario/codigo-acceso/consumir",
      { codigo: codigoAcceso }
    );
    if (!consumo.consumido) {
      return NextResponse.json({ ok: false, error: consumo.error || "El código de acceso ya no es válido." }, { status: 409 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: `No se pudo validar el código de acceso: ${message}` }, { status: 502 });
  }

  const esCintas = datos.tipoProducto === "Conversión de cintas";
  const tipoVal = datos.tipoProducto === "Otro" ? datos.tipoOtro.trim() || "Otro" : datos.tipoProducto;
  const equipoModelo = esCintas ? "CONVERSION DE CINTAS" : [tipoVal, datos.marca.trim(), datos.modelo.trim()].filter(Boolean).join(" ");
  // Red de seguridad server-side (además del onBlur/envío del propio
  // formulario) por si esta ruta llega a recibir el dato sin pasar por
  // esas correcciones — nunca guardar/enviar a un ".con" cuando el resto
  // del dominio ya delata el typo (gmail.con, hotmail.con...).
  const email = datos.noTieneEmail ? "" : corregirTypoDominioEmail(datos.email.trim());
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

      // El código ya quedó invalidado de verdad arriba (/consumir, atómico
      // y anterior a la creación de la reparación) — esto solo genera uno
      // NUEVO para que el panel del personal tenga QR listo para el
      // siguiente cliente sin esperar a que alguien pulse "Nuevo código" a
      // mano. Puramente cosmético: un fallo aquí no reabre el código
      // anterior (sigue consumido) ni afecta al resguardo ya confirmado.
      kelatosApiPost("/v1/formulario/codigo-acceso", { usuario: "Formulario Web (auto tras envío)" }).catch((e) => {
        console.error("Error generando el siguiente código de acceso tras envío del formulario:", e);
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
