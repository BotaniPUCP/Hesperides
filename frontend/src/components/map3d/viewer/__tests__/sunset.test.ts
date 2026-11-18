import * as THREE from 'three';
import { DAY, paletteFor } from '../palette';
import { setGroundMatte, SUNSET_VIEW, sunsetPose } from '../sunset';

describe('modo Atardecer', () => {
  const center = new THREE.Vector3(100, 0, -50);
  const sunWest = new THREE.Vector3(-1, 0.07, 0).normalize();

  it('la toma mira hacia el sol, ladeada y casi a ras del horizonte', () => {
    const { position, target } = sunsetPose(center, sunWest);
    const look = new THREE.Vector3(...target).sub(new THREE.Vector3(...position));
    const pitch = Math.atan2(-look.y, Math.hypot(look.x, look.z)) * (180 / Math.PI);
    expect(pitch).toBeCloseTo(SUNSET_VIEW.pitchDeg, 5);
    expect(look.length()).toBeCloseTo(SUNSET_VIEW.distanceM, 5);
    const flat = new THREE.Vector3(look.x, 0, look.z).normalize();
    const yaw = Math.acos(flat.dot(new THREE.Vector3(-1, 0, 0))) * (180 / Math.PI);
    expect(yaw).toBeCloseTo(Math.abs(SUNSET_VIEW.yawDeg), 5);
    // Mira un poco más allá del centro, hacia el sol.
    expect(new THREE.Vector3(...target).distanceTo(center)).toBeCloseTo(SUNSET_VIEW.aheadM, 5);
  });

  it('el suelo queda mate y vuelve a su acabado al salir', () => {
    const grass = new THREE.MeshPhysicalMaterial({ roughness: 0.55, clearcoat: 0.2, sheen: 0.25 });
    const asphalt = new THREE.MeshStandardMaterial({ roughness: 0.4 });
    setGroundMatte([grass, asphalt], true);
    expect([grass.roughness, grass.clearcoat, grass.sheen, asphalt.roughness]).toEqual([0.95, 0, 0, 0.95]);
    setGroundMatte([grass, asphalt], true);
    setGroundMatte([grass, asphalt], false);
    expect([grass.roughness, grass.clearcoat, grass.sheen, asphalt.roughness]).toEqual([0.55, 0.2, 0.25, 0.4]);
  });

  it('la paleta del atardecer trae el suelo natural; de noche manda la noche', () => {
    expect(paletteFor(false, false).natural).toBeUndefined();
    expect(paletteFor(false, false, true).natural?.grass).toMatch(/^#[0-9a-f]{6}$/i);
    expect(paletteFor(false, false, true).building).toBe(DAY.building);
    expect(paletteFor(true, false, true).natural).toBeUndefined();
  });
});
