import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearCliente, ClienteFormData } from "@/lib/clientes";

interface RespuestaLecturaClientes {
  ok: boolean;
  clientes: Parameters<typeof mapearCliente>[0][];
}

interface RespuestaCrearCliente {
  ok: boolean;
  cliente: Parameters<typeof mapearCliente>[0];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const buscar = searchParams.get("buscar") || undefined;

  try {
    const data = await kelatosApiGet<RespuestaLecturaClientes>("/v1/lecturas/clientes", { buscar, limit: 500 });
    return NextResponse.json({ ok: true, clientes: data.clientes.map(mapearCliente) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

function hashCanonico(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = (await req.json()) as ClienteFormData;
  if (!datos.nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  const requestId = crypto.randomUUID();
  const payloadHash = hashCanonico({ requestId, datos });

  try {
    const resultado = await kelatosApiPost<RespuestaCrearCliente>("/v1/clientes/crear", {
      requestId,
      usuario,
      payloadHash,
      nombre: datos.nombre.trim(),
      dniCif: datos.dniCif.trim(),
      telefono: datos.telefono.trim(),
      email: datos.email.trim(),
      direccion: datos.direccion.trim(),
      cp: datos.cp.trim(),
      localidad: datos.localidad.trim(),
      provincia: datos.provincia.trim(),
      notas: datos.notas.trim(),
    });

    return NextResponse.json({ ok: true, cliente: mapearCliente(resultado.cliente) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
