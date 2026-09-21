import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { CATEGORIAS, CategoriaNotificacion, RespuestaNotificaciones, TIPOS_CONOCIDOS, tiposDeCategoria, tiposQueCoinciden } from "@/lib/notificaciones";

/**
 * Registro de notificaciones para el "Centro de notificaciones". El filtrado,
 * los KPI y la paginación los hace el backend (una sola consulta): el
 * navegador recibe una página (por defecto 100 filas) y los totales, no todo
 * el registro. `categoria` se traduce aquí a la lista de tipos que contiene.
 */
export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const params: Record<string, string | number | undefined> = {
      dias: p.get("dias") || "180",
      desde: p.get("desde") || undefined,
      hasta: p.get("hasta") || undefined,
      canal: p.get("canal") || undefined,
      tipo: p.get("tipo") || undefined,
      estado: p.get("estado") || undefined,
      limit: p.get("limit") || "100",
      offset: p.get("offset") || "0",
    };
    const q = p.get("q")?.trim();
    if (q) {
      params.q = q;
      const t = tiposQueCoinciden(q);
      if (t.length) params.tiposQ = t.join(",");
    }
    const categoria = p.get("categoria") as CategoriaNotificacion | null;
    if (categoria && categoria in CATEGORIAS) {
      if (categoria === "otros") params.tiposNo = TIPOS_CONOCIDOS.join(",");
      else params.tipos = tiposDeCategoria(categoria).join(",");
    }
    const data = await kelatosApiGet<RespuestaNotificaciones>("/v1/lecturas/centro-notificaciones", params);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
