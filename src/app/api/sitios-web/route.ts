import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearSitioWeb } from "@/lib/webs-kelatos";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const resultado = await kelatosApiGet<{ ok: boolean; sitios: Parameters<typeof mapearSitioWeb>[0][] }>("/v1/sitios-web");
    return NextResponse.json({ ok: true, sitios: resultado.sitios.map(mapearSitioWeb) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { nombre, url } = (await req.json()) as { nombre: string; url?: string };
  if (!nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; sitio: Parameters<typeof mapearSitioWeb>[0] }>(
      "/v1/sitios-web",
      { nombre: nombre.trim(), url: url?.trim() || "", usuario }
    );
    return NextResponse.json({ ok: true, sitio: mapearSitioWeb(resultado.sitio) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
