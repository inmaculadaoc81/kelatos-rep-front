import { NextResponse } from "next/server";
import { auth, esDominioKelatos } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";

const BASE_URL = process.env.KELATOS_API_BASE_URL;
const TOKEN = process.env.KELATOS_API_TOKEN;

/** Proxy de imagen: la firma del empleado vive en Drive (carpeta de
    Asistencia), identificada solo por su ID de archivo en
    fichaje.firma_empleado — reutiliza la misma ruta de descarga genérica
    de Drive que ya usa formulario-cliente (/v1/formulario/archivo/:id no
    es realmente específica de "formulario", solo transmite el archivo
    que le pida cualquier caller autenticado con el token interno). Este
    proxy exige sesión de manager de Asistencia antes de reenviar la
    petición, igual que el resto del panel admin. */
export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const session = await auth();
  const email = session?.user?.email;
  const esManager = !!email && esDominioKelatos(email) && (session?.user?.role === "admin" || esSuperadmin(email));
  if (!esManager) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { fileId } = await params;
  if (!/^[A-Za-z0-9._-]+$/.test(fileId)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

  try {
    const upstream = await fetch(`${BASE_URL}/v1/formulario/archivo/${fileId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ ok: false, error: "No se pudo cargar la firma" }, { status: upstream.status || 502 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "image/png",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
