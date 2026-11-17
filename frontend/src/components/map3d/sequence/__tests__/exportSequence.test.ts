import { exportSequence, EXPORT_FPS, EXPORT_FRAMES, type ExportViewer, type FrameSink } from '../exportSequence';
import { cameraPoseAt, SEQUENCE_DURATION_S } from '../sequencePath';
import { SWAP_AT_S } from '../sequenceTimeline';

jest.mock('../frameCompositor', () => ({ composeFrame: jest.fn() }));

function fakeViewer() {
  const calls: string[] = [];
  const viewer: ExportViewer = {
    beginExport: jest.fn((w: number, h: number) => { calls.push(`begin ${w}x${h}`); }),
    endExport: jest.fn(() => { calls.push('end'); }),
    setSequenceLook: jest.fn((look) => { calls.push(`look:${look}`); }),
    setPoseNow: jest.fn(),
    freezeFrame: jest.fn(() => { calls.push('capture'); return document.createElement('canvas'); }),
  };
  return { viewer, calls };
}

function fakeSink() {
  const added: [number, number][] = [];
  const sink: FrameSink = {
    add: jest.fn(async (t: number, d: number) => { added.push([t, d]); }),
    finish: jest.fn(async () => new Blob(['mp4'], { type: 'video/mp4' })),
    cancel: jest.fn(async () => undefined),
  };
  return { sink, added };
}

const output = () => {
  const canvas = document.createElement('canvas');
  jest.spyOn(canvas, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  return canvas;
};

describe('exportación de la secuencia', () => {
  it('cubre los 12 s a 60 fps, cuadro a cuadro, con su marca de tiempo exacta', async () => {
    const { viewer } = fakeViewer();
    const { sink, added } = fakeSink();
    const blob = await exportSequence({ viewer, canvas: output(), breathe: async () => undefined, sink });
    expect(EXPORT_FRAMES).toBe(SEQUENCE_DURATION_S * EXPORT_FPS + 1);
    expect(added).toHaveLength(EXPORT_FRAMES);
    expect(added[0]).toEqual([0, 1 / 60]);
    expect(added[EXPORT_FRAMES - 1][0]).toBeCloseTo(SEQUENCE_DURATION_S, 9);
    expect(viewer.setPoseNow).toHaveBeenLastCalledWith(cameraPoseAt(SEQUENCE_DURATION_S));
    expect(blob.type).toBe('video/mp4');
  });

  it('fija 1920×1080, cambia de versión una sola vez y deja el visor como estaba', async () => {
    const { viewer, calls } = fakeViewer();
    await exportSequence({ viewer, canvas: output(), breathe: async () => undefined, sink: fakeSink().sink });
    expect(calls[0]).toBe('begin 1920x1080');
    expect(calls[1]).toBe('look:low');
    const swap = calls.indexOf('look:good');
    // Antes de cambiar se congela el último cuadro de poca calidad.
    expect(calls[swap - 1]).toBe('capture');
    expect(calls.filter((c) => c === 'look:good')).toHaveLength(1);
    expect(calls.filter((c) => c === 'capture')).toHaveLength(EXPORT_FRAMES + 1);
    expect(calls[calls.length - 1]).toBe('end');
    const frameOfSwap = Math.ceil(SWAP_AT_S * EXPORT_FPS);
    expect(calls.slice(0, swap).filter((c) => c === 'capture')).toHaveLength(frameOfSwap + 1);
  });

  it('avisa el avance de 0 a 1', async () => {
    const progress: number[] = [];
    await exportSequence({ viewer: fakeViewer().viewer, canvas: output(), breathe: async () => undefined, sink: fakeSink().sink, onProgress: (p) => progress.push(p) });
    expect(progress).toHaveLength(EXPORT_FRAMES);
    expect(progress[progress.length - 1]).toBe(1);
  });

  it('cancelada: descarta el video, devuelve el visor y falla con un error claro', async () => {
    const { viewer } = fakeViewer();
    const { sink } = fakeSink();
    const abort = new AbortController();
    const run = exportSequence({ viewer, canvas: output(), breathe: async () => undefined, sink, signal: abort.signal, onProgress: (p) => { if (p > 0.1) abort.abort(); } });
    await expect(run).rejects.toThrow('Exportación cancelada');
    expect(sink.cancel).toHaveBeenCalled();
    expect(sink.finish).not.toHaveBeenCalled();
    expect(viewer.endExport).toHaveBeenCalled();
  });

  it('si el codificador falla, el visor vuelve igual a la normalidad', async () => {
    const { viewer } = fakeViewer();
    const { sink } = fakeSink();
    (sink.add as jest.Mock).mockRejectedValueOnce(new Error('sin H.264'));
    await expect(exportSequence({ viewer, canvas: output(), breathe: async () => undefined, sink })).rejects.toThrow('sin H.264');
    expect(viewer.endExport).toHaveBeenCalled();
    expect(sink.cancel).toHaveBeenCalled();
  });
});
