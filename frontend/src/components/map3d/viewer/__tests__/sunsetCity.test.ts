import * as THREE from 'three';
import { buildCity, type CityData } from '../sunsetCity';
import { broadleafCrown, coniferCrown, palmCrown, trunkGeometry } from '../sunsetTrees';

const boundsOf = (geo: THREE.BufferGeometry) => {
  geo.computeBoundingBox();
  return geo.boundingBox as THREE.Box3;
};

describe('árboles del Atardecer', () => {
  it('la copa en racimo cabe en la escala de la de siempre, con color por vértice, y es más oscura abajo', () => {
    const geo = broadleafCrown(7, 1);
    const box = boundsOf(geo);
    expect(box.max.y).toBeLessThan(1.3);
    expect(box.min.y).toBeGreaterThan(-1.3);
    const color = geo.attributes.color, pos = geo.attributes.position;
    let low = 0, nLow = 0, high = 0, nHigh = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < -0.3) { low += color.getX(i); nLow++; }
      if (pos.getY(i) > 0.3) { high += color.getX(i); nHigh++; }
    }
    expect(low / nLow).toBeLessThan(high / nHigh);
    // Misma semilla, misma copa.
    expect(Array.from(broadleafCrown(7, 1).attributes.position.array)).toEqual(Array.from(pos.array));
  });

  it('la conífera va de 0 a 1 y el tronco curvo sube de 0 a 1', () => {
    const cone = boundsOf(coniferCrown(3));
    expect(cone.min.y).toBeCloseTo(0, 5);
    expect(cone.max.y).toBeLessThan(1.05);
    const trunk = boundsOf(trunkGeometry(4));
    expect([trunk.min.y, trunk.max.y]).toEqual([0, 1]);
    expect(trunk.max.x).toBeGreaterThan(4);
  });

  it('las frondas de la palmera salen hacia todos lados y caen por debajo de su arranque', () => {
    const box = boundsOf(palmCrown(5));
    expect(box.min.x).toBeLessThan(-0.6);
    expect(box.max.x).toBeGreaterThan(0.6);
    expect(box.min.y).toBeLessThan(0);
  });
});

describe('ciudad real del Atardecer', () => {
  // Una avenida norte-sur en x = 0, un edificio al este y el campus al oeste.
  const data: CityData = {
    origen: [-12.07, -77.08],
    radioM: 200,
    edificios: [[9, 40, -20, 70, -20, 70, 20, 40, 20]],
    vias: [[16, 0, -190, 0, 190]],
    verdes: [[-60, 120, -20, 120, -20, 160, -60, 160]],
  };
  const campus = [[-190, -100, -80, -100, -80, 100, -190, 100]];
  const city = buildCity(data, (x, y) => [x, -y], campus, 0);
  const lots = city.children.find((c) => (c as THREE.InstancedMesh).isInstancedMesh && (c as THREE.Mesh).geometry.type === 'BoxGeometry') as THREE.InstancedMesh;

  it('pone lotes, pero ninguno sobre la avenida, el edificio real o el campus', () => {
    expect(lots.count).toBeGreaterThan(20);
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let k = 0; k < lots.count; k++) {
      lots.getMatrixAt(k, m);
      p.setFromMatrixPosition(m);
      const [x, y] = [p.x, -p.z];
      expect(Math.abs(x)).toBeGreaterThan(8);
      expect(x > 40 && x < 70 && y > -20 && y < 20).toBe(false);
      expect(x > -190 && x < -80 && y > -100 && y < 100).toBe(false);
    }
  });

  it('dibuja la avenida, el área verde y árboles en las veredas', () => {
    expect(city.userData.counts).toMatchObject({ osm: 1, roads: 1 });
    expect(city.userData.counts.trees).toBeGreaterThan(10);
    expect(city.children.filter((c) => (c as THREE.Mesh).isMesh).length).toBeGreaterThanOrEqual(5);
  });
});
