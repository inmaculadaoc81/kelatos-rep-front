/** Lectura de listas de empresas desde un CSV, un TSV o lo pegado desde Excel. Sin dependencias: lo justo para que no se rompan las comillas ni las tildes. */

export type CampoImportacion = "empresa" | "telefono" | "telefono2" | "contacto" | "cargo" | "email" | "web" | "ciudad" | "sector" | "notas";

export const CAMPOS: { campo: CampoImportacion; etiqueta: string; obligatorio?: boolean }[] = [
  { campo: "empresa", etiqueta: "Empresa", obligatorio: true },
  { campo: "telefono", etiqueta: "Teléfono", obligatorio: true },
  { campo: "telefono2", etiqueta: "Otro teléfono" },
  { campo: "contacto", etiqueta: "Persona de contacto" },
  { campo: "cargo", etiqueta: "Cargo" },
  { campo: "email", etiqueta: "Correo" },
  { campo: "web", etiqueta: "Web" },
  { campo: "ciudad", etiqueta: "Ciudad" },
  { campo: "sector", etiqueta: "Sector" },
  { campo: "notas", etiqueta: "Notas" },
];

const SINONIMOS: Record<CampoImportacion, RegExp> = {
  empresa: /^(empresa|nombre( de la)? empresa|raz[oó]n social|nombre comercial|negocio|company|nombre|name|cliente)$/i,
  telefono: /^(tel[eé]fono( principal| 1)?|tel|tlf|tfno|m[oó]vil|movil|phone|celular|whatsapp|n[uú]mero)$/i,
  telefono2: /^(tel[eé]fono 2|otro tel[eé]fono|tel 2|tlf 2|m[oó]vil 2|phone 2|segundo tel[eé]fono)$/i,
  contacto: /^(contacto|persona( de contacto)?|responsable|nombre contacto|interlocutor|contact|decisor)$/i,
  cargo: /^(cargo|puesto|posici[oó]n|rol|job|title)$/i,
  email: /^(e-?mail|correo( electr[oó]nico)?|mail)$/i,
  web: /^(web|website|p[aá]gina( web)?|url|sitio( web)?|dominio)$/i,
  ciudad: /^(ciudad|localidad|poblaci[oó]n|municipio|city|provincia)$/i,
  sector: /^(sector|actividad|categor[ií]a|cnae|giro|industria|tipo( de negocio)?)$/i,
  notas: /^(notas?|observaciones?|comentarios?|notes?)$/i,
};

/** Decodifica el archivo: UTF-8 y, si tiene bytes que no lo son (típico de un CSV de Excel en español), Windows-1252. */
export function decodificar(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/** Convierte el texto en filas de celdas. Detecta el separador (tabulador, «;» o «,») y respeta las comillas. */
export function parsearTabla(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "");
  const primera = limpio.split(/\r?\n/, 1)[0] || "";
  const cuenta = (c: string) => (primera.match(new RegExp(c === "\t" ? "\\t" : `\\${c}`, "g")) || []).length;
  const separador = [["\t", cuenta("\t")], [";", cuenta(";")], [",", cuenta(",")]].sort((a, b) => (b[1] as number) - (a[1] as number))[0][0] as string;
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (entreComillas) {
      if (c === '"' && limpio[i + 1] === '"') { celda += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else celda += c;
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === separador) {
      fila.push(celda); celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(celda); celda = "";
      if (fila.some((x) => x.trim() !== "")) filas.push(fila);
      fila = [];
    } else {
      celda += c;
    }
  }
  fila.push(celda);
  if (fila.some((x) => x.trim() !== "")) filas.push(fila);
  return filas.map((f) => f.map((x) => x.trim()));
}

/** Adivina qué columna es cada campo a partir de la cabecera. -1 = ninguna. */
export function adivinarMapa(cabecera: string[]): Record<CampoImportacion, number> {
  const mapa = {} as Record<CampoImportacion, number>;
  const usadas = new Set<number>();
  // «Teléfono 2» primero para que «Teléfono» no se lo quede.
  const orden: CampoImportacion[] = ["telefono2", "empresa", "telefono", "contacto", "cargo", "email", "web", "ciudad", "sector", "notas"];
  for (const campo of orden) {
    const i = cabecera.findIndex((h, idx) => !usadas.has(idx) && SINONIMOS[campo].test(h.trim()));
    mapa[campo] = i;
    if (i >= 0) usadas.add(i);
  }
  return mapa;
}

export interface FilaImportacion {
  empresa: string; telefono: string; telefono2?: string; contacto?: string; cargo?: string; email?: string; web?: string; ciudad?: string; sector?: string; notas?: string;
  datos?: Record<string, string>;
}

/** Construye las filas a enviar según el mapa elegido. Las columnas sin asignar se guardan como datos extra (se ven en la ficha). */
export function construirFilas(filas: string[][], cabecera: string[] | null, mapa: Record<CampoImportacion, number>): FilaImportacion[] {
  const usadas = new Set(Object.values(mapa).filter((i) => i >= 0));
  return filas.map((f) => {
    const g = (campo: CampoImportacion) => (mapa[campo] >= 0 ? (f[mapa[campo]] || "").trim() : "");
    const extra: Record<string, string> = {};
    if (cabecera) f.forEach((v, i) => { if (!usadas.has(i) && v.trim() && cabecera[i]?.trim()) extra[cabecera[i].trim().slice(0, 60)] = v.trim().slice(0, 300); });
    return {
      empresa: g("empresa"), telefono: g("telefono"), telefono2: g("telefono2") || undefined, contacto: g("contacto") || undefined, cargo: g("cargo") || undefined,
      email: g("email") || undefined, web: g("web") || undefined, ciudad: g("ciudad") || undefined, sector: g("sector") || undefined, notas: g("notas") || undefined,
      datos: Object.keys(extra).length ? extra : undefined,
    };
  });
}
