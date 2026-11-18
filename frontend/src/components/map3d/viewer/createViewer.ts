import * as THREE from 'three';
import { markedPrincipalIndexes, type SceneData } from '../sceneData';
import type { LayerId, Target } from '../target';
import { createCameraRig, type CameraPose } from './cameraRig';
import { scaleFurniture, type PointLayer } from './furniture';
import { createCampusPoints } from './campusPoints';
import { createFoliageMaterials } from './foliageMaterials';
import { createHighlight } from './highlight';
import { createLabels, type LabelKind } from './labels';
import { createBalloonLayer } from './balloons';
import { attachAdminMovement } from '../pilot/adminMovement';
import { attachAdminAnchor } from './adminAnchor';
import { createLights } from './lighting';
import { setGrassVariation } from './grassVariation';
import { createCascadeShadows, type CascadeShadows } from './cascadeShadows';
import { createParapets } from './parapets';
import { createSunset, duskOf, setGroundMatte, SUNSET, SUNSET_HOUR, SUNSET_HOURS, SUNSET_MAX_POLAR, sunsetPose } from './sunset';
import { createSequenceHooks } from './sequenceHooks';
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
import { createIncidentMarkers } from './incidentMarkers';
import { sectionPoints, specimenPoints } from './frameFit';
import { sectionCodesInScreenRect, specimenCodesInScreenRect } from './screenRectSections';
import type { Viewer, ViewerCallbacks, ViewerStart } from './viewerTypes';
import { createSelectionSweep, SECTION_LAYERS } from './selectionSweep';
import { ringLines, centroid } from './geometry';
import { BUILDING_LOOKS } from '../realLook/looks';
import { createRealColors, NEUTRAL, setEdgesForRealColors } from '../realLook/realColors';
import { GLASS_ENV_BOOST } from '../realLook/lookLightShader';

/** El visor 3D: arma la escena una vez y expone operaciones para la interfaz React. */

export type { Viewer, ViewerCallbacks, ViewerStart } from './viewerTypes';

/** Lo marcado a la vez (secciones de un turno de riego, bloques de un lugar), distinto de la selección. */
const MARKED_COLOR = '#06B6D4';
/**
 * Escala de la velocidad del modo administrador: el vuelo va a la mitad de esto en m/s.
 * En los pilotos es el radio del edificio; el campus entero sería demasiado rápido.
 */
const ADMIN_SPEED_RADIUS_M = 80;
/** El límite de inclinación de siempre (cameraRig). */
const ORBIT_MAX_POLAR = 1.32;
const NO_INTERIOR = new THREE.Color(0, 0, 0);
/** El ocre del degradado del césped en el mapa de siempre (polyLayer). */
const GRASS_WARM = '#C8A020';

/** Con `model`, los edificios se dibujan con las mallas del plano oficial; sin él (no llegó o falló), como prismas. */
export function createViewer(container: HTMLElement, labelRoot: HTMLElement, data: SceneData, cb: ViewerCallbacks, initialPose?: CameraPose,
  model: PlanModel | null = null, start: ViewerStart = {}): Viewer {
  const renderer = createRenderer();
  const textures = createTextures(renderer);
  const stage = createStage(container, renderer, data.campus, textures, model?.sunken);
  const { scene, center } = stage;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const rig = createCameraRig(renderer.domElement, stage.box, center, window.matchMedia('(prefers-reduced-motion: reduce)').matches, initialPose);
  const lights = createLights(scene, center, coarse);
  let night = false, gray = false, hour = 15.5, labelsOn = true, needsRender = true, golden = false, sunsetHour: number = SUNSET_HOUR;
  // Las sombras en cascada se crean la primera vez que se prende el modo; registran todo material que aparezca.
  let cascades: CascadeShadows | null = null;
  const sunset = createSunset(renderer, scene, rig.camera, stage.box, WORLD_LIFT,
    { plane: data.plane, campus: data.campus, onChange: () => { cascades?.adopt(scene); needsRender = true; }, lite: coarse });
  const state: PaintState = { mode: 'base', hidden: new Set(), palette: paletteFor(false, false) };

  const poly = createSceneLayers(scene, data, textures, state, model);
  const planNodes = model ? createPlanNodes(scene, model, textures, stage.modelGround, state.palette, data.greenAreas.map((z) => z.g)) : null;
  if (planNodes?.decoration) poly.campusBuildings.extra.push(planNodes.decoration);
  // El mapa general no marca ninguna sección por defecto. Solo M7 llama a
  // setMarkedSections; así puede hacer selección múltiple sin alterar /mapa.
  const markedSectionCodes = new Set<string>();
  let eligibleSectionCodes: Set<string> | null = null;
  SECTION_LAYERS.forEach((id) => {
    const layer = poly[id];
    const originalColor = layer.options.color;
    layer.options.color = (i) => eligibleSectionCodes && !eligibleSectionCodes.has(data[id][i]?.props.code)
      ? state.palette.dimmed : markedSectionCodes.has(data[id][i]?.props.code) ? MARKED_COLOR : originalColor(i);
  });
  // Un lugar puede ser varios bloques: se marcan todos, porque la selección resalta uno solo.
  // Los ids de los edificios agrupados se traducen al principal que se dibuja.
  let markedBuildings = new Set<number>();
  const buildingColor = poly.campusBuildings.options.color;
  poly.campusBuildings.options.color = (i) => markedBuildings.has(i)
    ? MARKED_COLOR : buildingColor(i);
  const realColors = createRealColors(poly.campusBuildings, data.campusBuildings.map((b) => ({ planKey: b.props.planKey ?? null, g: b.g,
    stairFrom: b.props.planKey ? model?.stairFrom.get(b.props.planKey) : undefined })), BUILDING_LOOKS);
  // Antes de la primera pintura: así el visor nace en el modo que la pantalla da por hecho (SPEC-112 D-13).
  if (start.realColors) {
    realColors.setEnabled(true);
    setEdgesForRealColors(poly.campusBuildings.extra, true);
  }
  // Parapetos sobre los techos planos del campus, para el modo.
  // Solo en los prismas: un edificio con malla del modelo no sigue su contorno del mapa (el parapeto quedaría
  // flotando como una cinta a la cota más alta) y ya trae sus propios bordes.
  const parapets = createParapets(scene, data.campusBuildings.map((b) => (b.props.planKey && model?.buildings.has(b.props.planKey) ? [] : b.g)),
    (poly.campusBuildings.mesh.geometry as THREE.BufferGeometry).attributes.position.array, poly.campusBuildings.starts,
    poly.campusBuildings.mesh.position.y);
  const paletteColor = poly.campusBuildings.options.color;
  // En modo real el edificio con ficha se pinta neutro: el shader pone su color, y el resaltado lo tiñe.
  poly.campusBuildings.options.color = (i) => realColors.enabled() && realColors.hasLook(i) && !markedBuildings.has(i)
    ? NEUTRAL : paletteColor(i);
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
  let referenceOutline:THREE.LineSegments<THREE.BufferGeometry,THREE.LineBasicMaterial>|null=null;
  const clearReference = () => {
    if(!referenceOutline)return;
    scene.remove(referenceOutline);referenceOutline.geometry.dispose();referenceOutline.material.dispose();referenceOutline=null;
  };
  // Los marcadores (pin, conos, incidencias) cuelgan de un nodo propio: la captura los apaga de una vez.
  const markers = new THREE.Group();
  scene.add(markers);
  const pin = createPin(markers);
  const cones = createViewCones(markers);
  const admin = attachAdminMovement(renderer.domElement, rig.camera, rig.controls, () => { needsRender = true; });
  admin.fitTo(WORLD_LIFT, ADMIN_SPEED_RADIUS_M);
  const adminAnchor = attachAdminAnchor(renderer.domElement, rig.camera, rig.controls.target, scene, () => { needsRender = true; });
  const balloons = start.balloonRoot ? createBalloonLayer(start.balloonRoot, data.plane, {
    onPick: (b) => cb.onBalloonPick?.(b),
    onGroup: (points) => rig.focusPoints(points),
  }) : null;
  const incidents = createIncidentMarkers(markers);
  const labels = createLabels(labelRoot, data, poly.campusBuildings.meta, poly.greenAreas.meta, model?.huaca);
  /** Cada clase de etiqueta se apaga con su capa; la de la huaca, solo con el botón de etiquetas. */
  const labelVisible = (kind: LabelKind) => {
    if (!labelsOn) return false;
    if (kind === 'garden') return poly.greenAreas.mesh.visible;
    if (kind === 'gate') return points.gates.meshes[0]?.visible ?? false;
    return kind === 'landmark' || poly.campusBuildings.mesh.visible;
  };
  const isHidden = (t: Target) => t.layer === 'greenAreas' && state.hidden.size > 0 && poly.greenAreas.options.color(t.index) === state.palette.dimmed;
  // La exportación de SPEC-118 fija el tamaño; si no, manda el contenedor.
  let fixedSize: { w: number; h: number } | null = null, paused = false;
  const size = () => fixedSize ?? ({ w: container.clientWidth || 1, h: container.clientHeight || 1 });

  /** El sol mueve también el borde iluminado de las copas. */
  function relight() {
    lights.setHour(golden && !night ? sunsetHour : hour, night);
    foliage.setLighting(night, lights.sunDir(), golden);
  }

  function applyTheme() {
    state.palette = paletteFor(night, gray, golden && !night);
    const { w, h } = size();
    stage.applyTheme(state.palette, night, w, h);
    const twilight = golden && !night ? duskOf(sunsetHour) : 0;
    lights.applyTheme(state.palette, night, golden, twilight);
    relight();
    // Atardecer (no de noche): cielo, bruma, ciudad alrededor y posprocesado; pisa el entorno y la exposición del tema.
    const dusk = golden && !night;
    sunset.setEnabled(dusk, lights.sunDir(), twilight);
    stage.backdrop.style.visibility = dusk ? 'hidden' : '';
    vegetation.setGolden(dusk);
    if (dusk && !cascades) cascades = createCascadeShadows(scene, rig.camera);
    cascades?.adopt(scene);
    cascades?.setEnabled(dusk, lights.sunDir(), lights.sun.color, lights.sun.intensity);
    lights.setSunActive(!dusk);
    realColors.setGlassEnv(dusk ? SUNSET.glassEnv : GLASS_ENV_BOOST);
    realColors.setInterior(dusk ? SUNSET.interior.clone().multiplyScalar(1 + 1.5 * twilight) : NO_INTERIOR);
    realColors.setEmissiveDesat(dusk ? SUNSET.emissiveDesat : 0);
    // El cielo del atardecer es casi todo naranja: reflejado de lleno, tiñe las caras en sombra.
    // El cielo de día ya no es naranja: el reflejo puede ir completo (techos satinados, vidrio pulido).
    realColors.setEnvIntensity(dusk ? 1 : 0.35);
    realColors.setRoofRough(dusk ? 0.5 : -1);
    realColors.setPaneInset(dusk ? SUNSET.paneInsetM : 0);
    realColors.setContact(dusk ? 0.45 : 0);
    parapets.visible = dusk && poly.campusBuildings.mesh.visible;
    // El césped lleva un ocre por vértice (el degradado del mapa); al atardecer se apaga y se manchan los tonos.
    poly.greenAreas.warmColor = dusk ? null : GRASS_WARM;
    setGrassVariation(poly.greenAreas.mesh.material as THREE.Material, dusk);
    setGroundMatte([poly.greenAreas, poly.xerophytic, poly.parking, poly.sidewalks]
      .flatMap((l) => (Array.isArray(l.mesh.material) ? l.mesh.material : [l.mesh.material])), dusk);
    realColors.setGlow(night ? 1 : dusk ? SUNSET.windowGlow * (1 + 1.2 * twilight) : 0);
    planNodes?.applyTheme(state.palette);
    relight();
    highlight.repaintAll();
    needsRender = true;
  }

  function resize() {
    const { w, h } = size();
    stage.resize(w, h);
    sunset.resize(w, h);
    cascades?.resize();
    rig.camera.aspect = w / h;
    rig.camera.updateProjectionMatrix();
    applyTheme();
  }

  const dom = renderer.domElement;
  // Mientras se barre, la cámara queda quieta: el arrastre es del barrido, no del giro.
  let sweeping = false;
  let controlsBeforeSweep = true;
  const sweep = cb.selectionSweep && createSelectionSweep({
    pickAt: (x, y) => pick(x, y, dom, rig.camera, pickables, isHidden)?.target ?? null,
    callbacks: cb.selectionSweep,
    begin: () => {
      sweeping = true; controlsBeforeSweep = rig.controls.enabled; rig.controls.enabled = false;
      dom.style.cursor = 'grabbing'; pin.hide(); highlight.setSelected(null); highlight.setHover(null);
    },
    end: () => { sweeping = false; rig.controls.enabled = controlsBeforeSweep; dom.style.cursor = ''; },
    requestRender: () => { needsRender = true; },
  });
  const unbind = bindPointer(dom, {
    ...(sweep ? { sweep } : {}),
    onPress: () => { rig.cancelFlight(); rig.controls.autoRotate = false; },
    onClick(x, y) {
      const incident = cb.onIncidentPick ? incidents.hitTest(x, y, dom, rig.camera) : null;
      if (incident !== null) { cb.onIncidentPick?.(incident); return; }
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
  const draw = () => {
    lights.follow(rig.controls.target, rig.camera.position.distanceTo(rig.controls.target));
    if (sunset.enabled()) { cascades?.update(); sunset.render(rig.camera.position.distanceTo(rig.controls.target)); } else renderer.render(scene, rig.camera);
  };
  // SPEC-118: la secuencia cambia de versión sin el vuelo de setSunset y sin rehacer el tema al cambiar la resolución.
  const sequence = createSequenceHooks({ renderer, rig, backdrop: stage.backdrop, sun: lights.sun,
    setGolden: (on, h) => { golden = on; sunsetHour = h; applyTheme(); },
    resize: () => {
      const { w, h } = size();
      stage.resize(w, h); sunset.resize(w, h); cascades?.resize();
      rig.camera.aspect = w / h;
      rig.camera.updateProjectionMatrix();
    },
    layout: () => resize(),
    setFixedSize: (s) => { fixedSize = s; },
    setPaused: (on) => { paused = on; },
    draw, requestRender: () => { needsRender = true; } }, SUNSET_HOURS[0]);
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  let frame = 0, lastDistance = 0, adminMode = false;
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    if (paused) return;
    const flew = rig.step(now), moved = sweeping ? false : rig.controls.update();
    const distance = rig.camera.position.distanceTo(rig.controls.target);
    if (Math.abs(distance - lastDistance) / Math.max(lastDistance, 1) > 0.04) { scaleFurniture(Object.values(points), distance); lastDistance = distance; }
    if (flew || moved || needsRender || rig.controls.autoRotate) {
      draw();
      const { w, h } = size();
      labels.update(rig.camera, w, h, labelVisible);
      balloons?.update(rig.camera, w, h, distance);
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
    setEligibleSections(codes) {
      eligibleSectionCodes=codes===null?null:new Set(codes);
      SECTION_LAYERS.forEach((id) => highlight.repaint(id));
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
      if (id === 'vegetation') vegetation.setGolden(golden && !night);
      needsRender = true;
    },
    select(target, focus) {
      highlight.setSelected(target);
      if (!target) pin.hide();
      if (target && focus) focusTarget(target);
      needsRender = true;
    },
    setNight: (v) => { night = v; applyTheme(); },
    setSunset(v) {
      const turnedOn = v && !golden;
      golden = v;
      // La toma a contraluz va casi a ras del horizonte: el modo deja bajar más la cámara.
      rig.controls.maxPolarAngle = v ? SUNSET_MAX_POLAR : ORBIT_MAX_POLAR;
      applyTheme();
      // Al prenderlo, la toma del modo: oblicua y hacia el sol, como el render de referencia.
      if (turnedOn && !night) rig.flyToPose(sunsetPose(center, lights.sunDir()));
    },
    setHour: (h) => { hour = h; relight(); needsRender = true; },
    setSunsetHour: (h) => { sunsetHour = h; if (golden) applyTheme(); },
    setCaptureMode: (on) => { markers.visible = !on; needsRender = true; },
    async snapshot(scale = 2) {
      // Un cuadro a más resolución, leído en el mismo turno en que se dibuja (el lienzo no se conserva).
      const ratio = renderer.getPixelRatio();
      const { w, h } = size();
      renderer.setPixelRatio(Math.min(ratio * scale, 4));
      stage.resize(w, h);
      sunset.resize(w, h);
      const shown = markers.visible;
      markers.visible = false;
      draw();
      markers.visible = shown;
      const blob = await new Promise<Blob | null>((resolve) => renderer.domElement.toBlob(resolve, 'image/png'));
      renderer.setPixelRatio(ratio);
      stage.resize(w, h);
      sunset.resize(w, h);
      needsRender = true;
      return blob;
    },
    setShadows(on) {
      renderer.shadowMap.enabled = on;
      lights.sun.castShadow = on;
      scene.traverse((o) => { const m = (o as THREE.Mesh).material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.needsUpdate = true; }); });
      needsRender = true;
    },
    setLabels: (on) => { labelsOn = on; needsRender = true; },
    setGrayBuildings: (v) => { gray = v; applyTheme(); },
    setRealColors(on) {
      realColors.setEnabled(on);
      setEdgesForRealColors(poly.campusBuildings.extra, on);
      highlight.repaint('campusBuildings');
      needsRender = true;
    },
    ...sequence,
    fit: rig.fit, top: rig.top, north: rig.north, toggleSpin: rig.toggleSpin, pose: rig.pose, flyToPose: rig.flyToPose,
    livePerspective() {
      const { camera, controls } = rig;
      const latLon = (v: THREE.Vector3) => data.plane.toLatLon({ x: v.x, y: -v.z });
      return {
        position: camera.position.toArray(), target: controls.target.toArray(), fovDeg: camera.fov,
        flying: rig.flying(), adminMode, cameraLatLon: latLon(camera.position), targetLatLon: latLon(controls.target),
      };
    },
    setViewCones(list) {
      cones.set(list.map((c) => { const p = data.plane.toPlane(c.lat, c.lon); return { id: c.id, x: p.x, z: -p.y, headingDeg: c.headingDeg }; }));
      needsRender = true;
    },
    setIncidentMarkers(list) {
      incidents.set(list.map((i) => { const p = data.plane.toPlane(i.lat, i.lon); return { id: i.id, x: p.x, z: -p.y, deadlineStatus: i.deadlineStatus }; }));
      needsRender = true;
    },
    highlightViewCone(id) {
      cones.highlight(id);
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
    setAdminMode(on) {
      adminMode = on;
      rig.setFree(on);
      admin.setEnabled(on);
      adminAnchor.setEnabled(on);
      // Al salir, la vista vuelve a la inicial, fija, con los límites de siempre.
      if (!on) rig.fit();
      needsRender = true;
    },
    setBalloons(list) {
      balloons?.set(list);
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
      balloons?.dispose();
      admin.dispose();
      adminAnchor.dispose();
      cones.dispose();
      incidents.dispose();
      cascades?.dispose();
      sunset.dispose();
      stage.dispose();
    },
  };
}
