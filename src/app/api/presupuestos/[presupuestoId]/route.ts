import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosPresupuestoForm } from "@/lib/presupuesto-form";

interface RespuestaPresupuesto {
  ok: boolean;
  presupuesto: Record<string, unknown>;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ presupuestoId: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { presupuestoId } = await params;
  const datos = (await req.json()) as DatosPresupuestoForm;

  if (datos.manoObra < 0) return NextResponse.json({ ok: false, error: "La mano de obra no puede ser negativa" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<RespuestaPresupuesto>(
      `/v1/presupuestos/${encodeURIComponent(presupuestoId)}`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        datos: {
          elaboradoPor: datos.elaboradoPor.trim() || usuario,
          descripcion: datos.descripcion.trim(),
          notas: datos.notas.trim(),
          manoObra: datos.manoObra,
          diasEntrega: datos.diasEntrega,
          tipoPieza: datos.piezas.length > 0 ? datos.tipoPieza : "no",
        },
        piezas: datos.piezas,
      },
      "PATCH"
    );

    return NextResponse.json({ ok: true, presupuesto: resultado.presupuesto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ presupuestoId: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { presupuestoId } = await params;

  try {
    await kelatosApiPost(
      `/v1/presupuestos/${encodeURIComponent(presupuestoId)}`,
      { requestId: crypto.randomUUID(), usuario },
      "DELETE"
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
