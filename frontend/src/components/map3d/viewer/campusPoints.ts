import type * as THREE from 'three';
import type { SceneData } from '../sceneData';
import { createPointLayer, type PointLayer } from './furniture';

/** Mobiliario del campus: tachos, puertas y avistamientos de fauna, con sus modelos del prototipo. */

const FAUNA_BIRD = /ave|gallinazo/i;

export type CampusPointLayers = Record<'bins' | 'gates' | 'fauna', PointLayer>;

export function createCampusPoints(scene: THREE.Scene, data: SceneData, center: THREE.Vector3): CampusPointLayers {
  // Cada puerta mira hacia el centro del campus, como en la maqueta original.
  const gateRotation = (i: number) => Math.atan2(data.gates[i].p[0] - center.x, -(-data.gates[i].p[1] - center.z));
  return {
    bins: createPointLayer(scene, 'bins', data.bins, { model: () => 'bin', scaleRange: [2, 7], color: '#9AA4B6' }),
    gates: createPointLayer(scene, 'gates', data.gates, { model: () => 'gate', rotation: gateRotation, scaleRange: [1, 2.2], color: '#5A6C99' }),
    fauna: createPointLayer(scene, 'fauna', data.fauna, {
      model: (i) => (FAUNA_BIRD.test(data.fauna[i].props.name ?? '') ? 'bird' : 'animal'),
      rotation: (i) => (i * 2.39) % 6.28,
      scaleRange: [2.4, 9],
      color: '#AD95D2',
    }),
  };
}
