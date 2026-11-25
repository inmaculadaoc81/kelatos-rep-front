import type { Metadata } from "next";
import { Decision } from "./decision";

export const metadata: Metadata = {
  title: "Tu presupuesto · Kelatos",
  robots: { index: false, follow: false },
  referrer: "no-referrer", // el enlace es secreto: no se envía a otras páginas
};

export default async function PaginaPresupuesto({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ vista?: string; accion?: string }> }) {
  const { token } = await params;
  const q = await searchParams;
  return <Decision token={token} vistaCorreo={q.vista === "correo"} accionInicial={q.accion === "rechazar" ? "rechazar" : q.accion === "aceptar" ? "aceptar" : null} />;
}
