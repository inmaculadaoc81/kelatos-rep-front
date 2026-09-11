import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id, messageId } = await params;
  try {
    const body = await req.json();
    const r = await kelatosApiPost<Record<string, unknown>>(
      `/v1/campaigns/${encodeURIComponent(id)}/linkedin-messages/${encodeURIComponent(messageId)}`,
      { status: body.status, usuario: session.user.email },
      "PATCH",
    );
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 502 });
  }
}
