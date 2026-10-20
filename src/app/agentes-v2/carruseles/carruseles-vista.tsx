"use client";

import { useState } from "react";
import { CarruselesLista } from "../departamentos/[key]/social/carruseles-lista";
import { EditorCarrusel } from "../departamentos/[key]/social/editor-carrusel";

/** Lista de carruseles de la marca y su editor, los mismos del departamento Redes sociales, en una pantalla propia. */
export function CarruselesVista() {
  const [abierto, setAbierto] = useState<number | null>(null);
  return abierto === null ? <CarruselesLista onAbrir={setAbierto} /> : <EditorCarrusel key={abierto} id={abierto} onVolver={() => setAbierto(null)} />;
}
