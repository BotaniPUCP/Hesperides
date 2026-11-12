// Usage: node scripts/build-campus-pilots.mjs <directory containing extracted pilot JSON> [Z|N]
// Face coordinates are world-space SKP meters, extracted through SketchUp SDK.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ShapeUtils, Vector2, Vector3 } from 'three';
import { createNAppearance } from './pabellon-n-appearance.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2];
if (!source) throw new Error('Provide the extracted SKP directory');
const modelPath = (name) => path.join(root, 'public/models', name);
function writeGlb(file, json, binary) {
  const text = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32);
  text.copy(padded);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + binary.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const chunk = Buffer.alloc(8);
  chunk.writeUInt32LE(binary.length, 0);
  chunk.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(file, Buffer.concat([header, padded, chunk, binary]));
}

// Bake the user-requested reflection into G, including normals and winding.
// Guard against reflecting it twice when rerunning the Z export.
const gFile = modelPath('pabellon-g-v0.glb');
const original = fs.readFileSync(gFile);
const jsonLength = original.readUInt32LE(12);
const g = JSON.parse(original.subarray(20, 20 + jsonLength).toString());
const binary = Buffer.from(original.subarray(28 + jsonLength));
if (!g.nodes[0].extras?.reflection) {
  for (const primitive of g.meshes[0].primitives) {
    if (primitive.indices !== undefined) throw new Error('Expected non-indexed G geometry');
    for (const semantic of ['POSITION', 'NORMAL']) {
      const accessor = g.accessors[primitive.attributes[semantic]];
      const view = g.bufferViews[accessor.bufferView];
      const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      if (accessor.componentType !== 5126 || view.byteStride) throw new Error('Unexpected G buffer layout');
      for (let i = 0; i < accessor.count; i++) {
        const at = offset + i * 12;
        binary.writeFloatLE(-binary.readFloatLE(at), at);
      }
      for (let i = 0; i < accessor.count; i += 3) {
        const a = offset + (i + 1) * 12;
        const b = offset + (i + 2) * 12;
        const temp = Buffer.from(binary.subarray(a, a + 12));
        binary.copy(binary, a, b, b + 12);
        temp.copy(binary, b);
      }
      if (accessor.min && accessor.max) {
        [accessor.min[0], accessor.max[0]] = [-accessor.max[0], -accessor.min[0]];
      }
    }
  }
  g.nodes[0].extras.reflection = { axis: 'local X', reason: 'User-confirmed lateral inversion', determinant: -1 };
  writeGlb(gFile, g, binary);
}

const building = process.argv[3] ?? 'Z';
if (!['Z', 'N'].includes(building)) throw new Error('Expected Z or N');
const slug = building.toLowerCase();
const z = JSON.parse(fs.readFileSync(path.join(source, `${slug}-pilot.json`), 'utf8'));
const [min, max] = z.bounds;
const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, min[2]];
const positions = [];
const normals = [];
const appearance = building === 'N' ? await createNAppearance() : null;
const uvs = [];
const materialIndices = appearance?.materials.map(() => []);
for (const face of z.faces) {
  const surface = appearance?.face(face);
  const rings = face.rings.map((ring) => ring.map((p) => new Vector3(p[0] - center[0], p[2] - center[2], -(p[1] - center[1]))));
  const normal = new Vector3();
  const outer = rings[0];
  for (let i = 0; i < outer.length; i++) normal.add(new Vector3().crossVectors(outer[i], outer[(i + 1) % outer.length]));
  if (normal.lengthSq() < 1e-16) continue;
  normal.normalize();
  const drop = [Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z)].indexOf(Math.max(Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z)));
  const project = (p) => new Vector2(...p.toArray().filter((_, i) => i !== drop));
  const flat = rings.flat();
  const triangles = ShapeUtils.triangulateShape(outer.map(project), rings.slice(1).map((r) => r.map(project)));
  for (const triangle of triangles) {
    const points = triangle.map((i) => flat[i]);
    const cross = new Vector3().subVectors(points[1], points[0]).cross(new Vector3().subVectors(points[2], points[0]));
    if (cross.lengthSq() < 1e-16) continue;
    if (cross.dot(normal) < 0) [points[1], points[2]] = [points[2], points[1]];
    for (const point of points) {
      if (surface) {
        materialIndices[surface.material].push(positions.length / 3);
        uvs.push(...surface.uv([point.x + center[0], center[1] - point.z, point.y + center[2]]));
      }
      positions.push(...point.toArray()); normals.push(...normal.toArray());
    }
  }
}
const p = new Float32Array(positions);
const n = new Float32Array(normals);
let bytes = Buffer.concat([Buffer.from(p.buffer), Buffer.from(n.buffer)]);
const sourceMetadata = JSON.parse(fs.readFileSync(path.join(root, 'src/components/map3d/pilot/pabellonG.json'), 'utf8')).source;
const bounds = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
for (let i = 0; i < p.length; i++) { bounds[0][i % 3] = Math.min(bounds[0][i % 3], p[i]); bounds[1][i % 3] = Math.max(bounds[1][i % 3], p[i]); }
const gltf = {
  asset: { version: '2.0', generator: 'Hesperides SKP pilot v0' }, scene: 0, scenes: [{ nodes: [0] }],
  nodes: [{ name: `Pabellon ${building} - SKP v0`, mesh: 0, extras: { source: sourceMetadata.fileName, sourceSha256: sourceMetadata.sha256, identification: 'provisional spatial match', georeferenced: false, units: 'meters', faceCount: z.faces.length } }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0 }] }],
  materials: [{ name: 'Pilot neutral visualization', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.72, 0.78, 0.8, 1], roughnessFactor: 0.8, metallicFactor: 0 } }],
  buffers: [{ byteLength: bytes.length }],
  bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: p.byteLength }, { buffer: 0, byteOffset: p.byteLength, byteLength: n.byteLength }],
  accessors: [{ bufferView: 0, componentType: 5126, count: p.length / 3, type: 'VEC3', min: bounds[0], max: bounds[1] }, { bufferView: 1, componentType: 5126, count: n.length / 3, type: 'VEC3' }],
};
if (appearance) {
  const append = (buffer) => {
    const padded = Buffer.alloc(Math.ceil(buffer.length / 4) * 4);
    buffer.copy(padded);
    const index = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset: bytes.length, byteLength: buffer.length });
    bytes = Buffer.concat([bytes, padded]);
    return index;
  };
  const uvView = append(Buffer.from(new Float32Array(uvs).buffer));
  gltf.accessors.push({ bufferView: uvView, componentType: 5126, count: uvs.length / 2, type: 'VEC2' });
  gltf.meshes[0].primitives = materialIndices.flatMap((indices, material) => {
    if (!indices.length) return [];
    const view = append(Buffer.from(new Uint32Array(indices).buffer));
    const accessor = gltf.accessors.length;
    gltf.accessors.push({ bufferView: view, componentType: 5125, count: indices.length, type: 'SCALAR' });
    return [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: accessor, material }];
  });
  gltf.images = appearance.images.map((data) => ({ bufferView: append(data), mimeType: 'image/png' }));
  gltf.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
  gltf.textures = appearance.images.map((_, source) => ({ source, sampler: 0 }));
  gltf.materials = appearance.materials;
  gltf.buffers[0].byteLength = bytes.length;
  gltf.nodes[0].extras.appearance = 'Photo-guided approximation; unseen elevations extrapolated; geometry unchanged';
  console.info('N surface triangle counts:', materialIndices.map((a) => a.length / 3));
}
writeGlb(modelPath(`pabellon-${slug}-v0.glb`), gltf, bytes);
fs.writeFileSync(path.join(root, `src/components/map3d/pilot/pabellon${building}.json`), JSON.stringify({ version: 0, asset: `/models/pabellon-${slug}-v0.glb${appearance ? "?revision=photo-materials-1" : ""}`, source: { fileName: sourceMetadata.fileName, sha256: sourceMetadata.sha256, units: 'meters', georeferenced: false, sourceCenterM: center, faceIndices: z.faces.map((f) => f.index), identification: z.identification ?? 'provisional spatial match to relation/16264374', referenceUrl: z.referenceUrl }, measurements: { totalHeightM: max[2] - min[2], extentXM: max[0] - min[0], extentYM: max[1] - min[1] } }, null, 2) + '\n');
console.info(`${building} exported: ${z.faces.length} faces, ${p.length / 9} triangles, height ${max[2] - min[2]} m`);
