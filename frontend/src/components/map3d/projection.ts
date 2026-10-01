/**
 * Plano tangente local: latitud y longitud WGS 84 a metros alrededor de un
 * origen. Es la misma fórmula que usa el backend (LocalPlane.java): el prototipo
 * mezclaba dos factores de latitud y desalineaba lugares y polígonos hasta 4 m
 * (SPEC-102 D-06). Esta es la única conversión del visor.
 */

const SEMI_MAJOR_AXIS_M = 6_378_137;
const ECCENTRICITY_SQ = 0.00669437999014;
const DEG = Math.PI / 180;

export interface PlanePoint {
  x: number;
  y: number;
}

export class LocalPlane {
  private readonly metresPerDegreeLat: number;
  private readonly metresPerDegreeLon: number;

  constructor(
    private readonly lat0: number,
    private readonly lon0: number,
  ) {
    const phi = lat0 * DEG;
    const w = 1 - ECCENTRICITY_SQ * Math.sin(phi) ** 2;
    const meridianRadius = (SEMI_MAJOR_AXIS_M * (1 - ECCENTRICITY_SQ)) / w ** 1.5;
    const normalRadius = SEMI_MAJOR_AXIS_M / Math.sqrt(w);
    this.metresPerDegreeLat = DEG * meridianRadius;
    this.metresPerDegreeLon = DEG * normalRadius * Math.cos(phi);
  }

  toPlane(lat: number, lon: number): PlanePoint {
    return {
      x: (lon - this.lon0) * this.metresPerDegreeLon,
      y: (lat - this.lat0) * this.metresPerDegreeLat,
    };
  }

  /** Inversa de toPlane: devuelve [lat, lon]. */
  toLatLon(p: PlanePoint): [number, number] {
    return [this.lat0 + p.y / this.metresPerDegreeLat, this.lon0 + p.x / this.metresPerDegreeLon];
  }
}
