import type { PoseMemory } from './Map3DView';
import type { CameraPose } from './viewer/cameraRig';

/**
 * La vista del mapa principal vive en el módulo y no en React: el componente se
 * desmonta al navegar por el menú, pero el módulo sigue cargado hasta recargar.
 */
let lastPose: CameraPose | undefined;

export const mapScreenPose: PoseMemory = {
  recall: () => lastPose,
  remember: (pose) => {
    lastPose = pose;
  },
};
