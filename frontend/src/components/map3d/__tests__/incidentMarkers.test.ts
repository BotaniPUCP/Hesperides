import * as THREE from 'three';
import { createIncidentMarkers, markerColor } from '../viewer/incidentMarkers';

it('paints each incident like its deadline: green on time, amber due soon, red overdue (SPEC-201 §3.10)', () => {
  expect(markerColor('ON_TIME')).toBe(0x16a34a);
  expect(markerColor('DUE_SOON')).toBe(0xf59e0b);
  expect(markerColor('OVERDUE')).toBe(0xdc2626);
  expect(markerColor(null)).toBe(0x6b7280);
});

it('replaces the markers and reports the position of each one', () => {
  const scene = new THREE.Scene();
  const markers = createIncidentMarkers(scene);
  markers.set([{ id: 7, x: 10, z: -4, deadlineStatus: 'OVERDUE' }, { id: 8, x: 0, z: 0, deadlineStatus: 'ON_TIME' }]);
  expect(markers.position(7)?.x).toBe(10);
  markers.set([{ id: 8, x: 0, z: 0, deadlineStatus: 'ON_TIME' }]);
  expect(markers.position(7)).toBeNull();
  markers.dispose();
  expect(scene.children).toHaveLength(0);
});
