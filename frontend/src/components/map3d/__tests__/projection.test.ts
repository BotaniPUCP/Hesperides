import { LocalPlane } from '../projection';

/**
 * La misma conversión que el backend (LocalPlane.java, SPEC-102 D-06). Si
 * difirieran, el punto que el visor manda a /map/describe no sería el que el
 * usuario pulsó.
 */
describe('LocalPlane', () => {
  const LAT0 = -12.069676;
  const LON0 = -77.080157;
  const plane = new LocalPlane(LAT0, LON0);

  it('el origen cae en (0, 0)', () => {
    expect(plane.toPlane(LAT0, LON0)).toEqual({ x: 0, y: 0 });
  });

  it('un minuto de latitud mide lo que dice el elipsoide WGS 84 a 12° S', () => {
    // ~1843.7 m; con el factor de 111 320 m/° del prototipo serían 1855.3.
    expect(plane.toPlane(LAT0 + 1 / 60, LON0).y).toBeCloseTo(1843.7, 0);
  });

  it('el norte es y positivo y el este es x positivo', () => {
    const p = plane.toPlane(LAT0 + 0.001, LON0 + 0.001);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeGreaterThan(0);
  });

  it('ida y vuelta sin pérdida apreciable', () => {
    const p = plane.toPlane(-12.0735, -77.0778);
    const [lat, lon] = plane.toLatLon(p);
    expect(lat).toBeCloseTo(-12.0735, 9);
    expect(lon).toBeCloseTo(-77.0778, 9);
  });
});
