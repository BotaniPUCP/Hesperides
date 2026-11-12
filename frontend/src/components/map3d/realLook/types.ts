/**
 * Fichas de apariencia real de los edificios (SPEC-109). Una ficha describe un
 * edificio fotografiado: sus zonas, la paleta de cada una y el patrón de
 * ventanas de cada cara. Las medidas van en metros y los colores en hexadecimal.
 */

/** Orientación de una cara vertical hacia afuera del edificio. */
export const SIDES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type Side = (typeof SIDES)[number];
/** Una cara de la ficha: una orientación o «el resto», que cubre las que la ficha no nombra. */
export type FaceKey = Side | 'other';

/**
 * blind: muro ciego · windows: ventanas sueltas · ribbon: banda corrida de vidrio
 * por piso · curtain: muro cortina con retícula de perfiles · photo: un tramo de
 * fachada enderezado de una foto, repetido a lo largo del muro a escala real.
 */
export const PATTERN_KINDS = ['blind', 'windows', 'ribbon', 'curtain', 'photo'] as const;
export type PatternKind = (typeof PATTERN_KINDS)[number];

export interface Band {
  color: string;
  heightM: number;
}

/** Un tramo del atlas de fotos y su tamaño real: se repite cada `widthM` a lo largo del muro. */
export interface PhotoTile {
  tile: string;
  widthM: number;
  heightM: number;
  /** false: el tramo va una sola vez, desde `offsetM` (metros desde el centro del edificio a lo largo del muro). */
  repeat?: boolean;
  /** Lo que lleva la cara fuera de un tramo que no se repite; sin esto, el color del muro. */
  beyond?: FacePattern;
}

/** Dónde quedó cada tramo en el atlas: x, y, ancho y alto en coordenadas de textura. */
export type PhotoAtlas = Record<string, [number, number, number, number]>;

export interface FacePattern {
  kind: PatternKind;
  /** Solo en `photo`: el tramo; sobre su alto, la cara toma `wall`. */
  photo?: PhotoTile;
  wall: string;
  glass?: string;
  frame?: string;
  /** Altura de piso a piso. */
  floorM?: number;
  /** Desde el piso hasta el borde inferior del vidrio. */
  sillM?: number;
  /** Alto del vidrio. */
  windowM?: number;
  /** Ancho de cada ventana suelta. */
  widthM?: number;
  /** Distancia entre ejes de ventanas, o entre montantes en banda y muro cortina. */
  moduleM?: number;
  /** Corrimiento horizontal del patrón. */
  offsetM?: number;
  /** Grosor de marcos y montantes. */
  frameM?: number;
  /** Canto de losa al pie de cada piso. */
  band?: Band;
  /** Cota en que empieza el primer piso (un edificio hundido o sobre un zócalo alto). */
  startM?: number;
  /** El primer piso con otro patrón; `heightM` es su alto. */
  ground?: FacePattern & { heightM: number };
}

export interface SameAs {
  sameAs: FaceKey;
}

export type FaceRule = FacePattern | SameAs;

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
  /** Toda cara horizontal: el modelo no distingue con certeza la de arriba de la de abajo. */
  roof: string;
  plinth?: Band;
  faces: Partial<Record<FaceKey, FaceRule>> & { other: FaceRule };
}

export interface BuildingLook {
  planKey: string;
  name: string;
  /** Carpeta de fotos de la que sale la ficha (fuera del repositorio, D-11). */
  folder: string;
  /** Las fotos usadas, por nombre de archivo. */
  photos: string[];
  zones: Zone[];
  notes?: string;
}

/** Una cara ya resuelta, lista para la tabla del shader. */
export type ResolvedFace = FacePattern;
