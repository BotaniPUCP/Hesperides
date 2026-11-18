import { frameAt, PEAK_BLUR_PX, PEAK_BRIGHTNESS, SWAP_AT_S, TRANSITION_END_S, TRANSITION_START_S } from '../sequenceTimeline';

describe('cronología de la secuencia', () => {
  it('la transición dura 0,6 s desde el segundo 4,3', () => {
    expect(TRANSITION_START_S).toBe(4.3);
    expect(TRANSITION_END_S - TRANSITION_START_S).toBeCloseTo(0.6, 9);
  });

  it('antes de la transición: poca calidad, nítida y sin capa congelada', () => {
    for (const t of [-1, 0, 2.5, TRANSITION_START_S]) {
      expect(frameAt(t)).toEqual({ look: 'low', blurPx: 0, brightness: 1, frozenOpacity: 0, scale: 1 });
    }
  });

  it('después de la transición: buena calidad y nítida', () => {
    for (const t of [TRANSITION_END_S, 8, 12, 30]) {
      expect(frameAt(t)).toEqual({ look: 'good', blurPx: 0, brightness: 1, frozenOpacity: 0, scale: 1 });
    }
  });

  it('el cambio cae en el pico del desenfoque, con la capa congelada encima', () => {
    expect(frameAt(SWAP_AT_S - 1e-6).look).toBe('low');
    const swap = frameAt(SWAP_AT_S);
    expect(swap).toMatchObject({ look: 'good', blurPx: PEAK_BLUR_PX, brightness: PEAK_BRIGHTNESS, frozenOpacity: 1 });
    expect(swap.scale).toBeGreaterThan(1);
  });

  it('la capa congelada se desvanece en 0,1 s mientras el desenfoque sigue arriba', () => {
    expect(frameAt(SWAP_AT_S + 0.05).frozenOpacity).toBeCloseTo(0.5, 5);
    expect(frameAt(SWAP_AT_S + 0.05).blurPx).toBe(PEAK_BLUR_PX);
    expect(frameAt(SWAP_AT_S + 0.1).frozenOpacity).toBe(0);
  });

  it('el desenfoque sube y baja de forma continua, sin saltos entre cuadros', () => {
    const step = 1 / 60;
    for (let t = TRANSITION_START_S - 0.1; t < TRANSITION_END_S + 0.1; t += step / 4) {
      expect(Math.abs(frameAt(t + step / 4).blurPx - frameAt(t).blurPx)).toBeLessThan(PEAK_BLUR_PX * 0.15);
      expect(frameAt(t).blurPx).toBeGreaterThanOrEqual(0);
      expect(frameAt(t).blurPx).toBeLessThanOrEqual(PEAK_BLUR_PX);
    }
  });

  it('la subida es suave: arranca y llega despacio', () => {
    const rise = SWAP_AT_S - TRANSITION_START_S;
    expect(frameAt(TRANSITION_START_S + rise * 0.1).blurPx).toBeLessThan(PEAK_BLUR_PX * 0.1);
    expect(frameAt(TRANSITION_START_S + rise * 0.5).blurPx).toBeCloseTo(PEAK_BLUR_PX / 2, 5);
  });
});
