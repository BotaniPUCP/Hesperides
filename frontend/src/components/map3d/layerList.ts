import type { LayerId } from './target';

/** Capas que la persona puede encender o apagar, en el orden del panel. */
export interface LayerToggle {
  id: LayerId;
  label: string;
  /** Las capas de gestión empiezan apagadas para no tapar las áreas verdes. */
  initiallyVisible: boolean;
}

export const LAYER_TOGGLES: LayerToggle[] = [
  { id: 'greenAreas', label: 'Áreas verdes', initiallyVisible: true },
  { id: 'xerophytic', label: 'Jardines xerofíticos', initiallyVisible: true },
  { id: 'campusBuildings', label: 'Edificios del campus', initiallyVisible: true },
  { id: 'contextBuildings', label: 'Edificios del entorno', initiallyVisible: true },
  { id: 'gates', label: 'Puertas', initiallyVisible: true },
  { id: 'parking', label: 'Estacionamientos', initiallyVisible: true },
  { id: 'reserve', label: 'Jardines de reserva', initiallyVisible: false },
  { id: 'supervision', label: 'Zonas de supervisión', initiallyVisible: false },
  { id: 'sidewalks', label: 'Veredas en riesgo', initiallyVisible: false },
  { id: 'bins', label: 'Tachos', initiallyVisible: false },
  { id: 'fauna', label: 'Fauna', initiallyVisible: false },
];

export function initialVisibility(): Record<string, boolean> {
  return Object.fromEntries(LAYER_TOGGLES.map((t) => [t.id, t.initiallyVisible]));
}
