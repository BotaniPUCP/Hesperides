import { describe, expect, it } from 'vitest';
import { guionHistoria } from '../guion';
import { construirLinea, type Manifiesto } from '../tiempos';
import { ALTO_CUADRO, ANCHO_CUADRO, camaraEn, LIMITES, planosDeHistoria, zoomParaCubrir, type Plano, type Toma } from './camara';

const PLANO: Plano = {
  desde: 0,
  hasta: 300,
  base: { x: 960, y: 470, zoom: 1.04 },
  empuje: 0.06,
  banco: 1,
  semilla: 'prueba',
  objetivos: [
    // Un objetivo brusco y lejano: la cámara no debe llegar de golpe.
    { centro: 100, ancho: 4, x: 1700, y: 200, zoom: 1.5 },
    { centro: 220, ancho: 30, x: 300, y: 700, zoom: 1.2 },
  ],
};

function velocidades(planos: Plano[], desde: number, hasta: number) {
  let giro = 0;
  let zoom = 0;
  let paneo = 0;
  for (let f = desde + 1; f < hasta; f++) {
    const a = camaraEn(planos, f - 1);
    const b = camaraEn(planos, f);
    giro = Math.max(giro, Math.abs(b.giro - a.giro));
    zoom = Math.max(zoom, Math.abs(Math.log(b.zoom / a.zoom)));
    paneo = Math.max(paneo, Math.hypot(b.x - a.x, b.y - a.y));
  }
  return { giro, zoom, paneo };
}

/** Las cuatro esquinas del cuadro, llevadas a coordenadas de la escena, deben caer dentro de ella. */
function cubre(t: Toma): boolean {
  const r = (t.giro * Math.PI) / 180;
  return [
    [0, 0],
    [ANCHO_CUADRO, 0],
    [0, ALTO_CUADRO],
    [ANCHO_CUADRO, ALTO_CUADRO],
  ].every(([sx, sy]) => {
    const dx = (sx - ANCHO_CUADRO / 2) / t.zoom;
    const dy = (sy - ALTO_CUADRO / 2) / t.zoom;
    const x = t.x + dx * Math.cos(-r) - dy * Math.sin(-r);
    const y = t.y + dx * Math.sin(-r) + dy * Math.cos(-r);
    return x >= -0.5 && x <= ANCHO_CUADRO + 0.5 && y >= -0.5 && y <= ALTO_CUADRO + 0.5;
  });
}

describe('camaraEn', () => {
  it('fuera de todo plano deja la escena tal cual', () => {
    expect(camaraEn([PLANO], 400)).toEqual({ x: ANCHO_CUADRO / 2, y: ALTO_CUADRO / 2, zoom: 1, giro: 0 });
  });

  it('respeta la velocidad máxima de giro, zoom y paneo aunque el objetivo salte', () => {
    const v = velocidades([PLANO], 0, 300);
    expect(v.giro).toBeLessThanOrEqual(LIMITES.giro + 1e-9);
    expect(v.zoom).toBeLessThanOrEqual(LIMITES.zoom + 1e-9);
    expect(v.paneo).toBeLessThanOrEqual(LIMITES.paneo * 1.5);
  });

  it('se acerca al objetivo con peso en campana y vuelve a la base', () => {
    const lejos = camaraEn([PLANO], 30);
    const cerca = camaraEn([PLANO], 235);
    expect(cerca.zoom).toBeGreaterThan(lejos.zoom);
    expect(cerca.x).toBeLessThan(lejos.x);
  });

  it('el banco queda dentro de ±1–2°', () => {
    for (let f = 0; f < 300; f += 7) expect(Math.abs(camaraEn([PLANO], f).giro)).toBeLessThanOrEqual(2);
  });

  it('nunca deja ver los bordes de la escena', () => {
    for (let f = 0; f < 300; f++) expect(cubre(camaraEn([PLANO], f))).toBe(true);
  });

  it('es determinista', () => {
    expect(camaraEn([PLANO], 123)).toEqual(camaraEn([PLANO], 123));
  });
});

describe('zoomParaCubrir', () => {
  it('pide más zoom cuanto más gira el cuadro', () => {
    expect(zoomParaCubrir(0)).toBeCloseTo(1);
    expect(zoomParaCubrir(1)).toBeGreaterThan(1.02);
    expect(zoomParaCubrir(-1)).toBeCloseTo(zoomParaCubrir(1));
  });
});

describe('planos de la historia', () => {
  const manifiesto: Manifiesto = {
    voz: guionHistoria.voz,
    frases: Object.fromEntries(guionHistoria.escenas.flatMap((e) => e.frases).map((f) => [f.id, { archivo: `${f.id}.mp3`, duracion: 4, texto: f.textoVoz ?? f.texto }])),
  };
  const linea = construirLinea(guionHistoria, manifiesto);
  const planos = planosDeHistoria(linea);

  it('cubren todo el video sin solaparse', () => {
    for (let i = 1; i < planos.length; i++) expect(planos[i].desde).toBe(planos[i - 1].hasta);
    expect(planos[0].desde).toBe(0);
  });

  it('en todo el video respetan los límites y cubren el cuadro', () => {
    // Los cortes de plano pueden saltar; dentro de un plano no.
    for (const p of planos) {
      const w = velocidades([p], p.desde, p.hasta);
      expect(w.giro).toBeLessThanOrEqual(LIMITES.giro + 1e-9);
      expect(w.zoom).toBeLessThanOrEqual(LIMITES.zoom + 1e-9);
      expect(w.paneo).toBeLessThanOrEqual(LIMITES.paneo * 1.5);
    }
    for (let f = 0; f < linea.framesTotales; f += 3) expect(cubre(camaraEn(planos, f))).toBe(true);
  });
});
