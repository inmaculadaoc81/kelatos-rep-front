/** Propuestas comerciales con IA (CRM): tipos y exportación a PDF (vista de impresión del navegador). */

export interface PrecioPropuesta {
  concepto: string;
  cantidad: number;
  precio: number;
}

export interface SeccionesPropuesta {
  resumen: string;
  diagnostico: string;
  solucion: string[];
  alcance: string[];
  plazos: string;
  siguientes_pasos: string[];
}

export interface DatosLegales {
  prestador_nombre: string;
  prestador_nif: string;
  prestador_direccion: string;
  cliente_nif: string;
  cliente_direccion: string;
  validez_dias: string;
  forma_pago: string;
  duracion: string;
  condiciones_extra: string;
  dpa_acordado: boolean;
}

export const LEGAL_VACIO: DatosLegales = { prestador_nombre: "", prestador_nif: "", prestador_direccion: "", cliente_nif: "", cliente_direccion: "", validez_dias: "", forma_pago: "", duracion: "", condiciones_extra: "", dpa_acordado: false };

export interface ClausulaPropuesta { titulo: string; texto: string }
export interface AvisoPropuesta { nivel: "falta" | "revisar"; texto: string }

export type EstadoPropuesta = "generando" | "borrador" | "enviada" | "aceptada" | "rechazada" | "error";

export interface Propuesta {
  id: number | string;
  cliente: string;
  contacto: string | null;
  email: string | null;
  sector: string | null;
  catalogo: "agencia";
  servicios: string[];
  contexto: string | null;
  titulo: string | null;
  secciones: Partial<SeccionesPropuesta>;
  precios: PrecioPropuesta[];
  estado: EstadoPropuesta;
  error: string | null;
  creado_por: string;
  creado_en: string;
  totales: { base: number; iva: number; total: number };
  legal: Partial<DatosLegales>;
  /** Cláusulas tipo y avisos de lo que falta: los calcula el servidor al leer o guardar. */
  clausulas?: ClausulaPropuesta[];
  avisos?: AvisoPropuesta[];
}

export interface ServicioCatalogo {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface CatalogoPropuestas {
  ok: boolean;
  iva: number;
  catalogos: { id: "agencia"; nombre: string; servicios: ServicioCatalogo[] }[];
}

export const ESTADOS_PROPUESTA: { id: EstadoPropuesta; nombre: string; chip: string }[] = [
  { id: "generando", nombre: "Generando…", chip: "bg-sky-500/10 text-sky-700" },
  { id: "borrador", nombre: "Borrador", chip: "bg-muted text-muted-foreground" },
  { id: "enviada", nombre: "Enviada", chip: "bg-amber-500/10 text-amber-700" },
  { id: "aceptada", nombre: "Aceptada", chip: "bg-green-500/10 text-green-700" },
  { id: "rechazada", nombre: "Rechazada", chip: "bg-red-500/10 text-red-700" },
  { id: "error", nombre: "Error", chip: "bg-red-500/10 text-red-700" },
];

export const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const parrafos = (t?: string) => (t ? t.split(/\n+/).map((l) => `<p>${esc(l)}</p>`).join("") : "");
const vinetas = (l?: string[]) => (l && l.length ? `<ul>${l.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");

/** Abre la propuesta en una ventana lista para imprimir; el navegador permite «Guardar como PDF». */
export function imprimirPropuesta(p: Propuesta): boolean {
  const s = p.secciones;
  const l = p.legal ?? {};
  const filas = p.precios
    .map((x) => `<tr><td>${esc(x.concepto)}</td><td class="n">${x.cantidad}</td><td class="n">${eur(x.precio)}</td><td class="n">${eur(x.cantidad * x.precio)}</td></tr>`)
    .join("");
  const precios = p.precios.length
    ? `<h2>Inversión</h2><table><thead><tr><th>Concepto</th><th class="n">Cant.</th><th class="n">Precio</th><th class="n">Importe</th></tr></thead><tbody>${filas}</tbody></table>` +
      `<table class="tot"><tr><td>Base imponible</td><td class="n">${eur(p.totales.base)}</td></tr><tr><td>IVA (21 %)</td><td class="n">${eur(p.totales.iva)}</td></tr><tr class="g"><td>Total</td><td class="n">${eur(p.totales.total)}</td></tr></table>`
    : "";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(p.titulo || "Propuesta")} — ${esc(p.cliente)}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:760px;margin:32px auto;padding:0 24px;line-height:1.5;font-size:14px}
    img{height:42px} h1{font-size:24px;margin:18px 0 4px} h2{font-size:16px;margin:22px 0 6px;color:#0f172a;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
    .sub{color:#6b7280;margin:0 0 14px} table{width:100%;border-collapse:collapse;margin-top:6px} th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left}
    .n{text-align:right} .tot{width:50%;margin-left:auto} .g td{font-weight:bold;border-top:2px solid #111827} ul{padding-left:20px} li{margin:3px 0}
    .cl li{margin:5px 0;font-size:12px} .firma td{height:90px;vertical-align:top;border:0;width:50%}
    @media print{body{margin:0}}</style></head><body>
    <img src="${window.location.origin}/logos/kelatos.png" alt="Kelatos">
    <h1>${esc(p.titulo || "Propuesta comercial")}</h1>
    <p class="sub">Para: ${esc(p.cliente)}${p.contacto ? ` · Att. ${esc(p.contacto)}` : ""} · ${new Date(p.creado_en).toLocaleDateString("es-ES")}</p>
    ${s.resumen ? `<h2>Resumen</h2>${parrafos(s.resumen)}` : ""}
    ${s.diagnostico ? `<h2>Situación y necesidad</h2>${parrafos(s.diagnostico)}` : ""}
    ${s.solucion?.length ? `<h2>Nuestra propuesta</h2>${vinetas(s.solucion)}` : ""}
    ${s.alcance?.length ? `<h2>Alcance</h2>${vinetas(s.alcance)}` : ""}
    ${s.plazos ? `<h2>Plazos y organización</h2>${parrafos(s.plazos)}` : ""}
    ${precios}
    ${s.siguientes_pasos?.length ? `<h2>Siguientes pasos</h2>${vinetas(s.siguientes_pasos)}` : ""}
    <h2>Partes</h2>
    <table><tr><td><strong>Prestador</strong><br>${esc(l.prestador_nombre || "[a definir]")}<br>NIF/CIF: ${esc(l.prestador_nif || "[a definir]")}<br>${esc(l.prestador_direccion || "")}</td>
    <td><strong>Cliente</strong><br>${esc(p.cliente)}<br>NIF/CIF: ${esc(l.cliente_nif || "[a definir]")}<br>${esc(l.cliente_direccion || "")}</td></tr></table>
    ${p.clausulas?.length ? `<h2>Condiciones</h2><ol class="cl">${p.clausulas.map((c) => `<li><strong>${esc(c.titulo)}.</strong> ${esc(c.texto)}</li>`).join("")}</ol>` : ""}
    ${l.condiciones_extra ? `<h2>Condiciones adicionales</h2>${parrafos(l.condiciones_extra)}` : ""}
    <h2>Aceptación</h2>
    <p>Con su firma, el cliente acepta esta propuesta y sus condiciones.</p>
    <table class="firma"><tr><td>Por el prestador<br><br><br>Fdo.:</td><td>Por el cliente<br><br><br>Fdo.:<br>Fecha:</td></tr></table>
    </body></html>`;
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
  return true;
}
