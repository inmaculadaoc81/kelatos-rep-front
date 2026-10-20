import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

/**
 * POST /api/reparaciones/[resguardo]/garantia — abre un resguardo NUEVO en garantía a partir de una reparación ya
 * hecha (equipo que vuelve mal reparado): copia los datos del cliente y del equipo, guarda las fotos nuevas, deja el
 * resguardo en estado "Garantía" (tipo de ingreso GARANTIA) y anota la relación en las observaciones de los dos.
 * Reutiliza el mismo alta en dos pasos (preparar + confirmar) que "Nueva Reparación"; no cambia la reparación original.
 */
interface FotoEntrada { base64?: string; mime?: string }

interface Cuerpo {
  clienteNombre?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  dniCif?: string;
  direccionEnvio?: string;
  equipoModelo?: string;
  sintoma?: string;
  dejaCargador?: "" | "si" | "no";
  tipoRecepcion?: "LOCAL" | "ENVIO";
  fotos?: FotoEntrada[];
}

const MAX_FOTOS = 8;

function hashCanonico(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function fechaEs(valor: unknown): string {
  const d = valor ? new Date(String(valor)) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Madrid" }) : "";
}

export async function POST(req: Request, { params }: { params: Promise<{ resguardo: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo: resguardoOrigen } = await params;
  const datos = (await req.json().catch(() => ({}))) as Cuerpo;

  const nombre = (datos.clienteNombre || "").trim();
  const equipoModelo = (datos.equipoModelo || "").trim();
  const motivo = (datos.sintoma || "").trim();
  if (!nombre) return NextResponse.json({ ok: false, error: "El nombre del cliente es obligatorio" }, { status: 400 });
  if (!equipoModelo) return NextResponse.json({ ok: false, error: "El modelo del equipo es obligatorio" }, { status: 400 });
  if (!motivo) return NextResponse.json({ ok: false, error: "Describe el problema por el que vuelve el equipo" }, { status: 400 });
  const fotos = (Array.isArray(datos.fotos) ? datos.fotos : []).filter((f) => typeof f?.base64 === "string" && f.base64.length > 100);
  if (fotos.length > MAX_FOTOS) return NextResponse.json({ ok: false, error: `Máximo ${MAX_FOTOS} fotos` }, { status: 400 });

  try {
    // La reparación de origen debe existir; se usa su fecha de entrega para la nota.
    const original = await kelatosApiGet<{ ok: boolean; row: Record<string, unknown> | null }>(`/v1/reparaciones/${encodeURIComponent(resguardoOrigen)}`);
    if (!original.row) return NextResponse.json({ ok: false, error: `No existe el resguardo ${resguardoOrigen}` }, { status: 404 });
    const entregadoEl = fechaEs(original.row.fecha_entrega);

    const referencia = `Garantía del resguardo ${resguardoOrigen}${entregadoEl ? ` (entregado el ${entregadoEl})` : ""}.`;
    let sintoma = motivo;
    if (datos.dejaCargador) sintoma += `\n¿Deja cargador?: ${datos.dejaCargador === "si" ? "Sí" : "No"}`;

    const requestId = crypto.randomUUID();
    const origen = "dashboard";
    const payloadHash = hashCanonico({ requestId, origen, resguardoOrigen, nombre, equipoModelo, motivo });

    const preparado = await kelatosApiPost<{ ok: boolean; resguardo: string }>("/v1/reparaciones/altas/preparar", { requestId, origen, payloadHash });

    // Fotos nuevas del equipo: si la subida falla no se pierde el resguardo (ya reservado); se avisa al personal.
    let fotoUrl = "";
    let fotosSubidas = true;
    if (fotos.length > 0) {
      try {
        const archivos = await kelatosApiPost<{ ok: boolean; fotoUrl: string }>(`/v1/formulario/${encodeURIComponent(preparado.resguardo)}/archivos`, {
          fotos: fotos.map((f) => ({ base64: f.base64, mime: f.mime || "image/jpeg" })),
        });
        fotoUrl = archivos.fotoUrl || "";
        fotosSubidas = fotoUrl !== "";
      } catch (e) {
        console.error("Error subiendo las fotos de la garantía:", e);
        fotosSubidas = false;
      }
    }

    const telefono = (datos.clienteTelefono || "").trim();
    const email = (datos.clienteEmail || "").trim();
    try {
      const confirmado = await kelatosApiPost<{ ok: boolean; resguardo: string }>("/v1/reparaciones/altas/confirmar", {
        requestId,
        origen,
        payloadHash,
        usuario,
        tipoAlta: "simple",
        reparacion: {
          fechaRecepcion: new Date().toISOString(),
          clienteNombre: nombre,
          clienteTelefono: telefono,
          clienteEmail: email,
          dniCif: (datos.dniCif || "").trim(),
          direccionEnvio: (datos.direccionEnvio || "").trim(),
          equipoModelo,
          sintoma,
          estado: "Garantía",
          tipoIngreso: "GARANTIA",
          tipoRecepcion: datos.tipoRecepcion === "ENVIO" ? "ENVIO" : "LOCAL",
          equipoEnLocal: "SI",
          entregaMensajeria: "NO",
          observaciones: referencia,
          fotoUrl,
        },
        cliente: { nombre, telefono, email, dniCif: (datos.dniCif || "").trim(), direccion: (datos.direccionEnvio || "").trim() },
        historial: { tipo: "creacion", descripcion: `Resguardo de garantía creado por ${usuario} a partir del resguardo ${resguardoOrigen}.` },
      });

      // Nota en la reparación original: queda constancia de que volvió y bajo qué resguardo (si falla no importa).
      await kelatosApiPost(`/v1/reparaciones/${encodeURIComponent(resguardoOrigen)}/observaciones`, {
        requestId: crypto.randomUUID(),
        usuario,
        texto: `El equipo volvió por garantía: nuevo resguardo ${confirmado.resguardo}.`,
      }).catch(() => {});

      return NextResponse.json({ ok: true, resguardo: confirmado.resguardo, fotosSubidas });
    } catch (confirmError) {
      await kelatosApiPost("/v1/reparaciones/altas/fallar", {
        requestId,
        errorTecnico: confirmError instanceof Error ? confirmError.message.slice(0, 500) : "Error desconocido",
      }).catch(() => {});
      const message = confirmError instanceof Error ? confirmError.message : "Error desconocido";
      return NextResponse.json({ ok: false, error: `Resguardo ${preparado.resguardo} reservado pero la creación falló: ${message}` }, { status: 502 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
