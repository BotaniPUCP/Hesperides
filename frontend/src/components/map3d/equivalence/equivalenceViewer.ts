import { bindModifiedSelection, insideSelection } from './modifiedSelection';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SceneData } from '../sceneData';
import { createCurrentMapViewer } from './currentMapViewer';

export interface ViewState { selected: string[]; linked: string[]; buildings: boolean; casetas: boolean; small: boolean; hideLinked?: boolean }
export interface EquivalenceViewer { update: (state: ViewState) => void; fit: () => void; top: () => void; focus: (ids: string[]) => void; dispose: () => void }
export function createEquivalenceViewer(container: HTMLElement, source: SceneData | string, onPick: (id: string) => void, onReady: () => void, onError: () => void): EquivalenceViewer {
  if (typeof source !== 'string') return createCurrentMapViewer(container, source, onPick, onReady);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.setAttribute('aria-label', typeof source === 'string' ? 'Mapa SKP seleccionable' : 'Mapa actual seleccionable');
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e6edf0');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x65706b, 0.8));
  const light = new THREE.DirectionalLight(0xffffff, 0.7); light.position.set(-300, 500, 200); scene.add(light);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 10000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN; controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 8; controls.maxDistance = 5000;
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  const meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
  const box = new THREE.Box3(); const abort = new AbortController();
  let ground: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> | null = null;
  let grassTexture: THREE.DataTexture | null = null;
  let disposed = false, frame = 0, ready = false, framed = false;
  let state: ViewState = { selected: [], linked: [], buildings: true, casetas: true, small: false };
  function render() { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (!disposed) { renderer.render(scene, camera); } }); }
  function fitBounds(bounds: THREE.Box3, top = false) {
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
    const half = Math.min(THREE.MathUtils.degToRad(camera.fov / 2), Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    const distance = Math.max(20, size.length() / 2 / Math.sin(half) * 1.1);
    controls.target.copy(center); camera.position.copy(center).addScaledVector(new THREE.Vector3(0, top ? 1 : 1.3, top ? 0.001 : 1).normalize(), distance);
    controls.update(); render();
  }
  function update(next: ViewState) {
    state = next; const selected = new Set(next.selected), linked = new Set(next.linked);
    for (const mesh of meshes) {
      const id = mesh.userData.partId as string;
      mesh.material.color.set(selected.has(id) ? '#f8a52b' : linked.has(id) ? '#4aaf84' : mesh.userData.category === 'caseta' ? '#7793aa' : '#b4aa98').convertSRGBToLinear();
      mesh.material.emissive.set(selected.has(id) ? '#3f2200' : '#000000');
      mesh.visible = !(next.hideLinked && linked.has(id)) && (mesh.userData.category === 'caseta' ? next.casetas : next.buildings) && (next.small || !mesh.userData.small || selected.has(id));
    }
    render();
  }
  function add(mesh: THREE.Mesh) {
    const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; old.forEach((m) => m.dispose());
    mesh.material = new THREE.MeshStandardMaterial({ color: '#c1b9a9', roughness: 0.9, side: THREE.DoubleSide });
    mesh.geometry.computeBoundingBox();
    const extent = mesh.geometry.boundingBox!.getSize(new THREE.Vector3());
    mesh.userData.small = Math.max(extent.x, extent.y, extent.z) < 1;
    meshes.push(mesh as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>);
  }
  function finish() {
    box.setFromObject(scene);
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const pixels = new Uint8Array(64 * 64 * 4);
    let seed = 73;
    for (let i = 0; i < pixels.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const variation = (seed / 4294967296 - 0.5) * 16;
      pixels[i] = 91 + variation; pixels[i + 1] = 119 + variation; pixels[i + 2] = 66 + variation; pixels[i + 3] = 255;
    }
    grassTexture = new THREE.DataTexture(pixels, 64, 64, THREE.RGBAFormat);
    grassTexture.encoding = THREE.sRGBEncoding;
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.magFilter = THREE.LinearFilter;
    grassTexture.minFilter = THREE.LinearMipmapLinearFilter;
    grassTexture.generateMipmaps = true;
    grassTexture.repeat.set((size.x + 60) / 20, (size.z + 60) / 20);
    grassTexture.needsUpdate = true;
    ground = new THREE.Mesh(new THREE.PlaneGeometry(size.x + 60, size.z + 60), new THREE.MeshStandardMaterial({ map: grassTexture, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(center.x, box.min.y - 0.15, center.z);
    scene.add(ground);
    ready = true; update(state); resize(); onReady();
  }
  if (typeof source === 'string') {
    fetch(source, { signal: abort.signal }).then((r) => { if (!r.ok) throw new Error('SKP unavailable'); return r.arrayBuffer(); })
      .then((b) => new GLTFLoader().parseAsync(b, '')).then(({ scene: model }) => {
        if (disposed) { model.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } }); return; }
        model.traverse((o) => { if (o instanceof THREE.Mesh) add(o); }); scene.add(model); finish();
      }).catch(() => { if (!disposed) onError(); });
  }
  const ray = new THREE.Raycaster(); let down: { x: number; y: number; id: number } | null = null; let moved = false;
  function start(event: PointerEvent) { if (event.button !== 0 || !event.isPrimary) { down = null; return; } down = { x: event.clientX, y: event.clientY, id: event.pointerId }; moved = false; }
  function move(event: PointerEvent) { if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) moved = true; }
  function end(event: PointerEvent) {
    const valid = down && down.id === event.pointerId && !moved; down = null; if (!valid || !ready) return;
    const rect = renderer.domElement.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
    const hit = ray.intersectObjects(meshes.filter((m) => m.visible), false)[0]; if (hit) onPick(String(hit.object.userData.partId));
  }
  const unbindModified = bindModifiedSelection(renderer.domElement, (x, y) => {
    if (!ready) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), camera);
    const hit = ray.intersectObjects(meshes.filter((mesh) => mesh.visible), false)[0];
    if (hit) onPick(String(hit.object.userData.partId));
  }, (box) => {
    const selected = new Set(state.selected);
    const ids = meshes.filter((mesh) => mesh.visible && !selected.has(String(mesh.userData.partId)) && insideSelection(new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()), camera, renderer.domElement, box)).map((mesh) => String(mesh.userData.partId));
    ids.forEach(onPick);
  });
  function cancel() { down = null; }
  renderer.domElement.addEventListener('pointerdown', start); renderer.domElement.addEventListener('pointermove', move); renderer.domElement.addEventListener('pointerup', end); renderer.domElement.addEventListener('pointercancel', cancel);
  controls.addEventListener('change', render);
  const lost = (event: Event) => { event.preventDefault(); onError(); }; renderer.domElement.addEventListener('webglcontextlost', lost);
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (ready && !framed) { fitBounds(box); framed = true; } else render();
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  return { update, fit: () => fitBounds(box), top: () => fitBounds(box, true), focus: (ids) => { const selected = new Set(ids), bounds = new THREE.Box3(); meshes.filter((m) => selected.has(String(m.userData.partId))).forEach((m) => bounds.expandByObject(m)); fitBounds(bounds); }, dispose() {
    disposed = true; unbindModified(); abort.abort(); observer.disconnect(); controls.dispose(); cancelAnimationFrame(frame);
    renderer.domElement.removeEventListener('pointerdown', start); renderer.domElement.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerup', end); renderer.domElement.removeEventListener('pointercancel', cancel); renderer.domElement.removeEventListener('webglcontextlost', lost);
    meshes.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
    ground?.geometry.dispose(); ground?.material.dispose(); grassTexture?.dispose();
    renderer.dispose(); renderer.domElement.remove();
  } };
}
