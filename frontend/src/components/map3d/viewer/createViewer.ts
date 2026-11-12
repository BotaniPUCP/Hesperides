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
import { ringLines, centroid } from './geometry';

/** El visor 3D: arma la escena una vez y expone operaciones para la interfaz React. */

export type { Viewer, ViewerCallbacks } from './viewerTypes';

/** Lo marcado a la vez (secciones de un turno de riego, bloques de un lugar), distinto de la selección. */
const MARKED_COLOR = '#06B6D4';

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
  // El mapa general no marca ninguna sección por defecto. Solo M7 llama a
  // setMarkedSections; así puede hacer selección múltiple sin alterar /mapa.
  const markedSectionCodes = new Set<string>();
  let eligibleSectionCodes:Set<string>|null=null;
  (['greenAreas', 'xerophytic', 'reserve'] as const).forEach((id) => {
    const layer = poly[id];
    const originalColor = layer.options.color;
    layer.options.color = (i) => eligibleSectionCodes && !eligibleSectionCodes.has(data[id][i]?.props.code)
      ? state.palette.dimmed : markedSectionCodes.has(data[id][i]?.props.code) ? MARKED_COLOR : originalColor(i);
  });
  // Un lugar puede ser varios bloques: se marcan todos, porque la selección resalta uno solo.
  const markedBuildingIds = new Set<number>();
  const buildingColor = poly.campusBuildings.options.color;
  poly.campusBuildings.options.color = (i) => markedBuildingIds.has(data.campusBuildings[i]?.props.id)
    ? MARKED_COLOR : buildingColor(i);
  const points = createCampusPoints(scene, data, center);
  const foliage = createFoliageMaterials(textures);
  const vegetation = createVegetationLayer(scene, data.vegetation, foliage);
  const markedVegetation=new Set<string>();
  const vegetationColor=vegetation.color;
  vegetation.color=i=>markedVegetation.has(data.vegetation[i]?.props.code)?MARKED_COLOR:vegetationColor(i);
  const all: Partial<Record<LayerId, PolyLayer | PointLayer>> = { ...poly, ...points, vegetation };
  const pickables: THREE.Object3D[] = [...Object.values(poly).map((l) => l.mesh), ...[...Object.values(points), vegetation].flatMap((l) => l.meshes)];
  const highlight = createHighlight(scene, all, () => state.palette);
  let referenceOutline:THREE.LineSegments<THREE.BufferGeometry,THREE.LineBasicMaterial>|null=null;
  const clearReference = () => {
    if(!referenceOutline)return;
    scene.remove(referenceOutline);referenceOutline.geometry.dispose();referenceOutline.material.dispose();referenceOutline=null;
  };
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
  let sweepPrevious:{x:number;y:number}|null=null;
  let controlsBeforeSweep=true;
  const swept=new Set<number>();
  const sweepAt=(x:number,y:number)=>{
    const previous=sweepPrevious??{x,y};
    const steps=Math.max(1,Math.min(64,Math.ceil(Math.hypot(x-previous.x,y-previous.y)/8)));
    for(let n=1;n<=steps;n++) {
      const hit=pick(previous.x+(x-previous.x)*n/steps,previous.y+(y-previous.y)*n/steps,dom,rig.camera,pickables,isHidden);
      if(hit?.target.layer==='vegetation'&&!swept.has(hit.target.index)) {
        swept.add(hit.target.index);cb.specimenSweep?.onSelect(hit.target);
      }
    }
    sweepPrevious={x,y};needsRender=true;
  };
  const unbind = bindPointer(dom, {
    ...(cb.specimenSweep?{sweep:{
      enabled:()=>cb.specimenSweep!.enabled(),
      canStart:(x:number,y:number)=>pick(x,y,dom,rig.camera,pickables,isHidden)?.target.layer==='vegetation',
      onStart:(x:number,y:number)=>{
        controlsBeforeSweep=rig.controls.enabled;rig.controls.enabled=false;
        sweepPrevious=null;swept.clear();dom.style.cursor='grabbing';
        pin.hide();highlight.setSelected(null);highlight.setHover(null);
        cb.specimenSweep!.onState({clientX:x,clientY:y});sweepAt(x,y);
      },
      onMove:(x:number,y:number)=>{cb.specimenSweep!.onState({clientX:x,clientY:y});sweepAt(x,y);},
      onEnd:()=>{
        rig.controls.enabled=controlsBeforeSweep;dom.style.cursor='';sweepPrevious=null;swept.clear();
        cb.specimenSweep!.onState(null);needsRender=true;
      },
    }}:{}),
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
    const flew = rig.step(now), moved = sweepPrevious?false:rig.controls.update();
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
    setMarkedVegetation(codes) {
      markedVegetation.clear();codes.forEach(c=>markedVegetation.add(c));
      highlight.repaint('vegetation');needsRender=true;
    },
    setEligibleSections(codes) {
      eligibleSectionCodes=codes===null?null:new Set(codes);
      (['greenAreas','xerophytic','reserve'] as const).forEach(id=>highlight.repaint(id));
      needsRender=true;
    },
    setReferenceOutline(polygons,focus) {
      clearReference();
      if(polygons.length) {
        referenceOutline=new THREE.LineSegments(ringLines([polygons],p=>p,()=>WORLD_LIFT+0.3),
          new THREE.LineBasicMaterial({color:state.palette.accent,depthTest:false,depthWrite:false}));
        referenceOutline.renderOrder=100;scene.add(referenceOutline);
        if(focus)rig.focus(centroid(polygons),0);
      }
      needsRender=true;
    },
    setMarkedSections(codes) {
      markedSectionCodes.clear();
      codes.forEach((code) => markedSectionCodes.add(code));
      highlight.repaint('greenAreas');
      highlight.repaint('xerophytic');
      highlight.repaint('reserve');
      needsRender = true;
    },
    setMarkedBuildings(ids) {
      markedBuildingIds.clear();
      ids.forEach((id) => markedBuildingIds.add(id));
      highlight.repaint('campusBuildings');
      needsRender = true;
    },
    sectionCodesInScreenRect(x1, y1, x2, y2, eligible) {
      const allowed = new Set(eligible);
      const found = new Set<string>();
      const bounds = {
        left: Math.min(x1, x2), right: Math.max(x1, x2),
        top: Math.min(y1, y2), bottom: Math.max(y1, y2),
      };
      const canvas = renderer.domElement.getBoundingClientRect();
      rig.camera.updateMatrixWorld();
      const project = (x: number, y: number) => {
        const p = new THREE.Vector3(x, WORLD_LIFT + 0.8, -y).project(rig.camera);
        return {
          x: canvas.left + (p.x + 1) * canvas.width / 2,
          y: canvas.top + (1 - p.y) * canvas.height / 2,
        };
      };
      const inside = (p: { x: number; y: number }) =>
        p.x >= bounds.left && p.x <= bounds.right && p.y >= bounds.top && p.y <= bounds.bottom;
      const inRing = (p: { x: number; y: number }, pts: { x: number; y: number }[]) => {
        let hit = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const a = pts[i], b = pts[j];
          if ((a.y > p.y) !== (b.y > p.y) &&
              p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
        }
        return hit;
      };
      const corners = [
        { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
        { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom },
      ];
      (['greenAreas', 'xerophytic', 'reserve'] as const).forEach((id) => {
        for (const section of data[id]) {
          const code = section.props.code;
          if (!allowed.has(code) || found.has(code)) continue;
          const crosses = section.g.some((polygon) => {
            if (!polygon[0]) return false;
            const rings = polygon.map((ring) => {
              const pts: { x: number; y: number }[] = [];
              for (let i = 0; i < ring.length; i += 2) pts.push(project(ring[i], ring[i + 1]));
              return pts;
            });
            const outer = rings[0];
            if (outer.some(inside)) return true;
            // Si el rectangulo esta completamente dentro del poligono.
            return corners.some((corner) => inRing(corner, outer) &&
              !rings.slice(1).some((hole) => inRing(corner, hole)));
          });
          if (crosses) found.add(code);
        }
      });
      return [...found];
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
      clearReference();
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
