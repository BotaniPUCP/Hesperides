import type { VegetationProperties } from '@shared/types';

/**
 * Cómo se dibuja una planta en la maqueta, con la lógica del prototipo v39.
 * Una planta medida usa sus medidas; las demás, la altura típica de su especie
 * con una variación estable por ejemplar. Esa altura es ilustrativa: solo vive
 * en la maqueta y nunca se guarda (SPEC-102 D-07, C-08).
 */

export type CrownShape = 'round' | 'flat' | 'tall' | 'column' | 'cone' | 'palm';

export interface PlantShape {
  heightM: number;
  crownRadiusM: number;
  shape: CrownShape;
  measured: boolean;
  trunk: boolean;
  color: string;
  /** Variación de tono, saturación y luz para que dos plantas iguales no se vean clonadas. */
  jitter: [number, number, number];
}

type Typical = [height: number, radius: number, shape: CrownShape];

/** Alturas y copas típicas del prototipo, por especie. */
const SPECIES: Record<string, Typical> = {
  'delonix-regia': [8, 5, 'flat'], 'ceiba-speciosa': [12, 4.5, 'round'], 'prunus-serrulata': [4.5, 2.5, 'round'],
  'handroanthus-chrysanthus': [7, 3, 'round'], 'brachychiton-populneus': [9, 2.4, 'tall'],
  'jacaranda-mimosifolia': [9, 4.5, 'flat'], 'tipuana-tipu': [13, 6, 'flat'], 'ficus-benjamina': [7, 3.5, 'round'],
  'prosopis-pallida': [7, 5, 'flat'], 'populus-alba': [14, 1.8, 'column'], 'plumeria-rubra': [5, 2.5, 'round'],
  'caesalpinia-spinosa': [5, 3, 'round'], 'eucalyptus-globulus': [18, 3.5, 'tall'], 'eucalyptus-cinerea': [12, 3, 'tall'],
  'cedrela-odorata': [12, 4.5, 'round'], 'erythrina-smithiana': [8, 4, 'flat'], 'adansonia-digitata': [8, 4.5, 'round'],
  'retrophyllum-rospigliosii': [10, 2, 'cone'], 'callitris-columellaris': [10, 2, 'cone'],
  'podocarpus-macrophyllus': [8, 2, 'cone'], 'khaya-senegalensis': [10, 2.5, 'cone'], 'schefflera-arboricola': [5, 2.5, 'round'],
  'roystonea-regia': [16, 3.2, 'palm'], 'washingtonia-robusta': [18, 2.3, 'palm'], 'dypsis-lutescens': [3.5, 1.3, 'palm'],
  'phoenix-canariensis': [11, 5, 'palm'], 'syagrus-romanzoffiana': [11, 3.5, 'palm'], 'livistona-chinensis': [7, 2.8, 'palm'],
  'phoenix-roebelenii': [2.6, 1.5, 'palm'], 'bismarckia-nobilis': [8, 4.2, 'palm'], 'hyophorbe-lagenicaulis': [4, 2.2, 'palm'],
  'cocos-nucifera': [12, 3.5, 'palm'], 'coffea-arabica': [2.2, 1.2, 'round'], 'agave-americana': [1.3, 1.3, 'round'],
  'jarava-ichu': [0.9, 0.7, 'cone'], 'bougainvillea-glabra': [2.2, 1.8, 'round'],
};

/** Por tipo de vegetación, cuando la especie no tiene forma propia. */
const BY_TYPE: Record<string, Typical> = {
  TREE: [7, 3.2, 'round'], PALM: [8, 3, 'palm'], SHRUB: [1.7, 1.2, 'round'], HERB: [0.8, 0.7, 'cone'],
  CLIMBER: [2, 1.6, 'round'], SUCCULENT: [0.6, 0.6, 'round'], GROUNDCOVER: [0.3, 0.8, 'round'],
  POTTED_HERB: [0.8, 0.6, 'round'], HEDGE: [1.5, 1, 'round'],
};

const GREENS = ['#1A9828', '#28A830', '#14881E', '#30B038', '#1CA028', '#24A830'];
/** Por debajo de esto una medida es un error de captura, no una planta. */
const MIN_MEASURED_HEIGHT_M = 0.3;
const MIN_MEASURED_RADIUS_M = 0.2;
const TRUNK_MIN_HEIGHT_M = 2.5;

const hash = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
};

function colorFor(p: VegetationProperties, shape: CrownShape): string {
  if (p.typeCode === 'CLIMBER') return '#D39BC4';
  if (p.speciesSlug === 'eucalyptus-cinerea') return '#A3BBA8';
  if (shape === 'cone' && p.typeCode === 'TREE') return '#6A9A72';
  if (p.typeCode === 'HERB') return '#B5C27E';
  if (p.typeCode === 'SUCCULENT') return '#9DBFA5';
  return GREENS[hash(p.speciesSlug) % GREENS.length];
}

export function plantShape(p: VegetationProperties): PlantShape {
  const [typicalH, typicalR, shape] = SPECIES[p.speciesSlug] ?? BY_TYPE[p.typeCode] ?? BY_TYPE.TREE;
  const hs = hash(p.code);
  const measured = p.heightM !== null && p.heightM > MIN_MEASURED_HEIGHT_M;
  const heightM = measured ? (p.heightM as number) : typicalH * (0.84 + ((hs % 100) / 100) * 0.32);
  const radius = measured ? typicalR : typicalR * (0.9 + (((hs >> 3) % 100) / 100) * 0.2);
  const crownRadiusM = p.crownRadiusM !== null && p.crownRadiusM > MIN_MEASURED_RADIUS_M ? p.crownRadiusM : radius;
  return {
    heightM,
    crownRadiusM,
    shape,
    measured,
    trunk: (p.typeCode === 'TREE' || p.typeCode === 'PALM') && heightM > TRUNK_MIN_HEIGHT_M,
    color: colorFor(p, shape),
    jitter: [(((hs >> 5) % 9) - 4) / 400, (((hs >> 7) % 9) - 4) / 120, (((hs >> 9) % 13) - 6) / 150],
  };
}
