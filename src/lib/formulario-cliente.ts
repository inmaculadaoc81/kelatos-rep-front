/**
 * Tipos para el formulario público de solicitud de reparación
 * (FormularioCliente.html). v1 sin código de acceso (decisión del
 * usuario) y sin foto/firma real (sin integración con Drive) — ambos
 * campos ya eran opcionales en el backend real de Apps Script para
 * fotoBase64/firmaBase64, así que se envían vacíos sin violar ninguna
 * validación del lado servidor.
 */

export const OPCIONES_TIPO_PRODUCTO = [
  { grupo: "Equipos informáticos", opciones: ["Portátil", "Ordenador de sobremesa", "Consola"] },
  { grupo: "Pequeño electrodoméstico / hogar", opciones: ["Aspirador", "Robot aspirador", "Robot de cocina", "Batidora", "Ventilador", "Purificador"] },
  { grupo: "Otros servicios", opciones: ["Conversión de cintas", "Otro"] },
];

export type SiNo = "Sí" | "No";
export type SiNoAVeces = "Sí" | "No" | "A veces";

export interface DatosCintasForm {
  vhs: number;
  vhsc: number;
  beta: number;
  minidv: number;
  "8mm": number;
  cassette: number;
  bobina: number;
}

export interface DatosFormularioCliente {
  dniCif: string;
  nombre: string;
  telPrefijo: string;
  telefono: string;
  email: string;
  noTieneEmail: boolean;
  viaTipo: string;
  viaNombre: string;
  viaNumero: string;
  cp: string;
  localidad: string;
  provincia: string;
  tipoProducto: string;
  tipoOtro: string;
  marca: string;
  modelo: string;
  serie: string;
  cintas: DatosCintasForm;
  sintoma: string;
  obs: string;
  enciende: SiNoAVeces | "";
  golpe: SiNo | "";
  humedad: SiNo | "";
  reparacionAnterior: SiNo | "";
  aceptaCondiciones: boolean;
  aceptaMarketing: boolean;
}

export function datosVacios(): DatosFormularioCliente {
  return {
    dniCif: "",
    nombre: "",
    telPrefijo: "+34",
    telefono: "",
    email: "",
    noTieneEmail: false,
    viaTipo: "",
    viaNombre: "",
    viaNumero: "",
    cp: "",
    localidad: "",
    provincia: "",
    tipoProducto: "",
    tipoOtro: "",
    marca: "",
    modelo: "",
    serie: "",
    cintas: { vhs: 0, vhsc: 0, beta: 0, minidv: 0, "8mm": 0, cassette: 0, bobina: 0 },
    sintoma: "",
    obs: "",
    enciende: "",
    golpe: "",
    humedad: "",
    reparacionAnterior: "",
    aceptaCondiciones: false,
    aceptaMarketing: false,
  };
}
