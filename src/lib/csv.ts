/**
 * Lector de CSV mínimo (RFC 4180): comillas dobles, saltos de línea dentro de
 * un campo, BOM y separador coma, punto y coma o tabulador (se detecta por la
 * primera línea). Devuelve las filas como listas de celdas.
 */

export function detectarSeparador(texto: string): string {
  const primera = texto.split(/\r?\n/, 1)[0] || "";
  const cuenta = (c: string) => primera.split(c).length - 1;
  const candidatos: [string, number][] = [[",", cuenta(",")], [";", cuenta(";")], ["\t", cuenta("\t")]];
  candidatos.sort((a, b) => b[1] - a[1]);
  return candidatos[0][1] > 0 ? candidatos[0][0] : ",";
}

export function parsearCsv(entrada: string): string[][] {
  const texto = entrada.replace(/^﻿/, "");
  const sep = detectarSeparador(texto);
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        celda += c;
      }
      continue;
    }
    if (c === '"') entreComillas = true;
    else if (c === sep) {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(celda);
      celda = "";
      if (fila.some((x) => x.trim() !== "")) filas.push(fila);
      fila = [];
    } else {
      celda += c;
    }
  }
  fila.push(celda);
  if (fila.some((x) => x.trim() !== "")) filas.push(fila);
  return filas;
}
