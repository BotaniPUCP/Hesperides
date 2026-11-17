import type { SequenceHooks } from '../../viewer/sequenceHooks';
import { cameraPoseAt, SEQUENCE_DURATION_S } from '../sequencePath';
import { playSequence, type SequenceClock } from '../sequencePlayer';
import { SWAP_AT_S } from '../sequenceTimeline';

/** Un reloj manual: cada `advance` entrega un cuadro con esa hora. */
function manualClock() {
  let pending: ((now: number) => void) | null = null;
  const clock: SequenceClock = { request: (tick) => { pending = tick; return 1; }, cancel: () => { pending = null; } };
  return {
    clock,
    frame(now: number) { const tick = pending; pending = null; tick?.(now); },
    waiting: () => pending !== null,
  };
}

function fakeViewer() {
  const calls: string[] = [];
  const viewer: SequenceHooks = {
    setSequence: jest.fn(),
    setPoseNow: jest.fn(),
    setSequenceLook: jest.fn((look) => { calls.push(`look:${look}`); }),
    freezeFrame: jest.fn(() => { calls.push('freeze'); return document.createElement('canvas'); }),
    beginExport: jest.fn(), endExport: jest.fn(),
  };
  return { viewer, calls };
}

function surfaces() {
  const effects = document.createElement('div'), overlay = document.createElement('div');
  const logos = { pixel: document.createElement('img'), original: document.createElement('img') };
  effects.append(overlay, logos.pixel, logos.original);
  return { effects, overlay, logos };
}

/** Avanza a 60 cuadros por segundo hasta `seconds` de secuencia. */
function runTo(c: ReturnType<typeof manualClock>, seconds: number, start = 0) {
  let now = start;
  c.frame(now);
  while (c.waiting() && now < start + seconds * 1000) { now += 1000 / 60; c.frame(now); }
  return now;
}

describe('reproductor de la secuencia', () => {
  it('arranca en poca calidad, en la pose de inicio y nítido', () => {
    const { viewer } = fakeViewer();
    const s = surfaces();
    playSequence(viewer, s, jest.fn(), manualClock().clock);
    expect(viewer.setSequenceLook).toHaveBeenCalledWith('low');
    expect(viewer.setPoseNow).toHaveBeenLastCalledWith(cameraPoseAt(0));
    expect(s.effects.style.filter).toBe('');
  });

  it('congela el cuadro antes de cambiar a buena calidad, una sola vez', () => {
    const { viewer, calls } = fakeViewer();
    const c = manualClock();
    const s = surfaces();
    playSequence(viewer, s, jest.fn(), c.clock);
    runTo(c, SWAP_AT_S + 0.02);
    expect(calls).toEqual(['look:low', 'freeze', 'look:good']);
    expect(s.overlay.childElementCount).toBe(1);
    expect(s.effects.style.filter).toContain('blur(8.00px)');
  });

  it('termina en la pose final, sin efectos, y avisa una vez', () => {
    const { viewer } = fakeViewer();
    const c = manualClock();
    const s = surfaces();
    const done = jest.fn();
    playSequence(viewer, s, done, c.clock);
    runTo(c, SEQUENCE_DURATION_S + 1);
    expect(done).toHaveBeenCalledTimes(1);
    expect(c.waiting()).toBe(false);
    expect(viewer.setPoseNow).toHaveBeenLastCalledWith(cameraPoseAt(SEQUENCE_DURATION_S));
    expect(s.effects.style.filter).toBe('');
    expect(s.overlay.childElementCount).toBe(0);
  });

  it('un cuadro trabado no hace saltar el reloj más de 1/30 s', () => {
    const { viewer } = fakeViewer();
    const c = manualClock();
    playSequence(viewer, surfaces(), jest.fn(), c.clock);
    c.frame(0);
    c.frame(800);
    expect(viewer.setPoseNow).toHaveBeenLastCalledWith(cameraPoseAt(1 / 30));
  });

  it('muestra el logo que toca: nada al inicio, el pixelado cayendo y el original tras el cambio', () => {
    const c = manualClock();
    const s = surfaces();
    playSequence(fakeViewer().viewer, s, jest.fn(), c.clock);
    expect(s.logos.pixel.style.display).toBe('none');
    expect(s.logos.original.style.display).toBe('none');
    const now = runTo(c, 4.5);
    expect(s.logos.pixel.style.display).toBe('');
    expect(s.logos.original.style.display).toBe('none');
    expect(s.logos.pixel.style.transform).toMatch(/^translate\(-50%, -50%\) rotate\([\d.]+deg\)$/);
    runTo(c, 1, now);
    expect(s.logos.pixel.style.display).toBe('none');
    expect(s.logos.original.style.display).toBe('');
  });

  it('detenerla corta los cuadros pendientes', () => {
    const { viewer } = fakeViewer();
    const c = manualClock();
    const stop = playSequence(viewer, surfaces(), jest.fn(), c.clock);
    stop();
    expect(c.waiting()).toBe(false);
  });
});
