// Genera la base de conocimiento del asistente de ayuda (burbuja inferior derecha del dashboard).
// Lee el código de la propia aplicación (vistas, diálogos, rutas de API y lógica en src/lib) y lo trocea
// en fragmentos buscables: el asistente recupera los más relevantes para cada pregunta y se los pasa a la IA
// como contexto. Se ejecuta a mano cuando cambie el código:  npm run asistente:conocimiento
//
// El resultado (src/lib/asistente/conocimiento.json) solo contiene código y comentarios, nunca datos de
// clientes ni credenciales: cualquier cosa con pinta de secreto se enmascara antes de guardarla.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(raiz, "src");
const salida = path.join(src, "lib", "asistente", "conocimiento.json");

const MAX_FRAGMENTO = 2200;
const EXCLUIR_DIR = new Set(["node_modules", ".next", "ui", "ai-elements", "types"]);
const EXCLUIR_ARCHIVO = /(\.d\.ts|\.test\.tsx?|conocimiento\.json)$/;
// Código inmenso y sin valor explicativo (iconos, tablas de datos): se omite.
const EXCLUIR_RUTA = [/lib\/icons\.tsx$/, /lib\/asistente\//, /\/agentes-v2\//, /components\/agentes-v2\//];

function listar(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!EXCLUIR_DIR.has(e.name)) listar(path.join(dir, e.name), acc);
    } else if (/\.(ts|tsx)$/.test(e.name) && !EXCLUIR_ARCHIVO.test(e.name)) {
      acc.push(path.join(dir, e.name));
    }
  }
  return acc;
}

function enmascarar(texto) {
  return texto
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[SECRETO]")
    .replace(/\b[A-Fa-f0-9]{40,}\b/g, "[SECRETO]")
    .replace(/(Bearer\s+)[A-Za-z0-9._-]{20,}/g, "$1[SECRETO]")
    .replace(/((?:token|secret|password|api[_-]?key)\s*[:=]\s*["'`])[^"'`\s]{12,}(["'`])/gi, "$1[SECRETO]$2");
}

/** Mapa del menú lateral: grupo -> pantallas (nombre + ruta). */
function mapaMenu() {
  const nav = fs.readFileSync(path.join(src, "app", "(app)", "navegacion.tsx"), "utf8");
  // Contabilidad y Admin solo las ven administradores: van en un fragmento aparte (id "menu-admin") para que el
  // asistente no se lo enseñe a quien no tiene esas pantallas.
  const lineas = [];
  const lineasAdmin = [];
  const rutas = new Map();
  let grupo = "";
  let destino = lineas;
  for (const l of nav.split(/\r?\n/)) {
    const g = l.match(/^\s*titulo:\s*"([^"]+)"/);
    if (g) {
      grupo = g[1];
      destino = grupo === "Contabilidad" || grupo === "Admin" ? lineasAdmin : lineas;
      destino.push(`\nGrupo del menú «${grupo}»:`);
      continue;
    }
    const it = l.match(/label:\s*"([^"]+)",\s*href:\s*(?:"([^"]+)"|null)/);
    if (it) {
      destino.push(`- «${it[1]}»${it[2] ? ` (ruta ${it[2]})` : " (aún no disponible)"}`);
      if (it[2]) rutas.set(it[2], `${grupo} > ${it[1]}`);
    }
  }
  return { texto: lineas.join("\n"), textoAdmin: lineasAdmin.join("\n"), rutas };
}

function rutaUrl(rel) {
  // src/app/(app)/efectivo/page.tsx -> /efectivo ; src/app/api/x/route.ts -> /api/x
  const m = rel.replace(/^src\/app\//, "").replace(/\/(page|route)\.tsx?$/, "").replace(/\([^)]*\)\/?/g, "");
  return "/" + m.replace(/\/$/, "");
}

const menu = mapaMenu();
const fragmentos = [];

fragmentos.push({
  id: "menu",
  ruta: "src/app/(app)/navegacion.tsx",
  titulo: "Mapa del menú lateral del sistema",
  modulo: "General",
  texto:
    "MAPA DEL MENÚ: estas son las pantallas (vistas) del dashboard de Kelatos, agrupadas como en el menú lateral." + menu.texto,
});
fragmentos.push({
  id: "menu-admin",
  ruta: "src/app/(app)/navegacion.tsx",
  titulo: "Mapa del menú: pantallas solo para administradores (Contabilidad y Admin)",
  modulo: "General",
  texto: "MAPA DEL MENÚ (solo administradores): pantallas de Contabilidad y Admin." + menu.textoAdmin,
});

for (const abs of listar(src)) {
  const rel = path.relative(raiz, abs).replace(/\\/g, "/");
  if (EXCLUIR_RUTA.some((r) => r.test(rel))) continue;
  const contenido = enmascarar(fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n"));
  if (contenido.trim().length < 40) continue;

  const url = /\/(page|route)\.tsx?$/.test(rel) ? rutaUrl(rel) : null;
  const modulo = (url && menu.rutas.get(url)) || (url ? `Ruta ${url}` : "");
  const titulo = `${rel}${modulo ? ` — ${modulo}` : ""}`;

  // Troceo por líneas hasta MAX_FRAGMENTO caracteres.
  let actual = "";
  let n = 0;
  const partes = [];
  for (const linea of contenido.split("\n")) {
    if (actual.length + linea.length + 1 > MAX_FRAGMENTO && actual) {
      partes.push(actual);
      actual = "";
    }
    actual += linea.slice(0, 400) + "\n";
  }
  if (actual.trim()) partes.push(actual);

  for (const p of partes) {
    n++;
    fragmentos.push({
      id: `${rel}#${n}`,
      ruta: rel,
      titulo: partes.length > 1 ? `${titulo} (parte ${n}/${partes.length})` : titulo,
      modulo,
      texto: p,
    });
  }
}

fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, JSON.stringify(fragmentos));
const kb = Math.round(fs.statSync(salida).size / 1024);
console.log(`Base de conocimiento: ${fragmentos.length} fragmentos, ${kb} KB -> ${path.relative(raiz, salida)}`);
