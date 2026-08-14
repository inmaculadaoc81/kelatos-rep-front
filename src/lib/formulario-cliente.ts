/**
 * Tipos para el formulario público de solicitud de reparación
 * (FormularioCliente.html).
 */

export const OPCIONES_TIPO_PRODUCTO = [
  { grupo: "Equipos informáticos", opciones: ["Portátil", "Ordenador de sobremesa", "Consola"] },
  { grupo: "Pequeño electrodoméstico / hogar", opciones: ["Aspirador", "Robot aspirador", "Robot de cocina", "Batidora", "Ventilador", "Purificador"] },
  { grupo: "Otros servicios", opciones: ["Conversión de cintas", "Otro"] },
];

/** Reproduce el <select id="fTelPrefijo"> de FormularioCliente.html (original) — mismo orden, mismos grupos, misma lista completa de países. */
export const PREFIJOS_TELEFONO_FORMULARIO: { grupo: string; opciones: { value: string; label: string }[] }[] = [
  { grupo: "España", opciones: [{ value: "+34", label: "🇪🇸 +34" }] },
  {
    grupo: "Europa",
    opciones: [
      { value: "+43", label: "🇦🇹 +43 Austria" },
      { value: "+32", label: "🇧🇪 +32 Bélgica" },
      { value: "+420", label: "🇨🇿 +420 Chequia" },
      { value: "+45", label: "🇩🇰 +45 Dinamarca" },
      { value: "+421", label: "🇸🇰 +421 Eslovaquia" },
      { value: "+386", label: "🇸🇮 +386 Eslovenia" },
      { value: "+372", label: "🇪🇪 +372 Estonia" },
      { value: "+358", label: "🇫🇮 +358 Finlandia" },
      { value: "+33", label: "🇫🇷 +33 Francia" },
      { value: "+30", label: "🇬🇷 +30 Grecia" },
      { value: "+36", label: "🇭🇺 +36 Hungría" },
      { value: "+353", label: "🇮🇪 +353 Irlanda" },
      { value: "+354", label: "🇮🇸 +354 Islandia" },
      { value: "+39", label: "🇮🇹 +39 Italia" },
      { value: "+371", label: "🇱🇻 +371 Letonia" },
      { value: "+370", label: "🇱🇹 +370 Lituania" },
      { value: "+352", label: "🇱🇺 +352 Luxemburgo" },
      { value: "+356", label: "🇲🇹 +356 Malta" },
      { value: "+373", label: "🇲🇩 +373 Moldavia" },
      { value: "+382", label: "🇲🇪 +382 Montenegro" },
      { value: "+47", label: "🇳🇴 +47 Noruega" },
      { value: "+31", label: "🇳🇱 +31 Países Bajos" },
      { value: "+48", label: "🇵🇱 +48 Polonia" },
      { value: "+351", label: "🇵🇹 +351 Portugal" },
      { value: "+44", label: "🇬🇧 +44 Reino Unido" },
      { value: "+40", label: "🇷🇴 +40 Rumanía" },
      { value: "+7", label: "🇷🇺 +7 Rusia" },
      { value: "+381", label: "🇷🇸 +381 Serbia" },
      { value: "+46", label: "🇸🇪 +46 Suecia" },
      { value: "+41", label: "🇨🇭 +41 Suiza" },
      { value: "+380", label: "🇺🇦 +380 Ucrania" },
      { value: "+49", label: "🇩🇪 +49 Alemania" },
    ],
  },
  {
    grupo: "América del Norte",
    opciones: [
      { value: "+1", label: "🇺🇸 +1 EE.UU. / Canadá" },
      { value: "+52", label: "🇲🇽 +52 México" },
    ],
  },
  {
    grupo: "América Latina",
    opciones: [
      { value: "+54", label: "🇦🇷 +54 Argentina" },
      { value: "+591", label: "🇧🇴 +591 Bolivia" },
      { value: "+55", label: "🇧🇷 +55 Brasil" },
      { value: "+56", label: "🇨🇱 +56 Chile" },
      { value: "+57", label: "🇨🇴 +57 Colombia" },
      { value: "+506", label: "🇨🇷 +506 Costa Rica" },
      { value: "+53", label: "🇨🇺 +53 Cuba" },
      { value: "+1", label: "🇩🇴 +1 R. Dominicana" },
      { value: "+593", label: "🇪🇨 +593 Ecuador" },
      { value: "+503", label: "🇸🇻 +503 El Salvador" },
      { value: "+502", label: "🇬🇹 +502 Guatemala" },
      { value: "+504", label: "🇭🇳 +504 Honduras" },
      { value: "+505", label: "🇳🇮 +505 Nicaragua" },
      { value: "+507", label: "🇵🇦 +507 Panamá" },
      { value: "+595", label: "🇵🇾 +595 Paraguay" },
      { value: "+51", label: "🇵🇪 +51 Perú" },
      { value: "+1", label: "🇵🇷 +1 Puerto Rico" },
      { value: "+598", label: "🇺🇾 +598 Uruguay" },
      { value: "+58", label: "🇻🇪 +58 Venezuela" },
    ],
  },
  {
    grupo: "Otros",
    opciones: [
      { value: "+213", label: "🇩🇿 +213 Argelia" },
      { value: "+61", label: "🇦🇺 +61 Australia" },
      { value: "+86", label: "🇨🇳 +86 China" },
      { value: "+20", label: "🇪🇬 +20 Egipto" },
      { value: "+971", label: "🇦🇪 +971 Emiratos Árabes" },
      { value: "+63", label: "🇵🇭 +63 Filipinas" },
      { value: "+91", label: "🇮🇳 +91 India" },
      { value: "+972", label: "🇮🇱 +972 Israel" },
      { value: "+81", label: "🇯🇵 +81 Japón" },
      { value: "+962", label: "🇯🇴 +962 Jordania" },
      { value: "+212", label: "🇲🇦 +212 Marruecos" },
      { value: "+64", label: "🇳🇿 +64 Nueva Zelanda" },
      { value: "+92", label: "🇵🇰 +92 Pakistán" },
      { value: "+966", label: "🇸🇦 +966 Arabia Saudí" },
      { value: "+65", label: "🇸🇬 +65 Singapur" },
      { value: "+27", label: "🇿🇦 +27 Sudáfrica" },
      { value: "+82", label: "🇰🇷 +82 Corea del Sur" },
      { value: "+886", label: "🇹🇼 +886 Taiwán" },
      { value: "+90", label: "🇹🇷 +90 Turquía" },
    ],
  },
];

/** Todos los prefijos válidos (sin duplicados) — usado para reconocer el prefijo ya guardado al autocompletar por DNI. */
export const PREFIJOS_TELEFONO_VALIDOS: string[] = Array.from(
  new Set(PREFIJOS_TELEFONO_FORMULARIO.flatMap((g) => g.opciones.map((o) => o.value)))
);

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

export interface FotoFormulario {
  base64: string;
  mime: string;
  name: string;
  size: number;
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
  fotos: FotoFormulario[];
  firmaBase64: string;
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
    fotos: [],
    firmaBase64: "",
  };
}
