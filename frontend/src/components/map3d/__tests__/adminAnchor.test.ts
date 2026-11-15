import * as THREE from 'three';
import { ADMIN_ANCHOR_MAX_M, chooseAnchor } from '../viewer/adminAnchor';

const at = (x: number) => new THREE.Vector3(x, 0, 0);

describe('anclaje del modo administrador: lo que se ve al centro de la pantalla', () => {
  it('se ancla en lo primero visible que cruza el centro', () => {
    expect(chooseAnchor([{ distance: 40, point: at(40) }, { distance: 90, point: at(90) }], at(300))).toEqual(at(40));
  });

  it('sin nada al frente, se ancla en el suelo que se ve', () => {
    expect(chooseAnchor([], at(120))).toEqual(at(120));
  });

  it('lo que está más lejos que el límite no cuenta: mirando al horizonte el anclaje no cambia', () => {
    expect(chooseAnchor([{ distance: ADMIN_ANCHOR_MAX_M + 1, point: at(9000) }], null)).toBeNull();
  });
});
