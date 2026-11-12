import * as THREE from 'three';
import { adaptKiosk, horizontalFrame } from './unificationGeometry';
it('preserves target footprint dimensions, orientation, elevation and height when adapting a template', () => {
  const geometry = new THREE.BoxGeometry(4, 3, 7); geometry.rotateY(.4); geometry.translate(-150, 5, 260); geometry.computeBoundingSphere();
  const target = [[-7, -9], [7, -9], [7, 9], [-7, 9]].map(([x, z]) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), .1).add(new THREE.Vector3(60, 0, 110)));
  adaptKiosk(geometry, target, 8, 22);
  const points = Array.from({ length: geometry.attributes.position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, i));
  const output = horizontalFrame(points), expected = horizontalFrame(target);
  expect(output.maxU - output.minU).toBeCloseTo(18, 3); expect(output.maxV - output.minV).toBeCloseTo(14, 3);
  expect(Math.abs(Math.cos(output.angle - expected.angle))).toBeCloseTo(1, 4);
  expect(geometry.boundingBox!.min.y).toBeCloseTo(22); expect(geometry.boundingBox!.max.y).toBeCloseTo(30);
  expect(geometry.boundingSphere!.center.x).toBeCloseTo(60, 3); expect(geometry.boundingSphere!.center.z).toBeCloseTo(110, 3);
  geometry.dispose();
});
