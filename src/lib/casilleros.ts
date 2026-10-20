/** Casilleros del taller: dónde está guardado cada equipo (armarios, cajones, estanterías y mesas). */

export interface Ocupante {
  resguardo: string;
  equipo: string;
  cliente: string;
  estado: string;
  desde: string;
  por: string | null;
}

export interface Casillero {
  id: number;
  codigo: string;
  zona: string;
  orden: number;
  contenido: string;
  capacidad_min: number | null;
  capacidad_max: number | null;
  capacidad_texto: string | null;
  notas: string | null;
  activo: boolean;
  ocupantes: Ocupante[];
  ocupados: number;
}

export interface MovimientoCasillero {
  id: number;
  resguardo: string;
  equipo: string;
  cliente: string;
  desde: string;
  asignadoPor: string | null;
  hasta: string | null;
  retiradoPor: string | null;
  motivo: "cambio" | "quitado" | "entregado" | "eliminado" | null;
}

export const ZONAS: { id: string; nombre: string }[] = [
  { id: "armario_arriba", nombre: "Armario arriba" },
  { id: "cajones_arriba", nombre: "Cajones arriba" },
  { id: "estanteria_abajo", nombre: "Estantería abajo" },
  { id: "cajones_abajo", nombre: "Cajones abajo" },
  { id: "mesas", nombre: "Mesas" },
  { id: "estanteria_escaleras", nombre: "Estantería escaleras" },
];

export const nombreZona = (id: string): string => ZONAS.find((z) => z.id === id)?.nombre ?? id;

export const MOTIVO_ETIQUETA: Record<string, string> = {
  cambio: "Movido a otro casillero",
  quitado: "Quitado a mano",
  entregado: "Salió del local (entregado)",
  eliminado: "Resguardo eliminado",
};

/** ¿Está lleno? Solo si el casillero tiene un límite definido. */
export const estaLleno = (c: Pick<Casillero, "capacidad_max" | "ocupados">): boolean => c.capacidad_max !== null && c.ocupados >= c.capacidad_max;

/** «3 / 15» o «3» si no tiene límite definido. */
export const textoOcupacion = (c: Pick<Casillero, "capacidad_max" | "ocupados">): string => (c.capacidad_max !== null ? `${c.ocupados} / ${c.capacidad_max}` : `${c.ocupados}`);
