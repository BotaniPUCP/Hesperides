import { describe, expect, it } from 'vitest';
import { guionHistoria } from '../guion';
import { construirLinea, type Manifiesto } from '../tiempos';
import { ALTO_CUADRO, ANCHO_CUADRO, camaraEn, LIMITES, planosDeHistoria, type Plano, type Toma } from './camara';

const PLANO: Plano = { desde: 0, hasta: 300, empuje: { inicio: 100, duracion: 60, x: 1150, y: 480, zoom: 1.12 } };

/** Las cuatro esquinas del cuadro, llevadas a coordenadas de la escena, deben caer dentro de ella. */
function cubre(t: Toma): boolean {
  const mx = ANCHO_CUADRO / 2 / t.zoom;
  const my = ALTO_CUADRO / 2 / t.zoom;
  return t.x - mx >= -0.5 && t.x + mx <= ANCHO_CUADRO + 0.5 && t.y - my >= -0.5 && t.y + my <= ALTO_CUADRO + 0.5;
}

const manifiesto: Manifiesto = {
  voz: guionHistoria.voz,
  frases: Object.fromEntries(guionHistoria.escenas.flatMap((e) => e.frases).map((f) => [f.id, { archivo: `${f.id}.mp3`, duracion: 4, texto: f.textoVoz ?? f.texto }])),
};
const linea = construirLinea(guionHistoria, manifiesto);
const planos = planosDeHistoria(linea, 90);
const fin = linea.framesTotales + 90;

const dentroDeEmpuje = (f: number) => planos.some((p) => p.empuje && f > p.empuje.inicio && f <= p.empuje.inicio + p.empuje.duracion);
const esCorte = (f: number) => planos.some((p) => p.desde === f);

describe('camaraEn', () => {
  it('quieta por defecto: centrada, sin zoom ni giro, antes del empuje', () => {
    for (const f of [0, 50, 100]) expect(camaraEn([PLANO], f)).toEqual({ x: ANCHO_CUADRO / 2, y: ALTO_CUADRO / 2, zoom: 1, giro: 0 });
  });

  it('el empuje se hace una vez y queda sostenido', () => {
    const final = camaraEn([PLANO], 160);
    expect(final.zoom).toBeCloseTo(1.12);
    expect(camaraEn([PLANO], 299)).toEqual(final);
  });

  it('fuera de todo plano deja la escena tal cual', () => {
    expect(camaraEn([PLANO], 400)).toEqual({ x: ANCHO_CUADRO / 2, y: ALTO_CUADRO / 2, zoom: 1, giro: 0 });
  });
});

describe('planos de la historia', () => {
  it('cubren todo el video sin solaparse, con a lo sumo un empuje cada uno', () => {
    expect(planos[0].desde).toBe(0);
    for (let i = 1; i < planos.length; i++) expect(planos[i].desde).toBe(planos[i - 1].hasta);
    expect(planos[planos.length - 1].hasta).toBe(fin);
  });

  it('sin movimiento lateral, giro ni zoom fuera de los empujes (cero por cuadro)', () => {
    for (let f = 1; f < fin; f++) {
      const b = camaraEn(planos, f);
      expect(b.giro).toBe(0);
      if (dentroDeEmpuje(f) || esCorte(f)) continue;
      const a = camaraEn(planos, f - 1);
      expect(b.x - a.x).toBe(0);
      expect(b.y - a.y).toBe(0);
      expect(b.zoom - a.zoom).toBe(0);
    }
  });

  it('dentro de un empuje respeta la velocidad máxima de zoom y de paneo', () => {
    for (let f = 1; f < fin; f++) {
      if (!dentroDeEmpuje(f)) continue;
      const a = camaraEn(planos, f - 1);
      const b = camaraEn(planos, f);
      expect(Math.abs(Math.log(b.zoom / a.zoom))).toBeLessThanOrEqual(LIMITES.zoom);
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThanOrEqual(LIMITES.paneo);
    }
  });

  it('nunca deja ver los bordes ni corta los pies (borde inferior visible ≥ 892 px)', () => {
    for (let f = 0; f < fin; f++) {
      const t = camaraEn(planos, f);
      expect(cubre(t)).toBe(true);
      expect(t.y + ALTO_CUADRO / 2 / t.zoom).toBeGreaterThanOrEqual(892);
    }
  });

  it('en el empuje del cierre los que miran la laptop (desde x ≈ 150) siguen en cuadro', () => {
    const p = planos[8];
    const t = camaraEn(planos, p.hasta - 1);
    expect(t.x - ANCHO_CUADRO / 2 / t.zoom).toBeLessThanOrEqual(100);
  });

  it('en el empuje al mapa el jefe (desde x ≈ 150) sigue entero en cuadro', () => {
    const h9 = planos.find((p) => p.empuje && p.empuje.x < 1200 && p.empuje.zoom >= 1.08 && p.empuje.inicio > linea.escenas[3].desde + 200 && p.desde > linea.escenas[3].desde);
    expect(h9).toBeDefined();
    const t = camaraEn(planos, h9!.hasta - 1);
    expect(t.x - ANCHO_CUADRO / 2 / t.zoom).toBeLessThanOrEqual(150);
  });
});
