import * as THREE from 'three';
import { createCameraRig, type CameraPose } from '../viewer/cameraRig';

const box = new THREE.Box3(new THREE.Vector3(-500, 0, -500), new THREE.Vector3(500, 60, 500));
const START: CameraPose = { position: [0, 800, 600], target: [0, 0, 0] };
const DESTINATION: CameraPose = { position: [120, 300, 240], target: [100, 0, 50] };

function rigInFlight() {
  const rig = createCameraRig(document.createElement('div'), box, new THREE.Vector3(), false, START);
  const now = jest.spyOn(performance, 'now').mockReturnValue(1000);
  rig.flyToPose(DESTINATION);
  now.mockRestore();
  return rig;
}

describe('createCameraRig', () => {
  it('a mitad de un vuelo, pose() es el destino y no el punto intermedio', () => {
    // Al llegar el modelo del plano el visor se rearma con esta pose: si fuera la
    // intermedia, la cámara quedaría a medio camino del elemento elegido.
    const rig = rigInFlight();
    expect(rig.step(1000 + 400)).toBe(true);

    expect(rig.camera.position.toArray()).not.toEqual(DESTINATION.position);
    expect(rig.pose()).toEqual(DESTINATION);
  });

  it('terminado el vuelo, pose() es donde quedó la cámara', () => {
    const rig = rigInFlight();
    rig.step(1000 + 5000);

    expect(rig.step(1000 + 5100)).toBe(false);
    expect(rig.pose().position.map((v) => Math.round(v))).toEqual(DESTINATION.position);
    expect(rig.pose().target.map((v) => Math.round(v))).toEqual(DESTINATION.target);
  });

  it('si el usuario corta el vuelo, pose() es donde lo dejó', () => {
    const rig = rigInFlight();
    rig.step(1000 + 400);
    const here = rig.camera.position.toArray();
    rig.cancelFlight();

    expect(rig.pose().position).toEqual(here);
  });
});
