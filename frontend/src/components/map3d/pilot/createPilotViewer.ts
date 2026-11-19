import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface PilotViewer {
  fit: () => void;
  top: () => void;
  setEdges: (visible: boolean) => void;
  dispose: () => void;
}

function disposeObject(object: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (!material) return;
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      material.dispose();
    });
  });
  textures.forEach((texture) => { texture.dispose(); texture.source.data?.close?.(); });
}

export function createPilotViewer(
  container: HTMLElement,
  modelUrl: string,
  modelName: string,
  onReady: () => void,
  onError: () => void,
): PilotViewer {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.setAttribute('aria-label', `Modelo 3D del ${modelName}`);
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9eff2');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6d7d86, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 0.65);
  sun.position.set(-25, 45, 30);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 5;
  controls.maxDistance = 200;
  const center = new THREE.Vector3();
  const edges = new THREE.Group();
  scene.add(edges);
  let radius = 25;
  let disposed = false;
  let topView = false;
  let frame = 0;
  const abort = new AbortController();

  function render() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!disposed) renderer.render(scene, camera);
    });
  }

  function fit() {
    const halfVertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfHorizontal = Math.atan(Math.tan(halfVertical) * camera.aspect);
    const distance = radius / Math.sin(Math.min(halfVertical, halfHorizontal)) * 1.08;
    const direction = topView ? new THREE.Vector3(0, 1, 0.001) : new THREE.Vector3(0.8, 0.75, 1).normalize();
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, distance);
    controls.update();
    render();
  }

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fit();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  controls.addEventListener('change', render);
  const contextLost = (event: Event) => { event.preventDefault(); onError(); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  resize();

  fetch(modelUrl, { signal: abort.signal })
    .then((response) => {
      if (!response.ok) throw new Error('Model download failed');
      return response.arrayBuffer();
    })
    .then((buffer) => new GLTFLoader().parseAsync(buffer, ''))
    .then(({ scene: model }) => {
      if (disposed) { disposeObject(model); return; }
      const box = new THREE.Box3().setFromObject(model);
      box.getCenter(center);
      radius = box.getSize(new THREE.Vector3()).length() / 2;
      scene.add(model);
      model.updateMatrixWorld(true);
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(child.geometry, 30),
          new THREE.LineBasicMaterial({ color: 0x486473, transparent: true, opacity: 0.5 }),
        );
        outline.applyMatrix4(child.matrixWorld);
        edges.add(outline);
      });
      const size = box.getSize(new THREE.Vector3());
      const gridSize = Math.ceil(Math.max(size.x, size.z, 50) / 2) * 2 + 10;
      controls.maxDistance = Math.max(200, radius * 10);
      const grid = new THREE.GridHelper(gridSize, gridSize / 2, 0x81939d, 0xcbd5dc);
      grid.position.y = box.min.y - 0.03;
      scene.add(grid);
      fit();
      onReady();
    })
    .catch(() => { if (!disposed) onError(); });

  return {
    fit: () => { topView = false; fit(); },
    top: () => { topView = true; fit(); },
    setEdges: (visible) => { edges.visible = visible; render(); },
    dispose() {
      disposed = true;
      abort.abort();
      observer.disconnect();
      controls.dispose();
      cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
