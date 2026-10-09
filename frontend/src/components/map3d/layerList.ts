import type { LayerId } from './target';

/** Capas que la persona puede encender o apagar, en el orden del panel. */
/** Las capas del visor, más las perspectivas del catálogo de lugares, que el visor dibuja como conos. */
export type ToggleId = LayerId | 'perspectives';

export const PERSPECTIVES_TOGGLE = 'perspectives';

export interface LayerToggle {
  id: ToggleId;
  label: string;
  /** Las capas de gestión y el entorno empiezan apagados para no tapar las áreas verdes. */
  initiallyVisible: boolean;
}

export const LAYER_TOGGLES: LayerToggle[] = [
  { id: 'greenAreas', label: 'Áreas verdes', initiallyVisible: true },
  { id: 'xerophytic', label: 'Jardines xerofíticos', initiallyVisible: true },
  { id: 'vegetation', label: 'Árboles y plantas', initiallyVisible: true },
  { id: 'campusBuildings', label: 'Edificios del campus', initiallyVisible: true },
  { id: 'contextBuildings', label: 'Edificios del entorno', initiallyVisible: false },
  { id: 'gates', label: 'Puertas', initiallyVisible: true },
  { id: 'parking', label: 'Estacionamientos', initiallyVisible: true },
  { id: 'reserve', label: 'Jardines de reserva', initiallyVisible: false },
  { id: 'supervision', label: 'Zonas de supervisión', initiallyVisible: false },
  { id: 'sidewalks', label: 'Veredas en riesgo', initiallyVisible: false },
  { id: 'bins', label: 'Tachos', initiallyVisible: false },
  { id: 'fountains', label: 'Bebederos', initiallyVisible: false },
  { id: 'fauna', label: 'Fauna', initiallyVisible: false },
  { id: 'perspectives', label: 'Perspectivas', initiallyVisible: false },
];

export function initialVisibility(): Record<string, boolean> {
  return Object.fromEntries(LAYER_TOGGLES.map((t) => [t.id, t.initiallyVisible]));
}
