import {
  changed, recordingFile, toSample, type LivePerspective,
} from '../recording/perspectiveRecording';

const live = (over: Partial<LivePerspective> = {}): LivePerspective => ({
  position: [0, 10, 10], target: [0, 0, 0], fovDeg: 38, flying: false, adminMode: false,
  cameraLatLon: [-12.0691234567, -77.0791234567], targetLatLon: [-12.069, -77.079], ...over,
});

describe('grabación de la perspectiva (temporal)', () => {
  it('una muestra dice hacia dónde y cuán inclinada mira la cámara', () => {
    const s = toSample(live(), 125.4);
    expect(s.tMs).toBe(125);
    // De sur a norte: la cámara está en z = +10 y mira a z = 0, que es hacia el norte.
    expect(s.headingDeg).toBeCloseTo(0);
    expect(s.pitchDeg).toBeCloseTo(-45);
    expect(s.distanceM).toBeCloseTo(14.142, 3);
    expect(s.camera).toEqual({ lat: -12.0691235, lon: -77.0791235, heightM: 10 });
  });

  it('mirando al este el rumbo es 90 y al oeste 270', () => {
    expect(toSample(live({ position: [0, 0, 0], target: [5, 0, 0] }), 0).headingDeg).toBeCloseTo(90);
    expect(toSample(live({ position: [0, 0, 0], target: [-5, 0, 0] }), 0).headingDeg).toBeCloseTo(270);
  });

  it('solo cuenta como cambio un movimiento visible o un cambio de modo', () => {
    const a = toSample(live(), 0);
    expect(changed(undefined, a)).toBe(true);
    expect(changed(a, toSample(live(), 16))).toBe(false);
    expect(changed(a, toSample(live({ position: [0, 10, 10.01] }), 16))).toBe(true);
    expect(changed(a, toSample(live({ target: [0.01, 0, 0] }), 16))).toBe(true);
    expect(changed(a, toSample(live({ adminMode: true }), 16))).toBe(true);
    expect(changed(a, toSample(live({ flying: true }), 16))).toBe(true);
  });

  it('el archivo lleva fecha en el nombre, la duración y las muestras', () => {
    const samples = [toSample(live(), 0), toSample(live({ position: [1, 10, 10] }), 2500)];
    const file = recordingFile(samples, new Date(2026, 10, 16, 9, 5, 7), new Date(2026, 10, 16, 9, 5, 10));
    expect(file.name).toBe('perspectiva-2026-11-16-090507.json');
    const body = JSON.parse(file.content);
    expect(body.durationMs).toBe(3000);
    expect(body.sampleCount).toBe(2);
    expect(body.samples[1].position).toEqual([1, 10, 10]);
  });

  it('una grabación sin muestras igual da un archivo válido', () => {
    const file = recordingFile([], new Date(2026, 0, 2, 3, 4, 5), new Date(2026, 0, 2, 3, 4, 5));
    expect(JSON.parse(file.content).samples).toEqual([]);
  });
});
