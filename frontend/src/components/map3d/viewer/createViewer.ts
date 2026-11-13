import * as THREE from 'three';
import { markedPrincipalIndexes, type SceneData } from '../sceneData';
import type { LayerId, Target } from '../target';
import { createCameraRig, type CameraPose } from './cameraRig';
import { scaleFurniture, type PointLayer } from './furniture';
import { createCampusPoints } from './campusPoints';
import { createFoliageMaterials } from './foliageMaterials';
import { createHighlight } from './highlight';
import { createLabels, type LabelKind } from './labels';
import { createLights } from './lighting';
import { paletteFor } from './palette';
import { groundPoint, pick } from './picking';
import { createPin } from './pin';
import { bindPointer } from './pointerInput';
import type { PlanModel } from './planModel';
import { createPlanNodes, createSceneLayers, type PaintState } from './sceneLayers';
import { createRenderer, createStage } from './stage';
import { createTextures } from './textures';
import { createVegetationLayer } from './vegetation';
import { WORLD_LIFT, type PolyLayer } from './polyLayer';
import { createViewCones } from './viewCones';
import { sectionPoints, specimenPoints } from './frameFit';
import { sectionCodesInScreenRect, specimenCodesInScreenRect } from './screenRectSections';
import type { Viewer, ViewerCallbacks } from './viewerTypes';

/** El visor 3D: arma la escena una vez y expone operaciones para la interfaz React. */

export type { Viewer, ViewerCallbacks } from './viewerTypes';

/** Lo marcado a la vez (secciones de un turno de riego, bloques de un lugar), distinto de la selección. */
const MARKED_COLOR = '#06B6D4';
const SECTION_LAYERS = ['greenAreas', 'xerophytic', 'reserve'] as const;

/** Con `model`, los edificios se dibujan con las mallas del plano oficial; sin él (no llegó o falló), como prismas. */
export function createViewer(container: HTMLElement, labelRoot: HTMLElement, data: SceneData, cb: ViewerCallbacks, initialPose?: CameraPose,
  model: PlanModel | null = null): Viewer {
  const renderer = createRenderer();
  const textures = createTextures(renderer);
  const stage = createStage(container, renderer, data.campus, textures, model?.sunken);
  const { scene, center } = stage;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const rig = createCameraRig(renderer.domElement, stage.box, center, window.matchMedia('(prefers-reduced-motion: reduce)').matches, initialPose);
  const lights = createLights(scene, center, coarse);
  let night = false, gray = false, hour = 15.5, labelsOn = true, needsRender = true;
  const state: PaintState = { mode: 'base', hidden: new Set(), palette: paletteFor(false, false) };

  const poly = createSceneLayers(scene, data, textures, state, model);
  const planNodes = model ? createPlanNodes(scene, model, textures, stage.modelGround, state.palette) : null;
  if (planNodes?.decoration) poly.campusBuildings.extra.push(planNodes.decoration);
  // El mapa general no marca ninguna sección por defecto. Solo M7 llama a
  // setMarkedSections; así puede hacer selección múltiple sin alterar /mapa.
  const markedSectionCodes = new Set<string>();
  SECTION_LAYERS.forEach((id) => {
    const layer = poly[id];
    const originalColor = layer.options.color;
    layer.options.color = (i) => markedSectionCodes.has(data[id][i]?.props.code)
      ? MARKED_COLOR : originalColor(i);
  });
  // Un lugar puede ser varios bloques: se marcan todos, porque la selección resalta uno solo.
  // Los ids de los edificios agrupados se traducen al principal que se dibuja.
  let markedBuildings = new Set<number>();
  const buildingColor = poly.campusBuildings.options.color;
  poly.campusBuildings.options.color = (i) => markedBuildings.has(i)
    ? MARKED_COLOR : buildingColor(i);
  const points = createCampusPoints(scene, data, center);
  const foliage = createFoliageMaterials(textures);
  const vegetation = createVegetationLayer(scene, data.vegetation, foliage, model?.sunken);
  // Como las secciones: solo Conjuntos marca ejemplares; el mapa general no lo usa.
  const markedSpecimenCodes = new Set<string>();
  const plantColor = vegetation.color;
  vegetation.color = (i) => markedSpecimenCodes.has(data.vegetation[i]?.props.code) ? MARKED_COLOR : plantColor(i);
  const all: Partial<Record<LayerId, PolyLayer | PointLayer>> = { ...poly, ...points, vegetation };
  const pickables: THREE.Object3D[] = [...Object.values(poly).map((l) => l.mesh), ...[...Object.values(points), vegetation].flatMap((l) => l.meshes)];
  const highlight = createHighlight(scene, all, () => state.palette);
  const pin = createPin(scene);
  const cones = createViewCones(scene);
  const labels = createLabels(labelRoot, data, poly.campusBuildings.meta, poly.greenAreas.meta, model?.huaca);
  /** Cada clase de etiqueta se apaga con su capa; la de la huaca, solo con el botón de etiquetas. */
  const labelVisible = (kind: LabelKind) => {
    if (!labelsOn) return false;
    if (kind === 'garden') return poly.greenAreas.mesh.visible;
    if (kind === 'gate') return points.gates.meshes[0]?.visible ?? false;
    return kind === 'landmark' || poly.campusBuildings.mesh.visible;
  };
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
    planNodes?.applyTheme(state.palette);
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
      const cone = cb.onViewConePick ? cones.hitTest(x, y, dom, rig.camera) : null;
      if (cone !== null) { cones.highlight(cone); cb.onViewConePick?.(cone); needsRender = true; return; }
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
      labels.update(rig.camera, w, h, labelVisible);
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
    setMarkedSections(codes) {
      markedSectionCodes.clear();
      codes.forEach((code) => markedSectionCodes.add(code));
      highlight.repaint('greenAreas');
      highlight.repaint('xerophytic');
      highlight.repaint('reserve');
      needsRender = true;
    },
    setMarkedBuildings(ids) {
      markedBuildings = markedPrincipalIndexes(data.buildingIndexById, ids);
      highlight.repaint('campusBuildings');
      needsRender = true;
    },
    setMarkedSpecimens(codes) {
      markedSpecimenCodes.clear();
      codes.forEach((code) => markedSpecimenCodes.add(code));
      highlight.repaint('vegetation');
      needsRender = true;
    },
    sectionCodesInScreenRect: (x1, y1, x2, y2, eligible) => sectionCodesInScreenRect(data, rig.camera, renderer.domElement, x1, y1, x2, y2, eligible),
    specimenCodesInScreenRect: (x1, y1, x2, y2, eligible) => specimenCodesInScreenRect(data, rig.camera, renderer.domElement, x1, y1, x2, y2, eligible),
    focusSections(codes, specimenCodes = []) {
      const wanted = new Set(codes);
      rig.focusPoints([...SECTION_LAYERS.flatMap((id) => sectionPoints(data[id], wanted)),
        ...specimenPoints(data.vegetation, new Set(specimenCodes))]);
    },
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
    fit: rig.fit, top: rig.top, north: rig.north, toggleSpin: rig.toggleSpin, pose: rig.pose, flyToPose: rig.flyToPose,
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
      needsRender = true;
    },
    setPinLatLon(lat, lon) {
      const p = data.plane.toPlane(lat, lon);
      pin.show(p.x, WORLD_LIFT, -p.y);
      needsRender = true;
    },
    clearPin() {
      pin.hide();
      needsRender = true;
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
