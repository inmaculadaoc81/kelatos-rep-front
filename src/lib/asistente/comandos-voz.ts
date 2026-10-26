/**
 * Órdenes del asistente (fase 2): reconoce, SIN IA y al instante, un conjunto cerrado de órdenes de navegación y apertura de
 * pantallas («abre el resguardo 19538», «crea un presupuesto para el 19538», «ve a Compras»…). Funciona igual con voz y con texto.
 * Estas órdenes SOLO abren pantallas y formularios: nunca guardan nada; la persona revisa y pulsa ella misma.
 * Lo que no encaja con ninguna orden se pasa al asistente de ayuda de siempre (preguntas).
 */

export type AccionResguardo = "presupuesto" | "pedido" | "finalizar";

export type Comando =
  | { tipo: "abrir_resguardo"; resguardo: string }
  | { tipo: "accion_resguardo"; resguardo: string; accion: AccionResguardo }
  | { tipo: "nueva_reparacion" }
  | { tipo: "ir"; ruta: string; nombre: string };

const normalizar = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!«»"“”]/g, " ").replace(/\s+/g, " ").trim();

// ── Números dichos en voz alta («diecinueve mil quinientos treinta y ocho», «uno nueve cinco tres ocho») ──
const DIGITOS: Record<string, number> = { cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9 };
const ESPECIALES: Record<string, number> = {
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26,
  veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const DECENAS: Record<string, number> = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const CENTENAS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600,
  setecientos: 700, ochocientos: 800, novecientos: 900,
};

const esPalabraNumero = (w: string) => w in DIGITOS || w in ESPECIALES || w in DECENAS || w in CENTENAS || w === "mil";

/** Valor de una secuencia de palabras numéricas (admite «y»). */
function valorDeSecuencia(palabras: string[]): number {
  let total = 0;
  let parcial = 0;
  for (const w of palabras) {
    if (w === "y") continue;
    if (w === "mil") {
      total += (parcial || 1) * 1000;
      parcial = 0;
    } else if (w in CENTENAS) parcial += CENTENAS[w];
    else if (w in DECENAS) parcial += DECENAS[w];
    else if (w in ESPECIALES) parcial += ESPECIALES[w];
    else if (w in DIGITOS) parcial += DIGITOS[w];
  }
  return total + parcial;
}

/** Sustituye por cifras las secuencias de palabras numéricas del texto ya normalizado. */
function palabrasANumeros(t: string): string {
  const tokens = t.split(" ");
  const salida: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (!esPalabraNumero(tokens[i])) {
      salida.push(tokens[i]);
      i++;
      continue;
    }
    let j = i;
    while (j < tokens.length && (esPalabraNumero(tokens[j]) || (tokens[j] === "y" && j + 1 < tokens.length && esPalabraNumero(tokens[j + 1]) && j > i))) j++;
    const grupo = tokens.slice(i, j);
    const soloDigitos = grupo.length >= 2 && grupo.every((w) => w in DIGITOS);
    salida.push(soloDigitos ? grupo.map((w) => DIGITOS[w]).join("") : String(valorDeSecuencia(grupo)));
    i = j;
  }
  return salida.join(" ");
}

/** Primer número de 3 a 8 cifras del texto (admite «19 538», «19.538» o «19538»). */
export function extraerNumero(texto: string): string | null {
  const t = palabrasANumeros(normalizar(texto));
  const grupos = t.match(/\d[\d.,\s]*\d|\d/g) || [];
  for (const g of grupos) {
    const limpio = g.replace(/[.,\s]/g, "");
    if (limpio.length >= 3 && limpio.length <= 8) return limpio;
  }
  return null;
}

const PANTALLAS: { claves: RegExp; ruta: string; nombre: string }[] = [
  { claves: /\b(libro de compras|facturas recibidas|facturas de proveedores)\b/, ruta: "/facturas-recibidas", nombre: "Libro de Compras" },
  { claves: /\b(facturas de clientes|facturas emitidas|facturacion|facturas)\b/, ruta: "/facturas-clientes", nombre: "Facturas de Clientes" },
  { claves: /\b(stock de piezas|stock|piezas|repuestos)\b/, ruta: "/stock-piezas", nombre: "Stock de Piezas" },
  { claves: /\b(equipos de alquiler|alquileres|alquiler|equipos)\b/, ruta: "/equipos", nombre: "Equipos de Alquiler" },
  { claves: /\b(compras|pedidos de piezas|pedidos)\b/, ruta: "/compras", nombre: "Compras" },
  { claves: /\b(ventas|venta de piezas)\b/, ruta: "/ventas", nombre: "Ventas" },
  { claves: /\b(tpv|facturacion del dia|caja del dia)\b/, ruta: "/tpv", nombre: "Facturación del día (TPV)" },
  { claves: /\b(efectivo|caja)\b/, ruta: "/efectivo", nombre: "Efectivo" },
  { claves: /\b(clientes|cliente)\b/, ruta: "/clientes", nombre: "Clientes" },
  { claves: /\b(presupuestos)\b/, ruta: "/presupuestos", nombre: "Presupuestos" },
  { claves: /\b(proveedores)\b/, ruta: "/proveedores", nombre: "Proveedores" },
  { claves: /\b(casilleros)\b/, ruta: "/casilleros", nombre: "Casilleros" },
  { claves: /\b(recogidas)\b/, ruta: "/recogidas", nombre: "Recogidas" },
  { claves: /\b(tareas)\b/, ruta: "/tareas", nombre: "Tareas" },
  { claves: /\b(reparaciones|todas las reparaciones)\b/, ruta: "/reparaciones", nombre: "Reparaciones" },
  { claves: /\b(inicio|panel principal)\b/, ruta: "/", nombre: "Inicio" },
];

const VERBO_ABRIR = /\b(abre|abrir|abreme|abrime|muestra|muestrame|ensename|ensena|ver|ve|ir|vamos|llevame|dame|busca|buscar|pon|ponme|saca|sacame|quiero ver|necesito ver)\b/;
const VERBO_CREAR = /\b(crea|crear|creame|nuevo|nueva|hacer|haz|hazme|generar|genera|preparar|prepara|elaborar|elabora|redactar|redacta|anadir|anade|agregar|agrega|registrar|registra|quiero|necesito|pedir|pide)\b/;

/** Interpreta una frase. Devuelve null si no es una orden (entonces es una pregunta para el asistente). */
export function interpretar(texto: string): Comando | null {
  const t = normalizar(texto);
  if (!t || t.length > 160) return null;
  const numero = extraerNumero(t);
  // Una pregunta («¿qué estado tiene el 19538?», «cuándo se generó…») no es una orden.
  if (/^(que|cual|cuales|cuando|cuanto|cuantos|quien|como|por que|donde)\b/.test(t) && !VERBO_ABRIR.test(t) && !VERBO_CREAR.test(t)) return null;

  const dicePresupuesto = /\b(presupuesto|presupuestos|ppto|pptos|ppt|pto|presu)\b/.test(t);
  const diceReparacion = /\b(resguardo|reparacion|equipo|numero|n)\b/.test(t) || /\bnº\b/.test(texto.toLowerCase());

  if (numero && dicePresupuesto && VERBO_CREAR.test(t)) return { tipo: "accion_resguardo", resguardo: numero, accion: "presupuesto" };
  if (numero && /\b(pedido|pedidos|pieza|piezas|repuesto|repuestos)\b/.test(t) && VERBO_CREAR.test(t)) return { tipo: "accion_resguardo", resguardo: numero, accion: "pedido" };
  if (numero && /\b(terminar|termina|terminada|finalizar|finaliza|finalizada|reparado|reparada|completar|completa|cerrar|cierra)\b/.test(t) && (diceReparacion || /\bla\b|\bel\b/.test(t))) {
    return { tipo: "accion_resguardo", resguardo: numero, accion: "finalizar" };
  }
  if (numero && (VERBO_ABRIR.test(t) || diceReparacion)) {
    if (VERBO_ABRIR.test(t) || /\b(resguardo|reparacion)\b/.test(t)) return { tipo: "abrir_resguardo", resguardo: numero };
  }
  if (!numero && VERBO_CREAR.test(t) && /\b(reparacion|resguardo|recepcion|equipo)\b/.test(t) && /\b(nueva|nuevo|crear|crea|alta|registrar|registra|dar de alta)\b/.test(t)) {
    return { tipo: "nueva_reparacion" };
  }
  if (!numero && VERBO_ABRIR.test(t)) {
    for (const p of PANTALLAS) if (p.claves.test(t)) return { tipo: "ir", ruta: p.ruta, nombre: p.nombre };
  }
  return null;
}

/** Dirección que abre cada orden y frase con la que el asistente la confirma. */
export function resolver(c: Comando): { url: string; mensaje: string } {
  switch (c.tipo) {
    case "abrir_resguardo":
      return { url: `/reparaciones?resguardo=${c.resguardo}`, mensaje: `Abriendo el resguardo ${c.resguardo}.` };
    case "accion_resguardo": {
      const texto = { presupuesto: "el formulario del nuevo presupuesto", pedido: "el registro de un pedido de pieza", finalizar: "el cierre de la reparación" }[c.accion];
      return { url: `/reparaciones?resguardo=${c.resguardo}&accion=${c.accion}`, mensaje: `Abriendo el resguardo ${c.resguardo} y ${texto}. Revísalo y guárdalo tú.` };
    }
    case "nueva_reparacion":
      return { url: "/reparaciones?nueva=1", mensaje: "Abriendo el formulario de nueva reparación." };
    case "ir":
      return { url: c.ruta, mensaje: `Abriendo ${c.nombre}.` };
  }
}

// ───────────────────────── Confirmaciones, datos que faltan y ayuda ─────────────────────────

export type IntencionIncompleta = "abrir_resguardo" | AccionResguardo;

export type Analisis =
  | { tipo: "comando"; comando: Comando }
  | { tipo: "faltan"; intencion: IntencionIncompleta; pregunta: string }
  | { tipo: "aclarar"; pregunta: string }
  | { tipo: "ayuda" };

/** Cómo se lee una orden para pedir confirmación (el número va también cifra a cifra, que es donde más se falla al dictar). */
export function describir(c: Comando): string {
  const cifras = (n: string) => `${n} (${n.split("").join(", ")})`;
  switch (c.tipo) {
    case "abrir_resguardo":
      return `abrir el resguardo ${cifras(c.resguardo)}`;
    case "accion_resguardo": {
      const que = { presupuesto: "el formulario del nuevo presupuesto", pedido: "el registro de un pedido de pieza", finalizar: "el cierre de la reparación" }[c.accion];
      return `abrir el resguardo ${cifras(c.resguardo)} y ${que}`;
    }
    case "nueva_reparacion":
      return "abrir el formulario de nueva reparación";
    case "ir":
      return `ir a ${c.nombre}`;
  }
}

/** Reconstruye la orden cuando faltaba el número del resguardo y la persona ya lo ha dicho. */
export function completar(intencion: IntencionIncompleta, resguardo: string): Comando {
  return intencion === "abrir_resguardo" ? { tipo: "abrir_resguardo", resguardo } : { tipo: "accion_resguardo", resguardo, accion: intencion };
}

export const AYUDA_COMANDOS = `**Esto puedo hacer por orden** (escrita o hablada). Solo abro pantallas y formularios; tú revisas y guardas:

- «Abre el resguardo 19538»: abre el detalle de esa reparación.
- «Crea un presupuesto para el resguardo 19538»: abre el resguardo y el formulario del presupuesto.
- «Registra un pedido de pieza para el 19538»: abre el resguardo y el registro de pedido.
- «Termina la reparación 19538»: abre el resguardo y el cierre de la reparación.
- «Nueva reparación»: abre el formulario de alta.
- «Ve a Compras», «Stock de piezas», «Ventas», «Equipos de alquiler», «Facturas de clientes», «Libro de compras», «TPV», «Efectivo», «Clientes», «Presupuestos», «Proveedores», «Casilleros», «Recogidas», «Tareas»…

**Antes de abrir nada, si lo has dictado por voz, te pregunto para confirmarlo** (sí / no). Si me falta un dato, como el número de resguardo, te lo pido. Y puedes preguntarme cómo funciona cualquier pantalla o pedirme datos, como siempre.`;

const FRASE_AYUDA = /^(ayuda|ayudame|que puedes hacer|que sabes hacer|que ordenes|que comandos|que acciones|lista de ordenes|lista de acciones|lista de comandos|para que sirves)\b/;
const NO_ES_ORDEN = /\b(saber|significa|explica|explicame|funciona|funcionan|sirve|diferencia|por que)\b/;

/** Como `interpretar`, pero devuelve también cuándo falta un dato, cuándo hay que aclarar y cuándo piden ayuda. */
export function analizar(texto: string): Analisis | null {
  const t = normalizar(texto);
  if (!t || t.length > 160) return null;
  if (FRASE_AYUDA.test(t)) return { tipo: "ayuda" };

  const comando = interpretar(texto);
  if (comando) {
    // Dos pantallas distintas en la misma frase: no se adivina.
    if (comando.tipo === "ir") {
      const resto = t.replace(PANTALLAS.find((p) => p.ruta === comando.ruta)?.claves ?? /^$/, " ");
      const otra = PANTALLAS.find((p) => p.ruta !== comando.ruta && p.claves.test(resto));
      if (otra) return { tipo: "aclarar", pregunta: `¿Abro ${comando.nombre} o ${otra.nombre}? Dime solo una de las dos.` };
    }
    return { tipo: "comando", comando };
  }
  if (/^(que|cual|cuales|cuando|cuanto|cuantos|quien|como|por que|donde)\b/.test(t) || NO_ES_ORDEN.test(t)) return null;

  const numero = extraerNumero(t);
  const hayCifras = /\d/.test(palabrasANumeros(t));
  const dicePresupuesto = /\b(presupuesto|presupuestos|ppto|pptos|ppt|pto|presu)\b/.test(t);
  const diceResguardo = /\b(resguardo|reparacion)\b/.test(t);

  // Entiendo la orden pero falta (o no he entendido bien) el número del resguardo.
  if (!numero) {
    const pregunta = hayCifras
      ? "No he entendido bien el número del resguardo. Dímelo despacio, cifra a cifra (por ejemplo «uno nueve cinco tres ocho»)."
      : "¿Para qué resguardo? Dime el número.";
    if (dicePresupuesto && VERBO_CREAR.test(t)) return { tipo: "faltan", intencion: "presupuesto", pregunta: hayCifras ? pregunta : "¿Para qué resguardo es el presupuesto? Dime el número." };
    if (/\b(pedido|pedidos)\b/.test(t) && VERBO_CREAR.test(t)) return { tipo: "faltan", intencion: "pedido", pregunta: hayCifras ? pregunta : "¿Para qué resguardo es el pedido de pieza? Dime el número." };
    if (/\b(terminar|termina|terminada|finalizar|finaliza|finalizada|reparado|reparada|completar|completa|cerrar|cierra)\b/.test(t) && diceResguardo) return { tipo: "faltan", intencion: "finalizar", pregunta: hayCifras ? pregunta : "¿Qué reparación quieres terminar? Dime el número del resguardo." };
    if (diceResguardo && VERBO_ABRIR.test(t)) return { tipo: "faltan", intencion: "abrir_resguardo", pregunta: hayCifras ? pregunta : "¿Qué resguardo abro? Dime el número." };
  }
  // Parece una orden pero no sé cuál: se pide más detalle en vez de adivinar.
  if ((VERBO_CREAR.test(t) || VERBO_ABRIR.test(t)) && (dicePresupuesto || diceResguardo || /\b(pedido|pieza|piezas|factura|cliente)\b/.test(t))) {
    return { tipo: "aclarar", pregunta: "No estoy seguro de qué quieres que haga. Dime, por ejemplo: «abre el resguardo 19538», «crea un presupuesto para el 19538» o «ve a Compras». Si quieres ver todo lo que sé hacer, di «qué puedes hacer»." };
  }
  return null;
}

const AFIRMA = /^(si|vale|ok|okay|claro|correcto|exacto|hazlo|adelante|confirmo|confirmado|dale|venga|perfecto|eso es|asi es|de acuerdo|por favor|afirmativo)\b/;
const NIEGA = /^(no|cancela|cancelar|cancelalo|mejor no|nada|para|detente|olvidalo|dejalo|negativo|ni hablar)\b/;

/** Respuesta a una pregunta de confirmación: «si», «no» o «otra cosa» (que puede ser una corrección). */
export function respuestaSiNo(texto: string): "si" | "no" | "otra" {
  const t = normalizar(texto);
  // «No, el 19583»: niega y corrige con otro número; se trata como una corrección, no como un «no» a secas.
  if (NIEGA.test(t)) return extraerNumero(texto) ? "otra" : "no";
  if (AFIRMA.test(t)) return "si";
  return "otra";
}
