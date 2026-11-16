import { act, renderHook } from '@testing-library/react';
import type { LivePerspective } from '../recording/perspectiveRecording';
import { usePerspectiveRecorder } from '../recording/usePerspectiveRecorder';

let pending: FrameRequestCallback | null = null;
const frame = (ms: number) => act(() => {
  const run = pending;
  pending = null;
  run?.(ms);
});

const at = (x: number): LivePerspective => ({
  position: [x, 10, 10], target: [x, 0, 0], fovDeg: 38, flying: false, adminMode: true,
  cameraLatLon: [-12, -77], targetLatLon: [-12, -77],
});

let saved: Blob | null;

/** jsdom no trae `Blob.text()`. */
const read = (blob: Blob) => new Promise<string>((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.readAsText(blob);
});
let clicked: string[];

beforeEach(() => {
  pending = null;
  saved = null;
  clicked = [];
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { pending = cb; return 1; });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = null; });
  jest.spyOn(performance, 'now').mockReturnValue(0);
  URL.createObjectURL = jest.fn((blob: Blob) => { saved = blob; return 'blob:x'; });
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push(this.download);
  });
});

afterEach(() => jest.restoreAllMocks());

describe('usePerspectiveRecorder (temporal)', () => {
  it('el primer toque graba cada cuadro que cambia y el segundo descarga el archivo', async () => {
    const live = jest.fn(() => at(0));
    const viewer = { current: { livePerspective: live } };
    const { result } = renderHook(() => usePerspectiveRecorder(viewer));

    act(() => result.current.toggle());
    expect(result.current.recording).toBe(true);
    frame(16);
    frame(32);
    live.mockReturnValue(at(2));
    frame(48);
    act(() => result.current.toggle());

    expect(result.current.recording).toBe(false);
    expect(clicked).toHaveLength(1);
    expect(clicked[0]).toMatch(/^perspectiva-\d{4}-\d{2}-\d{2}-\d{6}\.json$/);
    const body = JSON.parse(await read(saved!));
    expect(body.samples.map((s: { tMs: number }) => s.tMs)).toEqual([16, 48]);
    expect(body.samples[1].position).toEqual([2, 10, 10]);
  });

  it('al detener deja de pedir cuadros', () => {
    const viewer = { current: { livePerspective: () => at(0) } };
    const { result } = renderHook(() => usePerspectiveRecorder(viewer));
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(pending).toBeNull();
  });

  it('sin visor todavía, graba un archivo vacío sin fallar', async () => {
    const { result } = renderHook(() => usePerspectiveRecorder({ current: null }));
    act(() => result.current.toggle());
    frame(16);
    act(() => result.current.toggle());
    expect(JSON.parse(await read(saved!)).samples).toEqual([]);
  });
});
