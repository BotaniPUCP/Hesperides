import * as THREE from 'three';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { BuildingModelManifest, BuildingProperties, VegetationProperties } from '@shared/types';
import { sampleLayers } from '../__fixtures__/mapLayers';
import { LocalPlane } from '../projection';
import { toSceneData, type Polygon, type ScenePoly } from '../sceneData';
import type { FoliageMaterials } from '../viewer/foliageMaterials';
import { elementOfVertex, merged } from '../viewer/geometry';
import { createLabels } from '../viewer/labels';
import { paletteFor } from '../viewer/palette';
import { mergedBuildings, parsePlanModel, sunkenFloorAt, type PlanModel } from '../viewer/planModel';
import { createPolyLayer, paintPoly, WORLD_LIFT } from '../viewer/polyLayer';
import { createPlanNodes, createSceneLayers, type PaintState } from '../viewer/sceneLayers';
import { createSunkenMask } from '../viewer/stage';
import type { SceneTextures } from '../viewer/textures';
import { createVegetationLayer } from '../viewer/vegetation';
import { usePlanModel } from '@/hooks/usePlanModel';
import { ApiError } from '@/lib/api';
import { mapApi } from '@/lib/map-api';

jest.mock('@/lib/map-api', () => ({ mapApi: { buildingModel: jest.fn(), buildingModelManifest: jest.fn() } }));

const mockedModel = mapApi.buildingModel as jest.MockedFunction<typeof mapApi.buildingModel>;
const mockedManifest = mapApi.buildingModelManifest as jest.MockedFunction<typeof mapApi.buildingModelManifest>;

const plane = new LocalPlane(-12.07, -77.08);
/** Cuadrado de 10 m en metros del plano, con su esquina en el origen. */
const square = (x0 = 0, y0 = 0, side = 10): Polygon[] => [[[x0, y0, x0 + side, y0, x0 + side, y0 + side, x0, y0 + side]]];

/** Un piso y un muro que comparten una arista: con normales por cara, cada triángulo conserva la suya. */
const corner = new Float32Array([
  0, 0, 0, 1, 0, 0, 0, 0, -1,
  0, 0, 0, 0, 0, -1, 0, 1, 0,
]);

function building(id: number, planKey: string | null, g: Polygon[] = square()): ScenePoly<BuildingProperties> {
  return {
    g,
    props: { id, name: `Edificio ${id}`, inferredName: false, category: null, campus: true, heightM: 10, levels: null, source: 'PUCP',
      aliases: null, parentId: null, planKey, baseM: 0, codes: null },
  };
}

function modelWith(buildings: Record<string, Float32Array>, extra: Partial<PlanModel> = {}): PlanModel {
  return {
    buildings: new Map(Object.entries(buildings)), nodes: {}, sunken: [], offset: { x: 0, z: 0 },
    huaca: { label: 'Camino Prehispánico', x: 0, y: 4.9, z: 0 }, ...extra,
  };
}

function fakeTextures(): SceneTextures {
  const keys = ['building', 'buildingNormal', 'green', 'greenNormal', 'ground', 'groundNormal', 'parking', 'foliage', 'foliageNormal',
    'tapial', 'tapialNormal', 'tierra', 'tierraNormal'];
  return Object.fromEntries(keys.map((k) => [k, new THREE.Texture()])) as unknown as SceneTextures;
}

const height = () => 10;
const base = () => 0;

interface TestNode {
  name: string;
  positions: number[];
  uv?: number[];
}

/** Un GLB mínimo como el del generador: un nodo por malla, sin índice, solo POSITION y, si hay, TEXCOORD_0. */
function glb(nodes: TestNode[]): ArrayBuffer {
  const arrays: Float32Array[] = [];
  const accessors: object[] = [];
  const bufferViews: object[] = [];
  let byteLength = 0;
  const add = (values: number[], size: 2 | 3) => {
    const array = new Float32Array(values);
    const axis = (k: number) => values.filter((_, i) => i % size === k);
    const range = [...Array(size).keys()];
    bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: array.byteLength });
    accessors.push({ bufferView: bufferViews.length - 1, componentType: 5126, count: values.length / size, type: size === 3 ? 'VEC3' : 'VEC2',
      min: range.map((k) => Math.min(...axis(k))), max: range.map((k) => Math.max(...axis(k))) });
    arrays.push(array);
    byteLength += array.byteLength;
    return accessors.length - 1;
  };
  const meshes = nodes.map((n) => {
    const attributes: Record<string, number> = { POSITION: add(n.positions, 3) };
    if (n.uv) attributes.TEXCOORD_0 = add(n.uv, 2);
    return { name: n.name, primitives: [{ attributes }] };
  });
  const json = JSON.stringify({
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes: nodes.map((n, i) => ({ name: n.name, mesh: i })), meshes, accessors, bufferViews, buffers: [{ byteLength }],
  });
  const jsonLength = Math.ceil(json.length / 4) * 4;
  const out = new ArrayBuffer(12 + 8 + jsonLength + 8 + byteLength);
  const view = new DataView(out);
  const bytes = new Uint8Array(out);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, out.byteLength, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  for (let i = 0; i < jsonLength; i++) bytes[20 + i] = i < json.length ? json.charCodeAt(i) : 0x20;
  const bin = 20 + jsonLength;
  view.setUint32(bin, byteLength, true);
  view.setUint32(bin + 4, 0x004e4942, true);
  let at = bin + 8;
  arrays.forEach((a) => { bytes.set(new Uint8Array(a.buffer), at); at += a.byteLength; });
  return out;
}

/** El cuadrado de 10 m del plano como GeoJSON, en grados. */
function squareGeoJson() {
  const ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]].map(([x, y]) => {
    const [lat, lon] = plane.toLatLon({ x, y });
    return [lon, lat];
  });
  return { type: 'Polygon', coordinates: [ring] };
}

function manifestWith(extra: Partial<BuildingModelManifest> = {}): BuildingModelManifest {
  const [lat, lon] = plane.toLatLon({ x: 0, y: 0 });
  return {
    version: 'sha', anchor: { lat, lon }, nodes: { k1: 'edificio' }, groundOnly: [], sunken: [],
    huaca: { label: 'Camino Prehispánico', at: [lat, lon, 4.9] }, ...extra,
  };
}

function expectClose(actual: ArrayLike<number> | undefined, expected: number[]) {
  expect(actual).toBeDefined();
  expect(Array.from(actual as ArrayLike<number>)).toHaveLength(expected.length);
  expected.forEach((v, i) => expect((actual as ArrayLike<number>)[i]).toBeCloseTo(v, 4));
}

describe('mergedBuildings', () => {
  it('usa la malla del modelo para un edificio con nodo y el prisma para uno sin planKey', () => {
    const feats = [building(1, 'k1'), building(2, null)];
    const prism = merged([0], () => square(), height, base);

    const result = mergedBuildings(feats, modelWith({ k1: corner }), height, base);

    expect(result.starts).toHaveLength(3);
    expect(result.starts[1] - result.starts[0]).toBe(6);
    expect(result.starts[2] - result.starts[1]).toBe(prism.starts[1]);
    expectClose((result.geo.attributes.position.array as Float32Array).slice(0, 18), Array.from(corner));
  });

  it('calcula las normales por cara: el piso mira arriba y el muro al este, también en la arista compartida', () => {
    const { geo } = mergedBuildings([building(1, 'k1')], modelWith({ k1: corner }), height, base);
    const normals = geo.attributes.normal.array as Float32Array;

    for (let v = 0; v < 3; v++) expectClose(normals.slice(v * 3, v * 3 + 3), [0, 1, 0]);
    for (let v = 3; v < 6; v++) expectClose(normals.slice(v * 3, v * 3 + 3), [1, 0, 0]);
  });

  it('un techo con la cara invertida se tiñe como techo, no como la base: el SKP trae caras al revés', () => {
    // Un muro de 10 m y, arriba, un techo cuya normal apunta hacia abajo.
    const wall = [0, 0, 0, 0, 0, -1, 0, 10, 0];
    const invertedRoof = [0, 10, 0, 0, 10, -1, 1, 10, 0];
    const { geo, tone } = mergedBuildings([building(1, 'k1')], modelWith({ k1: new Float32Array([...wall, ...invertedRoof]) }), height, base);

    expect(geo.attributes.normal.getY(3)).toBeCloseTo(-1);
    for (let v = 3; v < 6; v++) expect(tone[v]).toBeGreaterThanOrEqual(1.12);
  });

  it('sin modelo dibuja los mismos prismas que hoy', () => {
    const feats = [building(1, 'k1'), building(2, null, square(20, 0, 5))];

    const result = mergedBuildings(feats, null, height, base);

    expect(result.starts).toEqual(merged([0, 1], (i) => feats[i].g, height, base).starts);
  });
});

describe('parsePlanModel', () => {
  it('ubica con el anclaje: un anclaje 10 m al este desplaza +10 en x las posiciones del edificio', async () => {
    const [lat, lon] = plane.toLatLon({ x: 10, y: 0 });
    const manifest = manifestWith({ anchor: { lat, lon }, nodes: { 'unified:lugar-prestado': 'edificio', suelo: 'suelo' } });
    const file = glb([
      { name: 'unified:lugar-prestado', positions: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      { name: 'suelo', positions: [0, 0, 0, 1, 0, 0, 0, 0, -1], uv: [0, 0, 1, 0, 0, 1] },
    ]);

    const model = await parsePlanModel(manifest, file, plane);

    expectClose(model.buildings.get('unified:lugar-prestado'), [11, 2, 3, 14, 5, 6, 17, 8, 9]);
    expect(model.offset.x).toBeCloseTo(10, 4);
    expect(model.offset.z).toBeCloseTo(0, 4);
    // El suelo queda en el marco del anclaje, con sus coordenadas de textura: la malla se ubica con `offset`.
    expectClose(model.nodes.suelo?.positions, [0, 0, 0, 1, 0, 0, 0, 0, -1]);
    expectClose(model.nodes.suelo?.uv ?? undefined, [0, 0, 1, 0, 0, 1]);
  });

  it('junta los nodos de un mismo tipo, como los muros y el fondo de los desniveles', async () => {
    const manifest = manifestWith({ nodes: { 'muros-desnivel': 'muro', 'fondo-desnivel': 'muro' } });
    const file = glb([
      { name: 'muros-desnivel', positions: [0, 0, 0, 1, 0, 0, 0, -1, 0], uv: [0, 0, 1, 0, 0, 1] },
      { name: 'fondo-desnivel', positions: [0, -10.5, 0, 1, -10.5, 0, 0, -10.5, -1], uv: [0, 0, 1, 0, 0, 1] },
    ]);

    const model = await parsePlanModel(manifest, file, plane);

    expect(model.nodes.muro?.positions).toHaveLength(18);
    expect(model.nodes.muro?.uv).toHaveLength(12);
    expect(model.buildings.size).toBe(0);
  });

  it('lleva los desniveles y la etiqueta de la huaca al plano local', async () => {
    const [lat, lon] = plane.toLatLon({ x: 30, y: -40 });
    const manifest = manifestWith({ sunken: [{ polygon: squareGeoJson(), floorM: -8.4 }], huaca: { label: 'Camino Prehispánico', at: [lat, lon, 4.9] } });

    const model = await parsePlanModel(manifest, glb([{ name: 'k1', positions: [0, 0, 0, 1, 0, 0, 0, 1, 0] }]), plane);

    expect(model.sunken).toHaveLength(1);
    expect(model.sunken[0].floorM).toBe(-8.4);
    expectClose(model.sunken[0].g[0][0], [0, 0, 10, 0, 10, 10, 0, 10]);
    expect(model.huaca.label).toBe('Camino Prehispánico');
    expectClose([model.huaca.x, model.huaca.y, model.huaca.z], [30, 4.9, 40]);
  });

  it('un principal que es todo suelo no lleva malla ni prisma: su tramo queda vacío y los demás no se corren', async () => {
    const manifest = manifestWith({ groundOnly: ['rampa'] });
    const model = await parsePlanModel(manifest, glb([{ name: 'k1', positions: Array.from(corner) }]), plane);

    const result = mergedBuildings([building(1, 'rampa'), building(2, 'k1')], model, height, base);

    expect(result.starts).toEqual([0, 0, 6]);
    // Un clic sobre la malla cae en el segundo edificio, no en la rampa vacía.
    expect(elementOfVertex(result.starts, 3)).toBe(1);
  });
});

describe('capa de edificios con modelo', () => {
  it('repinta el modelo: con «edificios en gris» el tramo del modelo toma #8A8A90 por su tono', () => {
    const feats = [building(1, 'k1'), building(2, null)];
    const layer = createPolyLayer(new THREE.Scene(), 'campusBuildings', feats.map((f) => f.g),
      { surface: 'building', height, base, color: () => '#FF1878', doubleSided: true }, fakeTextures(),
      mergedBuildings(feats, modelWith({ k1: corner }), height, base));

    paintPoly(layer, () => '#8A8A90');

    const colors = (layer.mesh.geometry as THREE.BufferGeometry).attributes.color.array as Float32Array;
    const gray = new THREE.Color('#8A8A90');
    expect(layer.starts[1] - layer.starts[0]).toBe(6);
    for (let v = layer.starts[0]; v < layer.starts[1]; v++) {
      expectClose(colors.slice(v * 3, v * 3 + 3), [gray.r, gray.g, gray.b].map((c) => Math.min(c * layer.tone[v], 1)));
    }
  });

  it('con modelo, los edificios van por las dos caras con la sombra de las traseras y el suelo se abre en los desniveles', () => {
    const data = toSceneData(sampleLayers);
    data.campusBuildings[0] = { ...data.campusBuildings[0], props: { ...data.campusBuildings[0].props, planKey: 'k1' } };
    const state: PaintState = { mode: 'base', hidden: new Set(), palette: paletteFor(false, false) };
    const model = modelWith({ k1: corner }, { sunken: [{ g: square(), floorM: -2 }] });

    const withModel = createSceneLayers(new THREE.Scene(), data, fakeTextures(), state, model);
    const today = createSceneLayers(new THREE.Scene(), data, fakeTextures(), state, null);

    const buildings = withModel.campusBuildings.mesh.material as THREE.Material;
    expect(withModel.campusBuildings.starts).toEqual([0, 6]);
    expect(buildings.side).toBe(THREE.DoubleSide);
    expect(buildings.shadowSide).toBe(THREE.BackSide);
    expect((today.campusBuildings.mesh.material as THREE.Material).side).toBe(THREE.FrontSide);
    for (const id of ['greenAreas', 'xerophytic', 'parking', 'sidewalks', 'reserve', 'supervision'] as const) {
      const opened = withModel[id].mesh.material as THREE.Material;
      expect(opened).toMatchObject({ stencilWrite: true, stencilFunc: THREE.NotEqualStencilFunc, stencilRef: 1 });
      expect((today[id].mesh.material as THREE.Material).stencilWrite).toBe(false);
    }
  });
});

describe('desniveles', () => {
  it('createSunkenMask marca el stencil donde se abren los desniveles, sin pintar ni tapar nada', () => {
    const scene = new THREE.Scene();

    const mask = createSunkenMask(scene, [{ g: square(), floorM: -2 }]);

    expect(scene.children).toContain(mask);
    expect(mask.renderOrder).toBe(-10);
    expect(mask.position.y).toBe(WORLD_LIFT);
    expect(mask.material).toMatchObject({
      colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp,
    });
  });

  it('sunkenFloorAt da el piso del desnivel que contiene el punto y 0 fuera de ellos', () => {
    const sunken = [{ g: square(), floorM: -8.4 }, { g: [[[20, 0, 30, 0, 30, 10, 20, 10], [24, 4, 26, 4, 26, 6, 24, 6]]], floorM: -2.1 }];

    expect(sunkenFloorAt(sunken, 5, 5)).toBe(-8.4);
    expect(sunkenFloorAt(sunken, 22, 2)).toBe(-2.1);
    expect(sunkenFloorAt(sunken, 25, 5)).toBe(0); // en el hueco del segundo
    expect(sunkenFloorAt(sunken, 50, 50)).toBe(0);
  });

  it('las plantas dentro de un desnivel bajan a su piso', () => {
    const props: VegetationProperties = {
      code: 'EV-000400', speciesSlug: 'delonix-regia', commonName: 'Ponciana', scientificName: 'Delonix regia',
      typeCode: 'TREE', typeLabel: 'Árbol', quantity: 1, heightM: 8, crownRadiusM: 3,
    };
    const materials: FoliageMaterials = {
      foliage: () => new THREE.MeshPhysicalMaterial(), glow: new THREE.MeshBasicMaterial(), contact: new THREE.MeshBasicMaterial(),
      setLighting: () => undefined,
    };
    const plants = [{ p: [5, 5] as [number, number], props }, { p: [50, 50] as [number, number], props }];

    const layer = createVegetationLayer(new THREE.Scene(), plants, materials, [{ g: square(), floorM: -8.4 }]);

    const crownY = (i: number) => {
      const { mesh, k } = layer.slots[i];
      const m = new THREE.Matrix4();
      mesh.getMatrixAt(k, m);
      return new THREE.Vector3().setFromMatrixPosition(m).y;
    };
    expect(crownY(0) - crownY(1)).toBeCloseTo(-8.4, 5);
  });
});

describe('nodos del modelo', () => {
  const node = (positions: number[], uv: number[] | null = null) => ({ positions: new Float32Array(positions), uv: uv && new Float32Array(uv) });
  const tri = [0, 0, 0, 1, 0, 0, 0, 0, -1];

  it('dibuja el suelo y los muros con el zócalo, el jardín con césped, la huaca de tierra y la decoración del color de edificio', () => {
    const scene = new THREE.Scene();
    const textures = fakeTextures();
    const ground = { top: new THREE.MeshPhysicalMaterial(), side: new THREE.MeshPhysicalMaterial() };
    const model = modelWith({}, {
      offset: { x: 12, z: -7 },
      nodes: { suelo: node(tri, [0, 0, 1, 0, 0, 1]), muro: node(tri), jardin: node(tri), 'huaca-muro': node(tri), 'huaca-tope': node(tri), decoracion: node(tri) },
    });

    const nodes = createPlanNodes(scene, model, textures, ground, paletteFor(false, false));

    const byMaterial = (m: THREE.Material) => scene.children.find((o) => (o as THREE.Mesh).material === m) as THREE.Mesh | undefined;
    const suelo = byMaterial(ground.top);
    expect(suelo?.position.toArray()).toEqual([12, WORLD_LIFT, -7]);
    expect(byMaterial(ground.side)).toBeDefined();
    const meshes = scene.children as THREE.Mesh[];
    const withMap = (t: THREE.Texture) => meshes.find((o) => (o.material as THREE.MeshStandardMaterial).map === t);
    expect((withMap(textures.green)?.material as THREE.MeshStandardMaterial).vertexColors).toBe(false);
    expect((withMap(textures.tapial)?.material as THREE.MeshStandardMaterial).roughness).toBeGreaterThan(0.9);
    expect(withMap(textures.tierra)).toBeDefined();
    expect(nodes.decoration?.userData.layer).toBeUndefined();
    expect((nodes.decoration?.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('ff1878');

    nodes.applyTheme(paletteFor(false, true));

    expect((nodes.decoration?.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('8a8a90');
  });

  it('createLabels suma la etiqueta de la huaca cuando hay modelo', () => {
    const root = document.createElement('div');
    const data = { campusBuildings: [], greenAreas: [], gates: [] } as unknown as Parameters<typeof createLabels>[1];

    createLabels(root, data, [], [], { label: 'Camino Prehispánico', x: 0, y: 4.9, z: 0 });

    expect([...root.children].map((el) => el.textContent)).toEqual(['Camino Prehispánico']);
  });
});

describe('usePlanModel', () => {
  // El modelo leído queda en memoria por origen del plano: cada prueba usa el suyo para no heredar el de otra.
  let site = 0;
  const newOrigin = (): [number, number] => [-12 - ++site * 0.01, -77.08];
  const glbBlob = () => ({ arrayBuffer: () => Promise.resolve(glb([{ name: 'k1', positions: Array.from(corner) }])) }) as Blob;

  afterEach(() => jest.clearAllMocks());

  /** Primera visita: descarga y lee el modelo; devuelve el modelo y desmonta. */
  async function firstVisit(origin: [number, number]) {
    const visit = new LocalPlane(...origin);
    const first = renderHook(() => usePlanModel(visit));
    await waitFor(() => expect(first.result.current.model).not.toBeNull());
    const model = first.result.current.model;
    first.unmount();
    jest.clearAllMocks();
    return model;
  }

  it('no lanza: con un 401 al descargar el modelo devuelve { model: null, failed: true }', async () => {
    mockedManifest.mockResolvedValue(manifestWith());
    mockedModel.mockRejectedValue(new ApiError(401, 'Session expired'));
    const somewhere = new LocalPlane(...newOrigin());

    const { result } = renderHook(() => usePlanModel(somewhere));

    await waitFor(() => expect(result.current).toEqual({ model: null, failed: true }));
  });

  it('sin plano no descarga nada', () => {
    const { result } = renderHook(() => usePlanModel(null));

    expect(result.current).toEqual({ model: null, failed: false });
    expect(mockedModel).not.toHaveBeenCalled();
  });

  it('mientras no puede descargar no pide nada, y pide el modelo cuando puede', async () => {
    mockedManifest.mockResolvedValue(manifestWith());
    mockedModel.mockResolvedValue(glbBlob());
    const somewhere = new LocalPlane(...newOrigin());

    const { result, rerender } = renderHook(({ canDownload }) => usePlanModel(somewhere, canDownload), {
      initialProps: { canDownload: false },
    });
    await act(async () => undefined);
    expect(result.current).toEqual({ model: null, failed: false });
    expect(mockedManifest).not.toHaveBeenCalled();
    expect(mockedModel).not.toHaveBeenCalled();

    rerender({ canDownload: true });
    await waitFor(() => expect(result.current.model).not.toBeNull());
  });

  it('sin poder descargar entrega igual el modelo ya leído en la sesión', async () => {
    const origin = newOrigin();
    mockedManifest.mockResolvedValue(manifestWith({ version: 'v1' }));
    mockedModel.mockResolvedValue(glbBlob());
    const model = await firstVisit(origin);

    const { result } = renderHook(() => usePlanModel(new LocalPlane(...origin), false));

    // La segunda visita abre ya con el modelo: el primer visor no pasa por los prismas.
    expect(result.current).toEqual({ model, failed: false });
    await act(async () => undefined);
    expect(mockedManifest).not.toHaveBeenCalled();
  });

  it('entrega el modelo cuando el manifiesto y el GLB llegan', async () => {
    mockedManifest.mockResolvedValue(manifestWith());
    mockedModel.mockResolvedValue(glbBlob());
    const somewhere = new LocalPlane(...newOrigin());

    const { result } = renderHook(() => usePlanModel(somewhere));

    await waitFor(() => expect(result.current.model).not.toBeNull());
    expect(result.current.failed).toBe(false);
    expect(result.current.model?.buildings.get('k1')).toHaveLength(18);
  });

  it('una segunda visita al mismo plano abre ya con el modelo leído y no vuelve a descargar el GLB', async () => {
    const origin = newOrigin();
    mockedManifest.mockResolvedValue(manifestWith({ version: 'v1' }));
    mockedModel.mockResolvedValue(glbBlob());
    const model = await firstVisit(origin);

    const again = new LocalPlane(...origin);
    const { result } = renderHook(() => usePlanModel(again));

    expect(result.current).toEqual({ model, failed: false });
    await waitFor(() => expect(mockedManifest).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    expect(result.current.model).toBe(model);
    expect(mockedModel).not.toHaveBeenCalled();
  });

  it('si cambió la versión del modelo, lo vuelve a descargar', async () => {
    const origin = newOrigin();
    mockedManifest.mockResolvedValue(manifestWith({ version: 'v1' }));
    mockedModel.mockResolvedValue(glbBlob());
    const old = await firstVisit(origin);
    mockedManifest.mockResolvedValue(manifestWith({ version: 'v2' }));

    const again = new LocalPlane(...origin);
    const { result } = renderHook(() => usePlanModel(again));

    // Mientras pregunta, se ve el que ya tenía; después, el nuevo.
    expect(result.current.model).toBe(old);
    await waitFor(() => {
      expect(result.current.model).not.toBeNull();
      expect(result.current.model).not.toBe(old);
    });
    expect(mockedModel).toHaveBeenCalledTimes(1);
  });

  it('si no puede preguntar la versión, se queda con el modelo que ya leyó en la sesión', async () => {
    const origin = newOrigin();
    mockedManifest.mockResolvedValue(manifestWith({ version: 'v1' }));
    mockedModel.mockResolvedValue(glbBlob());
    const model = await firstVisit(origin);
    mockedManifest.mockRejectedValue(new TypeError('Failed to fetch'));

    const again = new LocalPlane(...origin);
    const { result } = renderHook(() => usePlanModel(again));

    await waitFor(() => expect(mockedManifest).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    expect(result.current).toEqual({ model, failed: false });
    expect(mockedModel).not.toHaveBeenCalled();
  });
});
