import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

export interface ArchivoFormulario {
  resguardo: string;
  fechaRecepcion: string;
  clienteNombre: string;
  dniCif: string;
  equipoModelo: string;
  /** Nombres de archivo (no URLs) — resolver vía /api/formulario-cliente/archivo/[nombre]. */
  fotos: string[];
  firmaNombre: string;
}

interface FilaArchivoSql {
  resguardo: string;
  fecha_recepcion: string;
  cliente_nombre: string;
  dni_cif: string | null;
  equipo_modelo: string;
  foto_url: string | null;
  firma_url: string | null;
}

/**
 * Extrae el ID de archivo de Drive tanto del formato nuevo (ID a secas)
 * como del legado (URL completa "https://drive.google.com/uc?export=
 * view&id=XXXX", de cuando esto se subía con el mecanismo original de
 * Apps Script). Si no es ninguno de los dos, se devuelve tal cual — solo
 * puede pasar con datos de prueba antiguos ya inservibles.
 */
function extraerIdDrive(valor: string): string {
  const m = valor.match(/[?&]id=([^&]+)/);
  return m ? m[1] : valor;
}

/** GET — galería de fotos/firma recibidas por el formulario, filtrable por resguardo, nombre o DNI/CIF. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q") || "";

  try {
    const data = await kelatosApiGet<{ ok: boolean; items: FilaArchivoSql[] }>("/v1/lecturas/formulario/archivos", { q });
    const items: ArchivoFormulario[] = data.items.map((row) => ({
      resguardo: row.resguardo,
      fechaRecepcion: row.fecha_recepcion,
      clienteNombre: row.cliente_nombre,
      dniCif: row.dni_cif || "",
      equipoModelo: row.equipo_modelo,
      fotos: (row.foto_url || "").split(";").filter(Boolean).map(extraerIdDrive),
      firmaNombre: row.firma_url ? extraerIdDrive(row.firma_url) : "",
    }));
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
