import { adaptKiosk } from './unificationGeometry';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SceneData } from '../sceneData';
import { createCurrentMapViewer } from './currentMapViewer';
import { polygonShapes } from '../viewer/geometry';
import { WORLD_LIFT } from '../viewer/polyLayer';
import { alignmentFor, exceptions, type UnifiedEntry } from './unification';
import type { Manifest, Relation } from './relations';

export async function loadUnifiedMeshes(data: SceneData, manifest: Manifest, relations: Relation[], entries: UnifiedEntry[]) {
  const response = await fetch('/models/equivalence/campus.glb');
  if (!response.ok) throw new Error('No se pudo cargar la geometría SKP.');
  const { scene: original } = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '');
  const source = new Map<string, THREE.Mesh>();
  original.updateMatrixWorld(true);
  original.traverse((o) => { if (o instanceof THREE.Mesh) source.set(String(o.userData.partId), o); });
  const alignment = alignmentFor(data, manifest, relations);
  const transform = new THREE.Matrix4().set(alignment.c, 0, -alignment.s, alignment.dx, 0, 1, 0, WORLD_LIFT, alignment.s, 0, alignment.c, alignment.dz, 0, 0, 0, 1);
  const output: THREE.Mesh[] = [];
  const add = (geometry: THREE.BufferGeometry, entry: UnifiedEntry) => {
    geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: entry.source === 'Mapa izquierdo' ? '#e89bb8' : entry.source === 'SKP' ? '#c9c3b6' : '#86b8cf', side: THREE.DoubleSide }));
    (mesh.material as THREE.MeshLambertMaterial).color.convertSRGBToLinear();
    mesh.userData.entryId = entry.id; output.push(mesh);
  };
  try {
    for (const entry of entries) {
      if (entry.source === 'SKP') {
        for (const id of entry.skpIds) { const mesh = source.get(id); if (!mesh) throw new Error(`Falta la pieza ${id}.`); const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(transform); add(geometry, entry); }
      } else if (entry.source === 'Mapa izquierdo') {
        for (const b of data.campusBuildings.filter((b) => entry.mapIds.includes(String(b.props.id)))) for (const shape of polygonShapes(b.g)) {
          const geometry = new THREE.ExtrudeGeometry(shape, { depth: b.props.heightM ?? 8, bevelEnabled: false, curveSegments: 1 }); geometry.rotateX(-Math.PI / 2); geometry.translate(0, WORLD_LIFT, 0); add(geometry, entry);
        }
      } else {
        const template = source.get(exceptions.template), building = data.campusBuildings.find((b) => entry.mapIds.includes(String(b.props.id)));
        if (!template || !building) throw new Error('Falta el modelo o las medidas para la caseta del comedor.');
        const geometry = template.geometry.clone().applyMatrix4(template.matrixWorld);
        const targetPoints = building.g.flatMap((p) => Array.from({ length: p[0].length / 2 }, (_, i) => new THREE.Vector3(p[0][2 * i], 0, -p[0][2 * i + 1])));
        adaptKiosk(geometry, targetPoints, building.props.heightM ?? 8, WORLD_LIFT);
        add(geometry, entry);
      }
    }
    return { meshes: output, alignment };
  } catch (error) { output.forEach((m) => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }); throw error; }
  finally { original.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } }); }
}
export function createUnifiedViewer(container: HTMLElement, data: SceneData, meshes: THREE.Mesh[], onPick: (id: string) => void) {
  return createCurrentMapViewer(container, data, onPick, () => {}, meshes);
}
