import { bindModifiedSelection, insideSelection } from './modifiedSelection';
import * as THREE from 'three';
import type { SceneData } from '../sceneData';
import { createCameraRig } from '../viewer/cameraRig';
import { createCampusPoints } from '../viewer/campusPoints';
import { createFoliageMaterials } from '../viewer/foliageMaterials';
import { scaleFurniture } from '../viewer/furniture';
import { paletteFor } from '../viewer/palette';
import { pick } from '../viewer/picking';
import { bindPointer } from '../viewer/pointerInput';
import { paintPoly } from '../viewer/polyLayer';
import { createSceneLayers } from '../viewer/sceneLayers';
import { createRenderer, createStage } from '../viewer/stage';
import { createTextures } from '../viewer/textures';
import { createVegetationLayer } from '../viewer/vegetation';
import type { EquivalenceViewer } from './equivalenceViewer';

/** Reuse the live map geometry; only replace its presentation and selection. */
export function createCurrentMapViewer(container: HTMLElement, data: SceneData, onPick: (id: string) => void, onReady: () => void, unifiedMeshes?: THREE.Mesh[]): EquivalenceViewer {
  const renderer = createRenderer();
  renderer.shadowMap.enabled = false;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  const textures = createTextures(renderer);
  const stage = createStage(container, renderer, data.campus, textures);
  const { scene, center } = stage;
  scene.background = new THREE.Color('#eeeeee');
  const rig = createCameraRig(renderer.domElement, stage.box, center, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const poly = createSceneLayers(scene, data, textures, { mode: 'base', hidden: new Set(), palette: paletteFor(false, true) });
  const points = createCampusPoints(scene, data, center);
  const vegetation = createVegetationLayer(scene, data.vegetation, createFoliageMaterials(textures));
  // Halos and contact-shadow planes are decorative, not physical geometry.
  vegetation.meshes.filter((mesh) => !mesh.userData.layer).forEach((mesh) => { mesh.visible = false; });
  const oldMaterials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    originals.forEach((material) => oldMaterials.add(material));
    const building = object === poly.campusBuildings.mesh;
    const garden = [poly.greenAreas.mesh, poly.xerophytic.mesh, poly.reserve.mesh].includes(object as THREE.Mesh);
    const shade = garden ? '#559447' : object === poly.contextBuildings.mesh ? '#e89bb8' : object === poly.sidewalks.mesh ? '#d0d0d0' : '#a0a0a0';
    const replacement = originals.map((original) => object instanceof THREE.LineSegments
      ? new THREE.LineBasicMaterial({ color: '#777777', transparent: original.transparent, opacity: original.opacity })
      : new THREE.MeshLambertMaterial({ color: building ? '#ffffff' : shade, vertexColors: building, side: original.side }));
    object.material = Array.isArray(object.material) ? replacement : replacement[0];
    if (object instanceof THREE.InstancedMesh) object.instanceColor = null;
  });
  if (unifiedMeshes) { poly.campusBuildings.mesh.visible = false; poly.campusBuildings.extra.forEach((o) => { o.visible = false; }); unifiedMeshes.forEach((mesh) => { mesh.userData.originalColor = (mesh.material as THREE.MeshLambertMaterial).color.clone(); scene.add(mesh); }); }
  scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 0.85));
  const sun = new THREE.DirectionalLight(0xffffff, 0.65);
  sun.position.copy(center).add(new THREE.Vector3(-300, 500, 200));
  scene.add(sun);
  renderer.domElement.setAttribute('aria-label', unifiedMeshes ? 'Mapa unificado: geometría SKP y edificios del mapa izquierdo' : 'Mapa actual completo, edificios rosas y césped verde; edificios seleccionables');
  let dirty = true, frame = 0, disposed = false, lastDistance = 0, framed = false;
  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    stage.resize(w, h); rig.camera.aspect = w / h; rig.camera.updateProjectionMatrix();
    if (!framed) { rig.fit(); framed = true; }
    dirty = true;
  };
  let hidden = new Set<string>(), selectedIds = new Set<string>();
  const isHidden = (target: { index: number }) => hidden.has(String(data.campusBuildings[target.index].props.id));
  const unifiedPick = (x: number, y: number) => {
    const rect = renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), rig.camera);
    return ray.intersectObjects(unifiedMeshes ?? [], false)[0]?.object.userData.entryId as string | undefined;
  };
  const selectAt = (x: number, y: number) => {
    if (unifiedMeshes) { const id = unifiedPick(x, y); if (id) onPick(id); return; }
    const hit = pick(x, y, renderer.domElement, rig.camera, [poly.campusBuildings.mesh], isHidden);
    if (hit) onPick(String(data.campusBuildings[hit.target.index].props.id));
  };
  const buildingCenters = data.campusBuildings.map((_, index) => {
    const bounds = new THREE.Box3(), position = poly.campusBuildings.mesh.geometry.attributes.position;
    for (let vertex = poly.campusBuildings.starts[index]; vertex < poly.campusBuildings.starts[index + 1]; vertex++) bounds.expandByPoint(new THREE.Vector3().fromBufferAttribute(position, vertex));
    return bounds.getCenter(new THREE.Vector3()).add(poly.campusBuildings.mesh.position);
  });
  const unbindModified = bindModifiedSelection(renderer.domElement, selectAt, (box) => {
    rig.cancelFlight();
    if (unifiedMeshes) {
      const ids = new Set(unifiedMeshes.filter((mesh) => !selectedIds.has(String(mesh.userData.entryId)) && insideSelection(new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()), rig.camera, renderer.domElement, box)).map((mesh) => String(mesh.userData.entryId)));
      ids.forEach(onPick); return;
    }
    const ids = data.campusBuildings.filter((building, index) => !hidden.has(String(building.props.id)) && !selectedIds.has(String(building.props.id)) && insideSelection(buildingCenters[index], rig.camera, renderer.domElement, box)).map((building) => String(building.props.id));
    ids.forEach(onPick);
  });
  const unbind = bindPointer(renderer.domElement, {
    onPress: () => rig.cancelFlight(),
    onClick: selectAt,
    onHover(x, y) {
      if (unifiedMeshes) { renderer.domElement.style.cursor = unifiedPick(x, y) ? 'pointer' : ''; return; }
      renderer.domElement.style.cursor = pick(x, y, renderer.domElement, rig.camera, [poly.campusBuildings.mesh], isHidden) ? 'pointer' : '';
    },
  });
  rig.controls.addEventListener('change', () => { dirty = true; });
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  const loop = (now: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(loop);
    const flew = rig.step(now), moved = rig.controls.update();
    const distance = rig.camera.position.distanceTo(rig.controls.target);
    if (Math.abs(distance - lastDistance) / Math.max(lastDistance, 1) > 0.04) {
      scaleFurniture(Object.values(points), distance); lastDistance = distance; dirty = true;
    }
    if (dirty || flew || moved) { renderer.render(scene, rig.camera); dirty = false; }
  };
  frame = requestAnimationFrame(loop);
  queueMicrotask(() => { if (!disposed) onReady(); });
  return {
    update(state) {
      if (unifiedMeshes) {
        selectedIds = new Set(state.selected);
        unifiedMeshes.forEach((mesh) => { const material = mesh.material as THREE.MeshLambertMaterial; material.color.copy(mesh.userData.originalColor); if (state.selected.includes(String(mesh.userData.entryId))) material.color.set('#f8a52b'); }); dirty = true; return;
      }
      const selected = new Set(state.selected), linked = new Set(state.linked);
      paintPoly(poly.campusBuildings, (i) => selected.has(String(data.campusBuildings[i].props.id)) ? '#f8a52b' : linked.has(String(data.campusBuildings[i].props.id)) ? '#4aaf84' : '#e89bb8');
      selectedIds = selected;
      hidden = state.hideLinked ? linked : new Set();
      const geometry = poly.campusBuildings.mesh.geometry;
      if (!Array.isArray(poly.campusBuildings.mesh.material)) poly.campusBuildings.mesh.material = [poly.campusBuildings.mesh.material];
      geometry.clearGroups();
      data.campusBuildings.forEach((building, index) => {
        if (!hidden.has(String(building.props.id))) geometry.addGroup(poly.campusBuildings.starts[index], poly.campusBuildings.starts[index + 1] - poly.campusBuildings.starts[index], 0);
      });
      dirty = true;
    },
    fit: rig.fit, top: rig.top,
    focus(ids) {
      const wanted = new Set(ids);
      if (unifiedMeshes) { const box = new THREE.Box3(); unifiedMeshes.filter((m) => wanted.has(String(m.userData.entryId))).forEach((m) => box.expandByObject(m)); if (!box.isEmpty()) rig.focusPoints([{ x: box.min.x, z: box.min.z }, { x: box.max.x, z: box.max.z }]); return; }
      rig.focusPoints(data.campusBuildings.filter((b) => wanted.has(String(b.props.id))).flatMap((b) => b.g.flatMap((polygon) => {
        const ring = polygon[0] ?? [];
        return Array.from({ length: ring.length / 2 }, (_, i) => ({ x: ring[2 * i], z: -ring[2 * i + 1] }));
      })));
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); unbind(); unbindModified(); rig.controls.dispose();
      const geometries = new Set<THREE.BufferGeometry>();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => oldMaterials.add(material));
      });
      geometries.forEach((geometry) => geometry.dispose()); oldMaterials.forEach((material) => material.dispose());
      Object.values(textures).forEach((texture) => { if (texture instanceof THREE.Texture) texture.dispose(); });
      stage.dispose();
    },
  };
}
