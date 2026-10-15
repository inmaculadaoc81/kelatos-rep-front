/**
 * Búsqueda de fragmentos del código de la aplicación para el asistente de ayuda (burbuja del dashboard).
 * La base (conocimiento.json) la genera `npm run asistente:conocimiento` a partir de src/ — ver
 * scripts/generar-conocimiento-asistente.mjs. Solo se usa en el servidor (rutas de API).
 */

import { puedeLeerCodigo } from "./permisos";

interface Fragmento {
  id: string;
  ruta: string;
  titulo: string;
  modulo: string;
  texto: string;
}

interface Indexado {
  f: Fragmento;
  tf: Map<string, number>;
  len: number;
}

const PARADAS = new Set(
  ("el la los las un una unos unas de del al a en y o u que se es son por para con sin como mas muy ya no si " +
    "lo le les me mi tu su sus este esta esto estos estas eso esa ese hay ser esta estan donde cual cuales quien cuando " +
    "hacer hace puedo puede pueden tiene tienen sobre entre desde hasta pero porque " +
    "funciona funcionan explicame explica explicar dime quiero saber vista pantalla botones boton opciones tiene tengo hay sirve").split(" ")
);

function normalizar(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function tokenizar(t: string): string[] {
  return normalizar(t)
    .split(/[^a-z0-9_]+/)
    .filter((w) => w.length > 2 && !PARADAS.has(w));
}

let cache: { docs: Indexado[]; df: Map<string, number>; avgLen: number } | null = null;

async function indice() {
  if (cache) return cache;
  const mod = await import("./conocimiento.json");
  const fragmentos = (mod.default ?? mod) as Fragmento[];
  const docs: Indexado[] = fragmentos.map((f) => {
    const tokens = tokenizar(`${f.titulo} ${f.modulo} ${f.texto}`);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { f, tf, len: tokens.length };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  cache = { docs, df, avgLen: docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length) };
  return cache;
}

export interface FragmentoContexto {
  titulo: string;
  texto: string;
}

/**
 * Devuelve los `n` fragmentos más relevantes para la consulta. `ruta` es la pantalla en la que está el usuario
 * (p. ej. "/contabilidad/efectivo"): los fragmentos de esa pantalla puntúan más alto, porque lo normal es que
 * pregunte por lo que tiene delante.
 */
export async function buscarFragmentos(consulta: string, ruta: string, n = 6, areas: string[] = []): Promise<FragmentoContexto[]> {
  const { docs, df, avgLen } = await indice();
  const q = [...new Set(tokenizar(consulta))];
  // "¿Qué hace esta pantalla?" no tiene palabras útiles (todas son de relleno): se busca por el nombre de la pantalla
  // en la que está el usuario. Lo mismo si la pregunta es tan corta que no basta para localizar nada.
  if (q.length < 2 && ruta && ruta !== "/") {
    for (const t of tokenizar(ruta.replace(/[/\-_]+/g, " "))) if (!q.includes(t)) q.push(t);
  }
  if (!q.length) return [];
  const N = docs.length;
  const carpetaPantalla = ruta && ruta !== "/" ? `src/app/(app)${ruta}/` : null;

  const puntuados = docs.map((d) => {
    let s = 0;
    // Solo se puede explicar lo que la cuenta tiene permiso para ver (ver permisos.ts).
    if (!puedeLeerCodigo(d.f.id === "menu-admin" ? "menu-admin" : d.f.ruta, areas)) return { d, s };
    for (const t of q) {
      const f = d.tf.get(t);
      if (!f) continue;
      const dft = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - dft + 0.5) / (dft + 0.5));
      s += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (d.len / avgLen))));
    }
    if (s > 0 && carpetaPantalla && d.f.ruta.startsWith(carpetaPantalla)) s *= 1.6;
    if (d.f.id === "menu") s += 1; // el mapa del menú casi siempre ayuda a situarse
    // Las guías escritas y verificadas y las fichas de interfaz extraídas del código mandan sobre el código en bruto.
    if (s > 0 && d.f.id.startsWith("guia:")) s *= 2.2;
    else if (s > 0 && d.f.id.startsWith("ficha:")) s *= 1.35;
    return { d, s };
  });

  // Máximo 3 fragmentos por archivo: así la respuesta ve también otros archivos relacionados (la lógica suele
  // estar repartida entre la vista, su diálogo y src/lib).
  const porArchivo = new Map<string, number>();
  const elegidos: FragmentoContexto[] = [];
  for (const x of puntuados.filter((p) => p.s > 0).sort((a, b) => b.s - a.s)) {
    const usados = porArchivo.get(x.d.f.ruta) ?? 0;
    if (usados >= 3) continue;
    porArchivo.set(x.d.f.ruta, usados + 1);
    elegidos.push({ titulo: x.d.f.titulo, texto: x.d.f.texto });
    if (elegidos.length >= n) break;
  }
  return elegidos;
}
