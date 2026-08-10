import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosNuevaReparacion } from "@/lib/reparacion-alta";

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

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = (await req.json()) as DatosNuevaReparacion;

  if (!datos.clienteNombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre del cliente es obligatorio" }, { status: 400 });
  if (!datos.equipoModelo?.trim()) return NextResponse.json({ ok: false, error: "El modelo del equipo es obligatorio" }, { status: 400 });
  if (!datos.sintoma?.trim()) return NextResponse.json({ ok: false, error: "El síntoma es obligatorio" }, { status: 400 });

  const requestId = crypto.randomUUID();
  const origen = "dashboard";
  // El mismo hash se envía a preparar y a confirmar — el servidor exige que
  // coincidan exactamente para el mismo requestId (detección de duplicados).
  const payloadHash = hashCanonico({ requestId, origen, datos });

  try {
    const preparado = await kelatosApiPost<RespuestaPreparar>("/v1/reparaciones/altas/preparar", {
      requestId,
      origen,
      payloadHash,
    });

    try {
      const confirmado = await kelatosApiPost<RespuestaConfirmar>("/v1/reparaciones/altas/confirmar", {
        requestId,
        origen,
        payloadHash,
        usuario,
        tipoAlta: "simple",
        rep: {
          fechaRecepcion: datos.fechaRecepcion,
          clienteNombre: datos.clienteNombre.trim(),
          clienteTelefono: datos.clienteTelefono.trim(),
          clienteEmail: datos.clienteEmail.trim(),
          dniCif: datos.dniCif.trim(),
          direccionEnvio: datos.direccionEnvio.trim(),
          equipoModelo: datos.equipoModelo.trim(),
          sintoma: datos.sintoma.trim(),
          estado: datos.estado,
          tipoRecepcion: datos.tipoRecepcion,
          equipoEnLocal: "SI",
          entregaMensajeria: datos.entregaMensajeria ? "SI" : "NO",
          revisionPagada: datos.revisionPagada,
        },
        cliente: {
          nombre: datos.clienteNombre.trim(),
          telefono: datos.clienteTelefono.trim(),
          email: datos.clienteEmail.trim(),
          dniCif: datos.dniCif.trim(),
          direccion: datos.direccionEnvio.trim(),
        },
        historial: {
          tipo: "creacion",
          descripcion: `Reparación creada desde el dashboard por ${usuario}.`,
        },
      });

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
