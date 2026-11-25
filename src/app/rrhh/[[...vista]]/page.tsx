import { redirect } from "next/navigation";
import { RrhhContenido, type Vista } from "../rrhh-contenido";

export default async function RrhhPage({ params }: { params: Promise<{ vista?: string[] }> }) {
  const v = (await params).vista?.[0];
  if (v !== "correo" && v !== "comunicados" && v !== "gestion") redirect("/rrhh/correo");
  return <RrhhContenido vista={v as Vista} />;
}
