import { panelPillow, paneGloss, type Rect } from '../glassGloss';

const SHARP: [number, number] = [0.002, 0.002];
const FAR: [number, number] = [5, 5];
/** Un paño de 1,2 × 2,4 m dentro de su módulo. */
const PANE: Rect = [0.04, 1.16, 1.1, 3.5];

describe('paneGloss: reflejo del paño (SPEC-112 D-23)', () => {
  it('arriba más claro que abajo, fuera de las franjas', () => {
    const top = paneGloss(0.1, 3.45, PANE, SHARP).shade, bottom = paneGloss(1.1, 1.15, PANE, SHARP).shade;
    expect(top).toBeGreaterThan(bottom * 1.15);
  });

  it('una franja de brillo en diagonal «/»: más clara que lo que la rodea a la misma altura', () => {
    const shades: number[] = [];
    for (let x = 0.05; x < 1.15; x += 0.01) shades.push(paneGloss(x, 2.3, PANE, SHARP).shade);
    const max = Math.max(...shades), min = Math.min(...shades);
    expect(max / min).toBeGreaterThan(1.3);
    const peakAt = (y: number) => {
      let best = 0, bx = 0;
      for (let x = 0.05; x < 1.15; x += 0.005) { const s = paneGloss(x, y, PANE, SHARP).shade; if (s > best) { best = s; bx = x; } }
      return bx;
    };
    expect(peakAt(3.0)).toBeGreaterThan(peakAt(1.6));
  });

  it('el promedio del paño es 1 (±2 %): conserva el color de la ficha', () => {
    let sum = 0, n = 0;
    for (let x = PANE[0] + 0.003; x < PANE[1]; x += 0.007) for (let y = PANE[2] + 0.003; y < PANE[3]; y += 0.007) { sum += paneGloss(x, y, PANE, SHARP).shade; n++; }
    expect(Math.abs(sum / n - 1)).toBeLessThan(0.02);
  });

  it('el paño está hundido respecto del perfil, con bisel', () => {
    expect(paneGloss(0.6, 2.3, PANE, SHARP).height).toBeCloseTo(-0.06, 4);
    expect(paneGloss(PANE[0], 2.3, PANE, SHARP).height).toBeCloseTo(0, 4);
    const mid = paneGloss(PANE[0] + 0.06, 2.3, PANE, SHARP).height;
    expect(mid).toBeLessThan(0);
    expect(mid).toBeGreaterThan(-0.06);
  });

  it('de lejos se funde: sin brillo ni relieve', () => {
    expect(paneGloss(0.3, 2.3, PANE, FAR)).toEqual({ shade: 1, height: 0 });
  });
});

describe('panelPillow: antepecho abombado (SPEC-112 D-23)', () => {
  const PANEL: Rect = [0.04, 1.16, 0.04, 1.06];
  it('el centro sube 5 cm y el borde queda al ras del perfil', () => {
    expect(panelPillow(0.6, 0.55, PANEL, SHARP)).toBeCloseTo(0.05, 4);
    expect(panelPillow(PANEL[0], 0.55, PANEL, SHARP)).toBeCloseTo(0, 4);
  });
  it('de lejos, nada', () => {
    expect(panelPillow(0.6, 0.55, PANEL, FAR)).toBe(0);
  });
});
