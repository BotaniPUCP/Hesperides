/**
 * Colores de la escena de día y de noche, los del prototipo v39. Allí vivían en
 * variables CSS de :root; aquí son datos, para que el visor no cambie el tema
 * del resto de la aplicación al pasar a noche.
 */

export interface ScenePalette {
  plinth: string;
  plinthSide: string;
  building: string;
  buildingEdge: string;
  context: string;
  parking: string;
  dimmed: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunIntensity: number;
  accent: string;
  hover: string;
  /** Solo en el modo Atardecer: el suelo con sus colores naturales en vez de los del mapa (modo General). */
  natural?: { grass: string; xerophytic: string; sidewalk: string };
}

export const DAY: ScenePalette = {
  plinth: '#3A3A40',
  plinthSide: '#2E2E35',
  building: '#FF1878',
  buildingEdge: '#C01060',
  context: '#7838D0',
  parking: '#FFB800',
  dimmed: '#C8E8C0',
  hemiSky: '#FFF0D0',
  hemiGround: '#C0BEB8',
  hemiIntensity: 0.65,
  sunIntensity: 0.85,
  accent: '#0033FF',
  hover: '#FFD700',
};

export const NIGHT: ScenePalette = {
  plinth: '#292B58',
  plinthSide: '#202344',
  building: '#FF43B9',
  buildingEdge: '#EC55A9',
  context: '#6758C8',
  parking: '#D4B8FF',
  dimmed: '#26345F',
  hemiSky: '#91A9FF',
  hemiGround: '#241845',
  hemiIntensity: 0.88,
  sunIntensity: 0.42,
  accent: '#7FD3F2',
  hover: '#FFD700',
};

/** Variante «edificios en gris» del botón 🏢: para leer el mapa sin el rosado. */
export const GRAY_BUILDINGS = { building: '#8A8A90', buildingEdge: '#606068', context: '#707078' };

/** Atardecer: césped, veredas y estacionamientos como se ven de verdad, y el zócalo de asfalto. */
export const GOLDEN: Partial<ScenePalette> = {
  plinth: '#4a4743',
  plinthSide: '#3b3936',
  parking: '#7d7870',
  natural: { grass: '#587d38', xerophytic: '#a08a5c', sidewalk: '#b8ab98' },
};

export function paletteFor(night: boolean, grayBuildings: boolean, golden = false): ScenePalette {
  const base = night ? NIGHT : golden ? { ...DAY, ...GOLDEN } : DAY;
  return grayBuildings ? { ...base, ...GRAY_BUILDINGS } : base;
}
