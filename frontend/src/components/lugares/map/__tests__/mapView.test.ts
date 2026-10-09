import { LocalPlane } from '@/components/map3d/projection';
import { WORLD_LIFT } from '@/components/map3d/viewer/polyLayer';
import { mapViewToPose, poseToMapView } from '../mapView';

const plane = new LocalPlane(-12.07, -77.08);

describe('vista guardada', () => {
  it('ida y vuelta devuelve la misma pose', () => {
    const pose = { position: [120, 300, -80] as [number, number, number], target: [10, WORLD_LIFT, 5] as [number, number, number] };

    const back = mapViewToPose(plane, poseToMapView(plane, pose));

    back.position.forEach((v, i) => expect(v).toBeCloseTo(pose.position[i], 6));
    back.target.forEach((v, i) => expect(v).toBeCloseTo(pose.target[i], 6));
  });

  it('la altura se guarda sobre el suelo de la maqueta, no sobre el cero de la escena', () => {
    const view = poseToMapView(plane, { position: [0, WORLD_LIFT + 150, 0], target: [0, WORLD_LIFT, 0] });

    expect(view.camera.heightM).toBeCloseTo(150, 6);
    expect(view.target.heightM).toBeCloseTo(0, 6);
  });

  it('el norte es -z en la escena: un punto al norte del origen tiene mayor latitud', () => {
    const view = poseToMapView(plane, { position: [0, WORLD_LIFT, -100], target: [0, WORLD_LIFT, 0] });

    expect(view.camera.lat).toBeGreaterThan(view.target.lat);
  });
});
