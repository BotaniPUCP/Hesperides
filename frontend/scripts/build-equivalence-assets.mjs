// Inputs are SDK-extracted faces and deterministic vertex-connected components.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Vector2, Vector3, ShapeUtils } from 'three';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2];
const listFile = process.argv[3];
if (!source || !listFile) throw new Error('Expected extraction directory and code list');
const output = path.join(root, 'public/models/equivalence');
fs.mkdirSync(output, { recursive: true });
const positions = [], normals = [], parts = [], meshes = [], nodes = [], accessors = [];
const origin = [350, 350, 91.4397];
for (const [file, category] of [['building', 'building'], ['caseta', 'caseta']]) {
  const faces = JSON.parse(fs.readFileSync(path.join(source, `${file}-faces.json`), 'utf8'));
  const components = JSON.parse(fs.readFileSync(path.join(source, `${file}-components.json`), 'utf8'));
  for (const part of components) {
    const start = positions.length / 3;
    for (const id of part.faces) {
      const rings = faces[id].rings.map((ring) => ring.map((p) => new Vector3(p[0] - origin[0], p[2] - origin[2], -(p[1] - origin[1]))));
      const normal = new Vector3();
      const outer = rings[0];
      for (let i = 0; i < outer.length; i++) normal.add(new Vector3().crossVectors(outer[i], outer[(i + 1) % outer.length]));
      if (normal.lengthSq() < 1e-16) continue;
      normal.normalize();
      const abs = normal.toArray().map(Math.abs), drop = abs.indexOf(Math.max(...abs));
      const project = (p) => new Vector2(...p.toArray().filter((_, i) => i !== drop));
      const flat = rings.flat();
      for (const triangle of ShapeUtils.triangulateShape(outer.map(project), rings.slice(1).map((r) => r.map(project)))) {
        const pts = triangle.map((i) => flat[i]);
        const cross = new Vector3().subVectors(pts[1], pts[0]).cross(new Vector3().subVectors(pts[2], pts[0]));
        if (cross.lengthSq() < 1e-16) continue;
        if (cross.dot(normal) < 0) [pts[1], pts[2]] = [pts[2], pts[1]];
        for (const p of pts) { positions.push(...p.toArray()); normals.push(...normal.toArray()); }
      }
    }
    const count = positions.length / 3 - start;
    if (!count) continue;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = start * 3; i < positions.length; i++) { min[i % 3] = Math.min(min[i % 3], positions[i]); max[i % 3] = Math.max(max[i % 3], positions[i]); }
    const index = accessors.length;
    accessors.push({ bufferView: 0, byteOffset: start * 12, componentType: 5126, count, type: 'VEC3', min, max }, { bufferView: 1, byteOffset: start * 12, componentType: 5126, count, type: 'VEC3' });
    nodes.push({ mesh: meshes.length, name: part.id, extras: { partId: part.id, category } });
    meshes.push({ primitives: [{ attributes: { POSITION: index, NORMAL: index + 1 }, material: category === 'building' ? 0 : 1 }] });
    parts.push({ id: part.id, category, faceIndices: part.faces, min, max, small: Math.max(...max.map((v, i) => v - min[i])) < 1 });
  }
}
const p = new Float32Array(positions), n = new Float32Array(normals);
const binary = Buffer.concat([Buffer.from(p.buffer), Buffer.from(n.buffer)]);
const gltf = { asset: { version: '2.0', generator: 'Hesperides equivalence extraction v1' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, accessors,
  materials: [0.65, 0.5].map((v) => ({ doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [v, v, v, 1], metallicFactor: 0, roughnessFactor: 0.9 } })),
  buffers: [{ byteLength: binary.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: p.byteLength }, { buffer: 0, byteOffset: p.byteLength, byteLength: n.byteLength }] };
const json = Buffer.from(JSON.stringify(gltf));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + binary.length, 8); header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const chunk = Buffer.alloc(8); chunk.writeUInt32LE(binary.length, 0); chunk.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(path.join(output, 'campus.glb'), Buffer.concat([header, padded, chunk, binary]));
const sourceHash = JSON.parse(fs.readFileSync(path.join(root, 'src/components/map3d/pilot/pabellonG.json'), 'utf8')).source.sha256;
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({ version: 1, sourceHash, origin, parts }));
const codes = [];
for (const line of fs.readFileSync(listFile, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^(\d+|C\d+(?:-C\d+)?)\s+(.+)$/);
  if (!match) continue;
  for (const code of match[1].split('-')) codes.push({ code, label: match[2], category: code.startsWith('C') ? 'caseta' : 'building' });
}
const catalogDir = path.join(root, 'src/components/map3d/equivalence'); fs.mkdirSync(catalogDir, { recursive: true });
const mergedCodes = codes.filter((c) => !['C07', 'C05', 'C08', 'C33'].includes(c.code)).map((c) => c.code === 'C06' ? { ...c, code: 'C06-C07', label: "LABORATORIO DE COCINAS MEJORADAS / TALLERES (GRUPO DE APOYO AL SECTOR RURAL Y SECCIÓN INGENIERÍA ELECTRÓNICA)" } : c);
fs.writeFileSync(path.join(catalogDir, 'codes.json'), JSON.stringify(mergedCodes, null, 2));
console.info(`${parts.length} selectable pieces, ${positions.length / 9} triangles, ${codes.length} list codes; ${binary.length} bytes of geometry`);
