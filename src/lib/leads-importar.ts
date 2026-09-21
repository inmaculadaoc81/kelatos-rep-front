/**
 * Importación de leads desde CSV: a qué campo del lead corresponde cada
 * columna (se adivina por el nombre de la cabecera y el usuario puede
 * corregirlo) y cómo se convierte cada fila en lo que espera el backend
 * (kelatos-rep-back/src/mailLeads.js → importarLeads).
 */

export type CampoLead =
  | "nombre"
  | "contacto"
  | "email"
  | "emails_extra"
  | "telefono"
  | "web"
  | "ciudad"
  | "provincia"
  | "pais"
  | "sector"
  | "estado"
  | "paso"
  | "grupo_envio"
  | "notas";

/** "extra" = se guarda tal cual en los datos adicionales del lead; "ignorar" = no se importa. */
export type DestinoColumna = CampoLead | "extra" | "ignorar";

export const CAMPOS_LEAD: { campo: CampoLead; etiqueta: string }[] = [
  { campo: "nombre", etiqueta: "Empresa / nombre" },
  { campo: "contacto", etiqueta: "Persona de contacto" },
  { campo: "email", etiqueta: "Email principal" },
  { campo: "emails_extra", etiqueta: "Otros emails" },
  { campo: "telefono", etiqueta: "Teléfono" },
  { campo: "web", etiqueta: "Web" },
  { campo: "ciudad", etiqueta: "Ciudad" },
  { campo: "provincia", etiqueta: "Provincia" },
  { campo: "pais", etiqueta: "País" },
  { campo: "sector", etiqueta: "Sector" },
  { campo: "estado", etiqueta: "Estado" },
  { campo: "paso", etiqueta: "Paso de la secuencia" },
  { campo: "grupo_envio", etiqueta: "Grupo / oleada" },
  { campo: "notas", etiqueta: "Notas" },
];

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Nombres de cabecera habituales (español, inglés y los campos del CRM anterior).
const SINONIMOS: Record<CampoLead, string[]> = {
  nombre: ["nombre", "empresa", "razonsocial", "company", "companyname", "name", "negocio", "cliente", "accountname", "account", "nombreempresa"],
  contacto: ["contacto", "persona", "personacontacto", "contact", "contactname", "responsable", "nombrecontacto", "firstname"],
  email: ["email", "correo", "mail", "correoelectronico", "emailaddress", "email1", "correo1", "emailprincipal"],
  emails_extra: ["email2", "correo2", "emailsecundario", "otrosemails", "emails", "emailaddressdata"],
  telefono: ["telefono", "tel", "phone", "phonenumber", "movil", "mobile", "telefono1"],
  web: ["web", "website", "url", "sitioweb", "pagina", "paginaweb", "webpage"],
  ciudad: ["ciudad", "city", "localidad", "poblacion", "billingaddresscity", "addresscity"],
  provincia: ["provincia", "province", "region", "state", "billingaddressstate", "addressstate"],
  pais: ["pais", "country", "billingaddresscountry", "addresscountry"],
  sector: ["sector", "categoria", "industria", "industry", "giro", "actividad", "tipo"],
  estado: ["estado", "status", "cestado", "estadolead", "leadstatus"],
  paso: ["paso", "step", "cpasoemail", "pasoemail", "pasosecuencia", "nuevopaso"],
  grupo_envio: ["grupo", "gruposenvio", "grupoenvio", "cgrupoenvio", "oleada", "batch", "campana", "lote"],
  notas: ["notas", "notes", "comentarios", "descripcion", "description", "observaciones"],
};

/** Propone un destino por columna; una columna no puede repetir un campo ya asignado. */
export function adivinarMapeo(cabeceras: string[]): DestinoColumna[] {
  const usados = new Set<CampoLead>();
  return cabeceras.map((h) => {
    const n = normalizar(h);
    if (!n) return "ignorar";
    for (const campo of Object.keys(SINONIMOS) as CampoLead[]) {
      if (!usados.has(campo) && SINONIMOS[campo].includes(n)) {
        usados.add(campo);
        return campo;
      }
    }
    return "extra";
  });
}

export interface FilaLeadImportar {
  nombre?: string;
  contacto?: string;
  email?: string;
  emails_extra?: string;
  telefono?: string;
  web?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  sector?: string;
  estado?: string;
  paso?: string;
  grupo_envio?: string;
  notas?: string;
  datos_extra: Record<string, string>;
}

/** Convierte las filas del CSV (sin cabecera) según el mapeo elegido. */
export function filasParaImportar(cabeceras: string[], filas: string[][], mapeo: DestinoColumna[]): FilaLeadImportar[] {
  return filas.map((celdas) => {
    const lead: FilaLeadImportar = { datos_extra: {} };
    mapeo.forEach((destino, i) => {
      const valor = (celdas[i] ?? "").trim();
      if (!valor || destino === "ignorar") return;
      if (destino === "extra") lead.datos_extra[cabeceras[i] || `columna ${i + 1}`] = valor;
      else lead[destino] = valor;
    });
    return lead;
  });
}
