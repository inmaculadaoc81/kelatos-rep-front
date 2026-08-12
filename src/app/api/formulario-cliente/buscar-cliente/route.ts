import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";

interface FilaClienteSql {
  codigo: string; nombre: string; dni_cif: string | null; telefono: string | null;
  email: string | null; direccion: string | null; cp: string | null; localidad: string | null; provincia: string | null;
}

/**
 * Autocompleta el formulario público por DNI/CIF o teléfono ya
 * registrados — reproduce apiBuscarClientePorDniPublico() (Apps Script).
 * Sin sesión a propósito (igual que el resto de /api/formulario-cliente):
 * el backend solo hace coincidencia EXACTA, así que no sirve para buscar
 * a otras personas, solo para autocompletar los propios datos.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dni = searchParams.get("dni") || "";
  const telefono = searchParams.get("telefono") || "";

  try {
    const data = await kelatosApiGet<{ ok: boolean; cliente: FilaClienteSql | null }>("/v1/formulario/buscar-cliente", { dni, telefono });
    if (!data.cliente) return NextResponse.json({ ok: true, cliente: null });

    const c = data.cliente;
    return NextResponse.json({
      ok: true,
      cliente: {
        nombre: c.nombre || "",
        dniCif: c.dni_cif || "",
        telefono: c.telefono || "",
        email: c.email || "",
        direccion: c.direccion || "",
        cp: c.cp || "",
        localidad: c.localidad || "",
        provincia: c.provincia || "",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
