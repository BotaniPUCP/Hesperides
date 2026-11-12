import * as THREE from 'three';
/** Minimum-area horizontal frame, used only for the explicitly requested kiosk. */
export function horizontalFrame(points: THREE.Vector3[]) {
  const unique = [...new Map(points.map((p) => [`${p.x.toFixed(5)},${p.z.toFixed(5)}`, p])).values()].sort((a, b) => a.x - b.x || a.z - b.z);
  const cross = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  const half = (list: THREE.Vector3[]) => { const hull: THREE.Vector3[] = []; for (const p of list) { while (hull.length > 1 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop(); hull.push(p); } return hull.slice(0, -1); };
  const hull = [...half(unique), ...half([...unique].reverse())];
  let best = { angle: 0, minU: 0, maxU: 0, minV: 0, maxV: 0, area: Infinity };
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length], angle = Math.atan2(b.z - a.z, b.x - a.x), c = Math.cos(angle), s = Math.sin(angle);
    const u = points.map((p) => c * p.x + s * p.z), v = points.map((p) => -s * p.x + c * p.z);
    const minU = Math.min(...u), maxU = Math.max(...u), minV = Math.min(...v), maxV = Math.max(...v), area = (maxU - minU) * (maxV - minV);
    if (area < best.area - 1e-6) best = { angle, minU, maxU, minV, maxV, area };
  }
  if (best.maxU - best.minU < best.maxV - best.minV) return { angle: best.angle + Math.PI / 2, minU: best.minV, maxU: best.maxV, minV: -best.maxU, maxV: -best.minU, area: best.area };
  return best;
}
export function adaptKiosk(geometry: THREE.BufferGeometry, targetPoints: THREE.Vector3[], height: number, base: number) {
  const position = geometry.attributes.position;
  const points = Array.from({ length: position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(position, i));
  const from = horizontalFrame(points), to = horizontalFrame(targetPoints);
  const minY = Math.min(...points.map((p) => p.y)), maxY = Math.max(...points.map((p) => p.y));
  if (from.area <= 0 || to.area <= 0 || !Number.isFinite(from.area) || !Number.isFinite(to.area) || maxY <= minY || height <= 0) throw new Error('Dimensiones inválidas para adaptar la caseta.');
  const c = Math.cos(from.angle), s = Math.sin(from.angle), tc = Math.cos(to.angle), ts = Math.sin(to.angle);
  points.forEach((p, i) => {
    const u = to.minU + (c * p.x + s * p.z - from.minU) / (from.maxU - from.minU) * (to.maxU - to.minU);
    const v = to.minV + (-s * p.x + c * p.z - from.minV) / (from.maxV - from.minV) * (to.maxV - to.minV);
    position.setXYZ(i, tc * u - ts * v, base + (p.y - minY) / (maxY - minY) * height, ts * u + tc * v);
  });
  position.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
