"use client";

import dynamic from "next/dynamic";

/**
 * El detalle es lo más pesado de la pantalla (formularios, gráficos de
 * progreso y el motor de animación) y solo hace falta al hacer clic en una
 * fila. Se carga bajo demanda, y además solo se monta cuando hay un
 * resguardo: si se dejara montado con `resguardo={null}`, Next descargaría
 * el chunk igualmente al pintar la tabla.
 */
const Detalle = dynamic(
  () => import("./detalle-dialog").then((mod) => mod.DetalleReparacionDialog),
  { ssr: false }
);

export function DetalleReparacionDialogLazy({
  resguardo,
  onOpenChange,
}: {
  resguardo: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!resguardo) return null;
  return <Detalle resguardo={resguardo} onOpenChange={onOpenChange} />;
}
