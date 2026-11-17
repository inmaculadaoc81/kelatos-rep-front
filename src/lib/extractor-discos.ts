/**
 * Extractor de discos de clientes (2026-11-17) — se ejecuta ENTERO en el navegador del técnico (File System Access API, Chrome/Edge).
 * El dashboard no recibe ni guarda ningún dato del cliente: el navegador lee la carpeta de origen (solo lectura) y escribe en la carpeta
 * de destino que el técnico elige. Cada archivo se verifica con SHA-256 releyendo la copia.
 */

// ── Tipos mínimos de la File System Access API (TypeScript no los trae todos) ──
export interface ManejadorArchivo { kind: "file"; name: string; getFile(): Promise<File>; createWritable(): Promise<EscrituraArchivo> }
export interface EscrituraArchivo { write(d: BufferSource | Blob | string): Promise<void>; close(): Promise<void>; abort(): Promise<void> }
export interface ManejadorCarpeta {
  kind: "directory"; name: string;
  entries(): AsyncIterable<[string, ManejadorArchivo | ManejadorCarpeta]>;
  getDirectoryHandle(n: string, o?: { create?: boolean }): Promise<ManejadorCarpeta>;
  getFileHandle(n: string, o?: { create?: boolean }): Promise<ManejadorArchivo>;
  removeEntry(n: string): Promise<void>;
  isSameEntry(o: ManejadorCarpeta): Promise<boolean>;
  resolve(o: ManejadorCarpeta | ManejadorArchivo): Promise<string[] | null>;
}

export const navegadorCompatible = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

export async function elegirCarpeta(modo: "read" | "readwrite"): Promise<ManejadorCarpeta | null> {
  try {
    const f = (window as unknown as { showDirectoryPicker: (o: { mode: string }) => Promise<ManejadorCarpeta> }).showDirectoryPicker;
    return await f.call(window, { mode: modo });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null; // el técnico cerró el selector
    throw e;
  }
}

// ── Categorías (mismas que el extractor de Ubuntu) ──
export const CATEGORIAS: { id: string; nombre: string; detalle: string; ext: string[] }[] = [
  { id: "documentos", nombre: "Documentos", detalle: "Word, Excel, PDF, texto…", ext: "doc docx xls xlsx xlsm ppt pptx pdf odt ods odp txt csv rtf md".split(" ") },
  { id: "fotos", nombre: "Fotos", detalle: "JPG, PNG, HEIC, RAW…", ext: "jpg jpeg png gif bmp tif tiff heic webp raw cr2 nef arw dng".split(" ") },
  { id: "videos", nombre: "Vídeos", detalle: "MP4, MOV, AVI…", ext: "mp4 mov avi mkv wmv mpg mpeg m4v 3gp".split(" ") },
  { id: "musica", nombre: "Música", detalle: "MP3, WAV, FLAC…", ext: "mp3 wav flac m4a aac ogg wma".split(" ") },
  { id: "correo", nombre: "Correo", detalle: "Outlook, Thunderbird…", ext: "pst ost eml mbox msg".split(" ") },
  { id: "otros", nombre: "Otros programas", detalle: "Contabilidad, diseño, bases de datos, zip…", ext: "dwg dxf psd ai indd skp kdbx sqlite db accdb mdb zip rar 7z".split(" ") },
];
const IGNORAR = new Set(["windows", "program files", "program files (x86)", "programdata", "$recycle.bin", "system volume information", "recovery", "$windows.~bt", "appdata", "node_modules", ".cache", "proc", "sys", "dev", "lost+found", "perflogs"]);

export interface Fichero { handle: ManejadorArchivo; ruta: string[]; tam: number }
export interface ResumenCategoria { n: number; bytes: number }
export interface ProgresoBusqueda { n: number; bytes: number; actual: string }
export interface ResultadoBusqueda { ficheros: Fichero[]; resumen: Record<string, ResumenCategoria>; cancelado: boolean }

const pausa = () => new Promise<void>((r) => setTimeout(r, 0));

/** Recorre la carpeta de origen (solo lectura) y lista lo que hay que copiar. */
export async function buscar(
  raiz: ManejadorCarpeta, categorias: Set<string>, todo: boolean,
  alAvanzar: (p: ProgresoBusqueda) => void, cancelado: () => boolean,
): Promise<ResultadoBusqueda> {
  const porExt = new Map<string, string>();
  for (const c of CATEGORIAS) if (categorias.has(c.id)) for (const e of c.ext) porExt.set(e, c.id);
  const ficheros: Fichero[] = [];
  const resumen: Record<string, ResumenCategoria> = {};
  let bytes = 0;
  let ultimo = 0;
  const caminar = async (dir: ManejadorCarpeta, ruta: string[]): Promise<void> => {
    if (cancelado()) return;
    let entradas: [string, ManejadorArchivo | ManejadorCarpeta][] = [];
    try { for await (const e of dir.entries()) entradas.push(e); } catch { return; } // carpeta ilegible: se salta
    entradas = entradas.sort((a, b) => a[0].localeCompare(b[0]));
    for (const [nombre, h] of entradas) {
      if (cancelado()) return;
      if (h.kind === "directory") {
        if (IGNORAR.has(nombre.toLowerCase())) continue;
        await caminar(h, [...ruta, nombre]);
        continue;
      }
      const i = nombre.lastIndexOf(".");
      const ext = i >= 0 ? nombre.slice(i + 1).toLowerCase() : "";
      const cat = todo ? "todo" : porExt.get(ext);
      if (!cat) continue;
      let tam = 0;
      try { tam = (await h.getFile()).size; } catch { /* ilegible: se intentará al copiar y quedará en el informe */ }
      ficheros.push({ handle: h, ruta: [...ruta, nombre], tam });
      const r = (resumen[cat] ||= { n: 0, bytes: 0 });
      r.n += 1; r.bytes += tam; bytes += tam;
      const ahora = Date.now();
      if (ahora - ultimo > 150) { ultimo = ahora; alAvanzar({ n: ficheros.length, bytes, actual: [...ruta, nombre].join("/") }); await pausa(); }
    }
  };
  await caminar(raiz, []);
  alAvanzar({ n: ficheros.length, bytes, actual: "" });
  return { ficheros, resumen, cancelado: cancelado() };
}

// ── SHA-256 incremental (crypto.subtle no admite datos por trozos) ──
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export class Sha256 {
  private h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  private buf = new Uint8Array(64);
  private n = 0;
  private total = 0;
  private w = new Uint32Array(64);

  private bloque(b: Uint8Array, o: number) {
    const w = this.w, h = this.h;
    for (let t = 0; t < 16; t++) { const j = o + t * 4; w[t] = (b[j] << 24) | (b[j + 1] << 16) | (b[j + 2] << 8) | b[j + 3]; }
    for (let t = 16; t < 64; t++) {
      const x = w[t - 15], y = w[t - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let a = h[0], b2 = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[t] + w[t]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b2) ^ (a & c) ^ (b2 & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b2; b2 = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b2) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }

  update(d: Uint8Array): void {
    this.total += d.length;
    let i = 0;
    if (this.n) {
      const k = Math.min(64 - this.n, d.length);
      this.buf.set(d.subarray(0, k), this.n);
      this.n += k; i = k;
      if (this.n === 64) { this.bloque(this.buf, 0); this.n = 0; }
    }
    for (; i + 64 <= d.length; i += 64) this.bloque(d, i);
    if (i < d.length) { this.buf.set(d.subarray(i), 0); this.n = d.length - i; }
  }

  digest(): string {
    const bits = this.total * 8;
    const relleno = new Uint8Array((this.n < 56 ? 56 : 120) - this.n + 8);
    relleno[0] = 0x80;
    const pos = relleno.length - 8;
    const alto = Math.floor(bits / 2 ** 32), bajo = bits >>> 0;
    for (let k = 0; k < 4; k++) { relleno[pos + k] = (alto >>> (24 - 8 * k)) & 255; relleno[pos + 4 + k] = (bajo >>> (24 - 8 * k)) & 255; }
    this.update(relleno);
    return [...this.h].map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
  }
}

// ── Copia + verificación ──
export interface ProgresoCopia {
  fase: "copiando" | "verificando" | "terminado";
  hecho: number; total: number; bytes: number; bytesTotal: number;
  verifHecho: number; verifTotal: number; actual: string; errores: number;
}
export interface InformeCopia {
  carpeta: string; copiados: number; bytes: number; verificados: number;
  errores: string[]; fallosVerificacion: string[]; cancelado: boolean; informe: string; segundos: number;
}

const GRANDE = 64 * 1024 * 1024; // hasta este tamaño se lee de una vez y se usa el SHA-256 nativo del navegador (mucho más rápido)
async function hashNativo(buf: ArrayBuffer): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  return [...d].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function hashDeArchivo(a: File): Promise<string> {
  if (a.size <= GRANDE) return hashNativo(await a.arrayBuffer());
  const hash = new Sha256();
  const lector = a.stream().getReader();
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    hash.update(value);
  }
  return hash.digest();
}

const limpiar = (n: string) => n.replace(/[<>:"|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "_") || "_";

async function escribirTexto(dir: ManejadorCarpeta, nombre: string, texto: string) {
  const w = await (await dir.getFileHandle(nombre, { create: true })).createWritable();
  await w.write(texto);
  await w.close();
}

export async function copiar(op: {
  ficheros: Fichero[]; destino: ManejadorCarpeta; resguardo: string; nota: string; origenNombre: string;
  alAvanzar: (p: ProgresoCopia) => void; cancelado: () => boolean;
}): Promise<InformeCopia> {
  const inicio = Date.now();
  const fecha = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const nombreCarpeta = `${op.resguardo}_${fecha.getFullYear()}${p2(fecha.getMonth() + 1)}${p2(fecha.getDate())}_${p2(fecha.getHours())}${p2(fecha.getMinutes())}`;
  const base = await op.destino.getDirectoryHandle(nombreCarpeta, { create: true });
  const datos = await base.getDirectoryHandle("datos", { create: true });
  const bytesTotal = op.ficheros.reduce((s, f) => s + f.tam, 0);
  const p: ProgresoCopia = { fase: "copiando", hecho: 0, total: op.ficheros.length, bytes: 0, bytesTotal, verifHecho: 0, verifTotal: 0, actual: "", errores: 0 };
  const errores: string[] = [];
  const fallos: string[] = [];
  const manifiesto: { rel: string; destRuta: string[]; tam: number; hash: string }[] = [];
  const cache = new Map<string, ManejadorCarpeta>();
  let ultimo = 0;
  const avisar = (forzar = false) => { const t = Date.now(); if (forzar || t - ultimo > 250) { ultimo = t; op.alAvanzar({ ...p }); } };

  const carpetaDestino = async (ruta: string[]) => {
    let dir = datos;
    let acumulada = "";
    for (const parte of ruta) {
      acumulada += "/" + parte;
      let h = cache.get(acumulada);
      if (!h) { h = await dir.getDirectoryHandle(parte, { create: true }); cache.set(acumulada, h); }
      dir = h;
    }
    return dir;
  };

  for (const f of op.ficheros) {
    if (op.cancelado()) break;
    const rel = f.ruta.join("/");
    p.actual = rel;
    const limpia = f.ruta.map(limpiar);
    let dir: ManejadorCarpeta | null = null;
    let escritura: EscrituraArchivo | null = null;
    try {
      dir = await carpetaDestino(limpia.slice(0, -1));
      const archivo = await f.handle.getFile();
      const fh = await dir.getFileHandle(limpia[limpia.length - 1], { create: true });
      escritura = await fh.createWritable();
      let hex: string;
      if (archivo.size <= GRANDE) {
        const buf = await archivo.arrayBuffer();
        hex = await hashNativo(buf);
        await escritura.write(buf);
        p.bytes += buf.byteLength;
        avisar();
      } else {
        const hash = new Sha256();
        const lector = archivo.stream().getReader();
        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;
          hash.update(value);
          await escritura.write(value);
          p.bytes += value.length;
          avisar();
          if (op.cancelado()) throw new Error("cancelado");
        }
        hex = hash.digest();
      }
      await escritura.close();
      escritura = null;
      manifiesto.push({ rel, destRuta: limpia, tam: archivo.size, hash: hex });
    } catch (e) {
      if (escritura) await escritura.abort().catch(() => {});
      if (dir) await dir.removeEntry(limpia[limpia.length - 1]).catch(() => {});
      if (!op.cancelado()) { errores.push(`${rel}: ${e instanceof Error ? e.message : String(e)}`); p.errores = errores.length; }
    }
    p.hecho += 1;
    avisar();
  }

  const cancelado = op.cancelado();
  p.fase = "verificando"; p.verifTotal = manifiesto.length;
  avisar(true);
  let verificados = 0;
  if (!cancelado) {
    for (const m of manifiesto) {
      p.actual = m.rel;
      try {
        const dir = await carpetaDestino(m.destRuta.slice(0, -1));
        const archivo = await (await dir.getFileHandle(m.destRuta[m.destRuta.length - 1])).getFile();
        if ((await hashDeArchivo(archivo)) === m.hash) verificados += 1; else fallos.push(m.rel);
      } catch (e) {
        fallos.push(`${m.rel}: ${e instanceof Error ? e.message : String(e)}`);
      }
      p.verifHecho += 1;
      avisar();
    }
  }

  const segundos = Math.round((Date.now() - inicio) / 1000);
  const gb = (b: number) => (b / 1e9).toFixed(2);
  const lineas = [
    `Extracción de disco · resguardo ${op.resguardo}`,
    `Fecha: ${fecha.getFullYear()}-${p2(fecha.getMonth() + 1)}-${p2(fecha.getDate())} ${p2(fecha.getHours())}:${p2(fecha.getMinutes())}`,
    `Carpeta de origen: ${op.origenNombre} (abierta en SOLO LECTURA desde el navegador)`,
    `Destino: ${op.destino.name}/${nombreCarpeta}`,
    `Archivos copiados: ${manifiesto.length} de ${op.ficheros.length} (${gb(p.bytes)} GB) en ${Math.floor(segundos / 60)} min ${segundos % 60} s`,
    `Verificados con SHA-256: ${verificados} · Fallos de verificación: ${fallos.length}`,
    `Archivos que no se pudieron leer: ${errores.length}`,
  ];
  if (cancelado) lineas.push("", "COPIA CANCELADA POR EL TÉCNICO: puede estar incompleta.");
  if (op.nota) lineas.push(`Nota: ${op.nota}`);
  if (errores.length) lineas.push("", "NO COPIADOS (ilegibles):", ...errores.slice(0, 500));
  if (fallos.length) lineas.push("", "CON FALLO DE VERIFICACIÓN (repetir):", ...fallos.slice(0, 500));
  const informe = lineas.join("\n") + "\n";
  await escribirTexto(base, "INFORME.txt", informe).catch(() => {});
  await escribirTexto(base, "MANIFIESTO_sha256.txt", manifiesto.map((m) => `${m.hash}  ${m.rel}`).join("\n") + "\n").catch(() => {});
  p.fase = "terminado";
  avisar(true);
  return { carpeta: `${op.destino.name}/${nombreCarpeta}`, copiados: manifiesto.length, bytes: p.bytes, verificados, errores, fallosVerificacion: fallos, cancelado, informe, segundos };
}
