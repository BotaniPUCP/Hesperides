/**
 * Fichas de apariencia real de los edificios (SPEC-112). Una ficha ubica cada
 * material sobre las caras del edificio: vidrio con sus perfiles, ladrillo,
 * losas, zócalo, franjas. Medidas en metros y colores en hexadecimal.
 *
 * Coordenadas de fachada: u son metros a lo largo del muro desde el centro de
 * la caja del edificio, y crece hacia la derecha de quien mira la fachada desde
 * afuera; v es la cota de la escena.
 */

/** Orientación de una cara vertical hacia afuera del edificio. */
export const SIDES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type Side = (typeof SIDES)[number];

/** Un color plano: ladrillo, concreto, pintura, enchape, una franja. */
export interface SolidMaterial {
  color: string;
}

/** Un antepecho opaco al pie de cada módulo de vidrio. */
export interface Spandrel {
  color: string;
  heightM: number;
}

/** Antepechos de color repartidos entre los módulos (o paños, si el vidrio no lleva antepecho). */
export interface Accent {
  color: string;
  /** Proporción de módulos que lo llevan. */
  share: number;
}

/** Muro cortina o paño de vidrio con su retícula de perfiles. */
export interface GlassMaterial {
  glass: string;
  frame: string;
  /** Ancho del módulo, entre ejes de montantes. */
  moduleM: number;
  /** Alto del módulo, por lo general un piso. */
  heightM: number;
  /** Grosor de montantes y travesaños. */
  frameM?: number;
  spandrel?: Spandrel;
  /** Cuánto cambia el tono de un paño a otro (0 a 0,2). */
  vary?: number;
  accent?: Accent;
}

export type Material = SolidMaterial | GlassMaterial;

/** Una franja que se repite en cada piso: canto de losa, antepecho, cinta de vidrio. */
export interface Floors {
  /** Alto de piso a piso. */
  everyM: number;
  /** Cota de la línea del primer piso; sin ella, 0. */
  startM?: number;
  /** Tramo que ocupa la franja, desde la línea de cada piso (puede empezar debajo de ella). */
  bandM: [number, number];
}

/** Un rectángulo de material sobre la cara; sin tramo de u ocupa todo el ancho, sin tramo de v toda la altura. */
export interface Region {
  material: string;
  u?: [number, number];
  v?: [number, number];
  floors?: Floors;
}

/** La cara copia a otra; con `mirror`, sobre el mismo largo del edificio (la fachada opuesta de una barra). */
export interface SameAs {
  sameAs: Side;
  mirror?: boolean;
  /** Por qué la copia es evidente (SPEC-112 D-06). */
  why: string;
}

export type FaceRule = Region[] | SameAs;

/** Rango en fracciones (0 a 1) de la caja del edificio en planta, y de cota en metros. */
export interface ZoneSelector {
  east?: [number, number];
  north?: [number, number];
  heightM?: [number, number];
}

export interface Zone {
  id: string;
  /** Sin selector, la zona es la de por defecto: la primera de la ficha. */
  where?: ZoneSelector;
  /** El material de fondo de sus caras. */
  wall: string;
  /** Toda cara horizontal: el modelo no distingue con certeza la de arriba de la de abajo. */
  roof: string;
  /** Regiones de todas sus caras (zócalo, cantos de losa), debajo de las de cada cara. */
  common?: Region[];
  /** Una orientación sin entrada lleva el muro y las regiones comunes, sin vidrio inventado. */
  faces?: Partial<Record<Side, FaceRule>>;
}

export interface BuildingLook {
  planKey: string;
  name: string;
  /** Carpeta de fotos de la que sale la ficha (fuera del repositorio). */
  folder?: string;
  /** Las fotos usadas, por nombre de archivo. */
  photos?: string[];
  /** Lo que reemplaza a las fotos cuando no las hay (el McGregor sale de su modelo de Modelos 3D). */
  source?: string;
  materials: Record<string, Material>;
  zones: Zone[];
  notes?: string;
}
