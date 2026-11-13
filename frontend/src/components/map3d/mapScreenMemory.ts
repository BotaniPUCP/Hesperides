import { initialVisibility } from './layerList';
import type { PoseMemory } from './Map3DView';
import type { MapCardContent } from './MapInfoCard';
import type { ViewOptions } from './MapToolbar';
import type { ModeId } from './modes';
import type { Target } from './target';
import type { CameraPose } from './viewer/cameraRig';

export interface MapScreenSnapshot {
  mode: ModeId;
  hidden: Set<string>;
  visible: Record<string, boolean>;
  options: ViewOptions;
  panelOpen: boolean;
  selected: Target | null;
  card: MapCardContent | null;
}

export const INITIAL_OPTIONS: ViewOptions = { night: false, shadows: true, labels: true, grayBuildings: false, realColors: false };

const startingSnapshot = (): MapScreenSnapshot => ({
  mode: 'base',
  hidden: new Set(),
  visible: initialVisibility(),
  options: INITIAL_OPTIONS,
  panelOpen: false,
  selected: null,
  card: null,
});

/**
 * El mapa es la excepción a «entrar por el menú empieza de cero»: se ve como se
 * dejó. Vive en el módulo y no en React porque el componente se desmonta al
 * navegar, y dura hasta recargar la página.
 */
let owner: string | null = null;
let lastPose: CameraPose | undefined;
let snapshot = startingSnapshot();

/** Cerrar sesión no recarga la página: sin esta barrera, la siguiente persona heredaría el mapa de la anterior. */
export function recallMapScreen(person: string): MapScreenSnapshot {
  if (person !== owner) {
    owner = person;
    lastPose = undefined;
    snapshot = startingSnapshot();
  }
  return snapshot;
}

const isUnresolvedLocation = (card: MapCardContent | null) =>
  card?.kind === 'location' && card.text === null && card.error === null;

export function rememberMapScreen(next: MapScreenSnapshot): void {
  // La respuesta de ese punto ya no llegará a una pantalla desmontada: quedaría «calculando» para siempre.
  snapshot = isUnresolvedLocation(next.card) ? { ...next, card: null } : next;
}

export const mapScreenPose: PoseMemory = {
  recall: () => lastPose,
  remember: (pose) => {
    lastPose = pose;
  },
};
