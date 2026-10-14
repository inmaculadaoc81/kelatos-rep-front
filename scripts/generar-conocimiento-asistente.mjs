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

// ───────────────────────── Fichas de pantalla (inventario real de la interfaz) ─────────────────────────
// El código en bruto no basta para explicar una pantalla: el asistente llegó a inventarse botones que no existen.
// Aquí se extrae, de cada pantalla y diálogo, lo que de verdad se ve y se puede hacer (botones, títulos y
// descripciones de ventanas, columnas, filtros, campos, avisos) y las condiciones de permiso (puedeX, esAdmin...),
// y se guarda como una "FICHA" con prioridad en la búsqueda. Es texto extraído tal cual del código, no inventado.
function textosDe(fragmentoJsx) {
  const out = [];
  // Cadenas literales (dentro de expresiones {cond ? "A" : "B"}) y texto suelto entre etiquetas.
  for (const m of fragmentoJsx.matchAll(/"([^"\n]{2,90})"|'([^'\n]{2,90})'|`([^`\n$]{2,90})`/g)) out.push((m[1] ?? m[2] ?? m[3]).trim());
  const plano = fragmentoJsx.replace(/\{[^{}]*\}/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (plano.length >= 2) out.push(plano);
  // Se descartan valores técnicos (enumeraciones en minúsculas, clases CSS, rutas, código).
  return out.filter((t) => /[A-Za-zÁÉÍÓÚáéíóúñÑ]{2}/.test(t) && !/^[a-z0-9_.:/-]+$/.test(t) && !/^(size|text|bg|border|gap|flex|grid|h|w|px|py|mt|mb|ml|mr)-/.test(t) && !/[=;(){}]|^\/|^@|\.(tsx?|css)$|^\w+\.\w+/.test(t));
}

function fichaDeArchivo(contenido) {
  const sec = { explicacion: new Set(), botones: new Set(), ventanas: new Set(), columnas: new Set(), campos: new Set(), filtros: new Set(), avisos: new Set(), titulos: new Set() };
  const toma = (re, destino, max = 120) => {
    for (const m of contenido.matchAll(re)) for (const t of textosDe(m[1])) if (t.length <= max) destino.add(t);
  };
  // Las etiquetas pueden llevar funciones flecha en sus atributos (onClick={() => ...}), que contienen ">":
  // el patrón de atributos admite "=>" para no cortar la etiqueta ahí.
  const etiqueta = (nombres, largo) => new RegExp(`<(?:${nombres})\\b(?:=>|[^>])*?>([\\s\\S]{0,${largo}}?)<\\/(?:${nombres})>`, "g");
  toma(etiqueta("Button|DropdownMenuItem|TabsTrigger|Link", 400), sec.botones);
  toma(etiqueta("DialogTitle|SheetTitle|AlertDialogTitle", 300), sec.ventanas);
  toma(etiqueta("DialogDescription|SheetDescription|AlertDialogDescription", 500), sec.ventanas, 400);
  toma(etiqueta("TableHead", 120), sec.columnas);
  toma(etiqueta("Label|FormLabel", 200), sec.campos);
  toma(etiqueta("SelectItem", 100), sec.filtros);
  toma(etiqueta("h1|h2|h3", 160), sec.titulos);
  // Cajas de explicación que la propia pantalla muestra al usuario (p. ej. InfoVista en Contabilidad).
  toma(etiqueta("InfoVista|Alert|AlertDescription", 900), sec.explicacion, 700);
  for (const m of contenido.matchAll(/descripcion=(?:"([^"\n]{10,300})"|\{([^}\n]{10,500})\})/g)) for (const t of textosDe(m[1] ?? m[2])) if (t.length >= 10 && t.length <= 300) sec.explicacion.add(t);
  for (const m of contenido.matchAll(/(?:placeholder|title|aria-label)="([^"\n]{3,140})"/g)) (m[0].startsWith("placeholder") ? sec.campos : sec.botones).add(m[1].trim());
  for (const m of contenido.matchAll(/toast\.(?:success|error|info|warning)\(\s*[`"']([^`"'$\n]{4,160})/g)) sec.avisos.add(m[1].trim());

  // Permisos: condiciones que dicen quién puede ver o hacer algo.
  const permisos = new Map();
  for (const linea of contenido.split("\n")) {
    const ids = linea.match(/\b(puede[A-Z]\w+|es(?:Admin|Superadmin|CuentaEmpleadosRestringida|SoloAsistencia)|soloLectura|accesoCompleto|cuentaRestringida|bloqueado|esAdministrador)\b/g);
    if (!ids) continue;
    // Se prefieren las líneas de USO (`{puedeX && ...}`) a las de declaración (`useState`, `const [..]`).
    if (/useState|const \[|import /.test(linea)) continue;
    for (const id of new Set(ids)) if (!permisos.has(id)) permisos.set(id, linea.trim().slice(0, 170));
  }
  return { sec, permisos };
}

const FICHA_ROTULOS = [
  ["explicacion", "Explicación que la propia pantalla muestra al usuario"],
  ["titulos", "Títulos y secciones"],
  ["botones", "Botones, acciones y ayudas (textos visibles)"],
  ["ventanas", "Ventanas/diálogos (título y explicación)"],
  ["columnas", "Columnas de tablas"],
  ["campos", "Campos y formularios"],
  ["filtros", "Opciones de filtros/desplegables"],
  ["avisos", "Mensajes que muestra el sistema"],
];

for (const abs of listar(path.join(src, "app"))) {
  const rel = path.relative(raiz, abs).replace(/\\/g, "/");
  if (!abs.endsWith(".tsx") || EXCLUIR_RUTA.some((r) => r.test(rel))) continue;
  const contenido = fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
  const { sec, permisos } = fichaDeArchivo(contenido);
  const total = Object.values(sec).reduce((s, x) => s + x.size, 0);
  if (total < 3) continue;
  const url = /\/page\.tsx$/.test(rel) ? rutaUrl(rel) : null;
  const carpeta = rel.replace(/\/[^/]+$/, "");
  const paginaDeLaCarpeta = rutaUrl(`${carpeta}/page.tsx`);
  const modulo = menu.rutas.get(url || paginaDeLaCarpeta) || (url ? `Ruta ${url}` : `Pantalla ${paginaDeLaCarpeta}`);
  const partes = [`FICHA (inventario real de la interfaz extraído del código) — ${modulo} — archivo ${rel}${url ? " (pantalla principal)" : " (ventana o componente de esa pantalla)"}`];
  for (const [clave, rotulo] of FICHA_ROTULOS) {
    if (!sec[clave].size) continue;
    partes.push(`${rotulo}: ${[...sec[clave]].slice(0, 40).join(" | ")}`);
  }
  if (permisos.size) {
    partes.push("Condiciones de permiso en el código (quién ve o puede hacer qué): " + [...permisos.entries()].slice(0, 8).map(([id, l]) => `${id} ← «${l}»`).join(" ;; "));
  }
  fragmentos.push({
    id: `ficha:${rel}`,
    ruta: rel,
    titulo: `FICHA de pantalla: ${modulo} — ${rel.split("/").pop()}`,
    modulo,
    texto: partes.join("\n").slice(0, 4200),
  });
}

// ───────────────────────── Guías escritas a mano (docs/asistente/*.md) ─────────────────────────
// Explicaciones de pantallas y procesos redactadas y verificadas contra el código y los datos. Son la fuente
// MÁS fiable para el asistente (tienen prioridad en la búsqueda). Se trocean por secciones "## ". Un archivo
// cuyo nombre empieza por "admin-" solo se le explica a cuentas con acceso total.
const dirGuias = path.join(raiz, "docs", "asistente");
if (fs.existsSync(dirGuias)) {
  for (const nombre of fs.readdirSync(dirGuias).sort()) {
    if (!nombre.endsWith(".md")) continue;
    const md = fs.readFileSync(path.join(dirGuias, nombre), "utf8").replace(/\r\n/g, "\n");
    const titulo1 = (md.match(/^#\s+(.+)$/m) || [null, nombre])[1].trim();
    const secciones = md.split(/^(?=##\s)/m);
    let n = 0;
    for (const sec of secciones) {
      if (sec.trim().length < 30) continue;
      const titSec = (sec.match(/^##\s+(.+)$/m) || [null, "Resumen"])[1].trim();
      // Una sección larga se trocea; cada trozo repite el título para que se entienda por sí solo.
      let pedazo = "";
      const trozos = [];
      for (const linea of sec.split("\n")) {
        if (pedazo.length + linea.length > MAX_FRAGMENTO && pedazo) { trozos.push(pedazo); pedazo = ""; }
        pedazo += linea + "\n";
      }
      if (pedazo.trim()) trozos.push(pedazo);
      for (const t of trozos) {
        n++;
        fragmentos.push({
          id: `guia:${nombre}#${n}`,
          ruta: `docs/asistente/${nombre}`,
          titulo: `GUÍA verificada: ${titulo1} — ${titSec}`,
          modulo: titulo1,
          texto: `GUÍA «${titulo1}» (sección ${titSec})\n${t}`,
        });
      }
    }
  }
}

fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, JSON.stringify(fragmentos));
const kb = Math.round(fs.statSync(salida).size / 1024);
console.log(`Base de conocimiento: ${fragmentos.length} fragmentos, ${kb} KB -> ${path.relative(raiz, salida)}`);
