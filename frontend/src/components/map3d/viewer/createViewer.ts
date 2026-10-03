import * as THREE from 'three';
import type { SceneData } from '../sceneData';
import type { LayerId, Target } from '../target';
import { createCameraRig, type CameraPose } from './cameraRig';
import { scaleFurniture, type PointLayer } from './furniture';
import { createCampusPoints } from './campusPoints';
import { createFoliageMaterials } from './foliageMaterials';
import { createHighlight } from './highlight';
import { createLabels } from './labels';
import { createLights } from './lighting';
import { paletteFor } from './palette';
import { groundPoint, pick } from './picking';
import { createPin } from './pin';
import { bindPointer } from './pointerInput';
import { createSceneLayers, type PaintState } from './sceneLayers';
import { createRenderer, createStage } from './stage';
import { createTextures } from './textures';
import { createVegetationLayer } from './vegetation';
import { WORLD_LIFT, type PolyLayer } from './polyLayer';
import { createViewCones } from './viewCones';
import type { Viewer, ViewerCallbacks } from './viewerTypes';

/** El visor 3D: arma la escena una vez y expone operaciones para la interfaz React. */

export type { Viewer, ViewerCallbacks } from './viewerTypes';

export function createViewer(container: HTMLElement, labelRoot: HTMLElement, data: SceneData, cb: ViewerCallbacks, initialPose?: CameraPose): Viewer {
  const renderer = createRenderer();
  const textures = createTextures(renderer);
  const stage = createStage(container, renderer, data.campus, textures);
  const { scene, center } = stage;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const rig = createCameraRig(renderer.domElement, stage.box, center, window.matchMedia('(prefers-reduced-motion: reduce)').matches, initialPose);
  const lights = createLights(scene, center, coarse);
  let night = false, gray = false, hour = 15.5, labelsOn = true, needsRender = true;
  const state: PaintState = { mode: 'base', hidden: new Set(), palette: paletteFor(false, false) };

  const poly = createSceneLayers(scene, data, textures, state);
  const points = createCampusPoints(scene, data, center);
  const foliage = createFoliageMaterials(textures);
  const vegetation = createVegetationLayer(scene, data.vegetation, foliage);
  const all: Partial<Record<LayerId, PolyLayer | PointLayer>> = { ...poly, ...points, vegetation };
  const pickables: THREE.Object3D[] = [...Object.values(poly).map((l) => l.mesh), ...[...Object.values(points), vegetation].flatMap((l) => l.meshes)];
  const highlight = createHighlight(scene, all, () => state.palette);
  const pin = createPin(scene);
  const cones = createViewCones(scene);
  const labels = createLabels(labelRoot, data, poly.campusBuildings.meta, poly.greenAreas.meta);
  const isHidden = (t: Target) => t.layer === 'greenAreas' && state.hidden.size > 0 && poly.greenAreas.options.color(t.index) === state.palette.dimmed;
  const size = () => ({ w: container.clientWidth || 1, h: container.clientHeight || 1 });

  /** El sol mueve también el borde iluminado de las copas. */
  function relight() {
    lights.setHour(hour, night);
    foliage.setLighting(night, lights.sun.position.clone().sub(center).normalize());
  }

  function applyTheme() {
    state.palette = paletteFor(night, gray);
    const { w, h } = size();
    stage.applyTheme(state.palette, night, w, h);
    lights.applyTheme(state.palette, night);
    relight();
    highlight.repaintAll();
    needsRender = true;
  }

  function resize() {
    const { w, h } = size();
    stage.resize(w, h);
    rig.camera.aspect = w / h;
    rig.camera.updateProjectionMatrix();
    applyTheme();
  }

  const dom = renderer.domElement;
  const unbind = bindPointer(dom, {
    onPress: () => { rig.cancelFlight(); rig.controls.autoRotate = false; },
    onClick(x, y) {
      const hit = pick(x, y, dom, rig.camera, pickables, isHidden);
      pin.hide();
      highlight.setSelected(hit?.target ?? null);
      cb.onSelect(hit?.target ?? null);
      const g = hit ? null : groundPoint(x, y, dom, rig.camera, data.campus);
      const at = hit?.point ?? g;
      if (at) {
        pin.show(at.x, hit ? hit.point.y : WORLD_LIFT, at.z);
        const [lat, lon] = data.plane.toLatLon({ x: at.x, y: -at.z });
        if (g) cb.onGroundPick(lat, lon);
        cb.onPointPick?.(lat, lon);
      }
      needsRender = true;
    },
    onHover(x, y) {
      const hit = pick(x, y, dom, rig.camera, pickables, isHidden);
      highlight.setHover(hit?.target ?? null);
      dom.style.cursor = hit ? 'pointer' : '';
      cb.onHover(hit?.target ?? null, x, y);
      needsRender = true;
    },
  });
  rig.controls.addEventListener('change', () => { needsRender = true; });
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  let frame = 0, lastDistance = 0;
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const flew = rig.step(now), moved = rig.controls.update();
    const distance = rig.camera.position.distanceTo(rig.controls.target);
    if (Math.abs(distance - lastDistance) / Math.max(lastDistance, 1) > 0.04) { scaleFurniture(Object.values(points), distance); lastDistance = distance; }
    if (flew || moved || needsRender || rig.controls.autoRotate) {
      renderer.render(scene, rig.camera);
      const { w, h } = size();
      labels.update(rig.camera, w, h, (kind) => labelsOn && (kind === 'garden' ? poly.greenAreas.mesh.visible : kind === 'gate' ? points.gates.meshes[0]?.visible ?? false : poly.campusBuildings.mesh.visible));
      const off = rig.camera.position.clone().sub(rig.controls.target);
      cb.onCompass((Math.atan2(off.x, off.z) * 180) / Math.PI);
      needsRender = false;
    }
  };
  resize();
  scaleFurniture(Object.values(points), rig.camera.position.distanceTo(rig.controls.target));
  frame = requestAnimationFrame(loop);

  const focusTarget = (t: Target) => {
    if (t.layer === 'references') {
      const [x, y] = data.references[t.index].p;
      pin.show(x, WORLD_LIFT, -y);
      rig.focusPoint(x, -y);
      return;
    }
    const layer = all[t.layer];
    if (layer) rig.focus(layer.meta[t.index], t.layer === 'campusBuildings' ? (data.campusBuildings[t.index].props.heightM ?? 8) * 0.4 : 0);
  };

  return {
    setPaint(mode, hidden) {
      state.mode = mode;
      state.hidden = hidden;
      poly.greenAreas.warmColor = mode === 'base' ? '#C8A020' : null;
      highlight.repaint('greenAreas');
      needsRender = true;
    },
    setLayerVisible(id, visible) {
      const layer = all[id];
      if (!layer) return;
      const objects = layer.kind === 'poly' ? [layer.mesh, ...layer.extra] : layer.meshes;
      objects.forEach((o) => { o.visible = visible; });
      needsRender = true;
    },
    select(target, focus) {
      highlight.setSelected(target);
      if (!target) pin.hide();
      if (target && focus) focusTarget(target);
      needsRender = true;
    },
    setNight: (v) => { night = v; applyTheme(); },
    setHour: (h) => { hour = h; relight(); needsRender = true; },
    setShadows(on) {
      renderer.shadowMap.enabled = on;
      lights.sun.castShadow = on;
      scene.traverse((o) => { const m = (o as THREE.Mesh).material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.needsUpdate = true; }); });
      needsRender = true;
    },
    setLabels: (on) => { labelsOn = on; needsRender = true; },
    setGrayBuildings: (v) => { gray = v; applyTheme(); },
    fit: rig.fit, top: rig.top, north: rig.north, toggleSpin: rig.toggleSpin, pose: rig.pose,
    setViewCones(list) {
      cones.set(list.map((c) => { const p = data.plane.toPlane(c.lat, c.lon); return { id: c.id, x: p.x, z: -p.y, headingDeg: c.headingDeg }; }));
      needsRender = true;
    },
    focusViewCone(id) {
      cones.highlight(id);
      const at = id === null ? null : cones.position(id);
      if (at) rig.focusPoint(at.x, at.z);
      needsRender = true;
    },
    focusLatLon(lat, lon) {
      const p = data.plane.toPlane(lat, lon);
      rig.focusPoint(p.x, -p.y);
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unbind();
      rig.controls.dispose();
      labels.dispose();
      cones.dispose();
      stage.dispose();
    },
  };
}
