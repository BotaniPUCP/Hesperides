import { expect, test } from 'vitest';
import { POSES, type EscenaId, type Frase, type Pose } from '../guion';
import type { TramoEscena } from '../tiempos';
import { aperturaDesdeEspectro, formaDeBoca } from './boca';
import { mezclar, POSES_HESPO } from './poses';
import { SUELO_PAGINA, SUELO_Y } from '../tema';
import { ENTRADA_X, estadoHespo, llegadaDe, parpadeo } from './recorrido';

const frase = (id: string, x: number, pose: Pose = 'quieto', espera?: number, extra: Partial<Frase['hespo']> = {}): Frase => ({
  id,
  texto: id,
  hespo: { x, pose, ...(espera === undefined ? {} : { espera }), ...extra },
});

const escenaDe = (id: EscenaId, ...tramos: [Frase, number][]): TramoEscena => {
  let desde = 100;
  const frases = tramos.map(([f, frames]) => {
    const tramo = { frase: f, escenaId: id, desde, frames, archivo: `${f.id}.mp3` };
    desde += frames + 8;
    return tramo;
  });
  return { id, desde: 100, frames: desde - 108, frases };
};
const escena = (...tramos: [Frase, number][]) => escenaDe('inicio', ...tramos);

test('existe una pose para cada nombre del guion', () => {
  POSES.forEach((p) => expect(POSES_HESPO[p]).toBeDefined());
});

test('mezclar respeta los extremos', () => {
  const { quieto, salta } = POSES_HESPO;

  expect(mezclar(quieto, salta, 0)).toEqual(quieto);
  expect(mezclar(quieto, salta, 1)).toEqual(salta);
  expect(mezclar(quieto, salta, 0.5).saltoY).toBe(salta.saltoY / 2);
});

test('empieza fuera de escena y entra caminando', () => {
  const e = escena([frase('a', 400), 120]);

  expect(estadoHespo(e, 100).x).toBe(ENTRADA_X);
  expect(estadoHespo(e, 110).caminando).toBe(true);
  expect(estadoHespo(e, 110).x).toBeGreaterThan(ENTRADA_X);
});

test('camina hacia el destino y luego se detiene', () => {
  const e = escena([frase('a', 400), 120]);
  const final = estadoHespo(e, 219);

  expect(final.x).toBe(400);
  expect(final.caminando).toBe(false);
});

test('mira hacia donde camina', () => {
  const e = escena([frase('a', 900), 120], [frase('b', 300), 120]);

  expect(estadoHespo(e, 130).mira).toBe(1);
  expect(estadoHespo(e, 240).mira).toBe(-1);
});

test('llega antes de que termine la frase', () => {
  const e = escena([frase('a', 2100), 40]);

  expect(estadoHespo(e, 100 + 32).x).toBe(2100);
  expect(estadoHespo(e, 100 + 32).caminando).toBe(false);
});

test('conserva la posición entre frases', () => {
  const e = escena([frase('a', 500), 120], [frase('b', 500, 'senala'), 60]);

  expect(estadoHespo(e, 225).x).toBe(500);
  expect(estadoHespo(e, 225).caminando).toBe(false);
});

test('respeta la espera antes de caminar', () => {
  const e = escena([frase('a', 400), 120], [frase('b', 2120, 'saluda', 0.6), 100]);
  const inicioB = 100 + 120 + 8;

  expect(estadoHespo(e, inicioB + 30).caminando).toBe(false);
  expect(estadoHespo(e, inicioB + 30).x).toBe(400);
  expect(estadoHespo(e, inicioB + 65).caminando).toBe(true);
});

test('mientras espera ya hace la pose de la frase', () => {
  const e = escena([frase('a', 400), 120], [frase('b', 2120, 'presenta', 0.6), 100]);
  const inicioB = 100 + 120 + 8;

  expect(estadoHespo(e, inicioB + 30).articulaciones).toEqual(POSES_HESPO.presenta);
});

test('adopta la pose de la frase al llegar', () => {
  const e = escena([frase('a', ENTRADA_X, 'salta'), 60]);

  expect(estadoHespo(e, 140).articulaciones.saltoY).toBe(POSES_HESPO.salta.saltoY);
});

test('camina por el suelo si la frase no indica altura', () => {
  const e = escena([frase('a', 400), 120]);

  expect(estadoHespo(e, 120).y).toBe(SUELO_Y);
  expect(estadoHespo(e, 219).y).toBe(SUELO_Y);
});

test('sobre la página camina por su borde inferior', () => {
  const e = escenaDe('especies', [frase('a', 400), 120]);

  expect(estadoHespo(e, 100).y).toBe(SUELO_PAGINA);
  expect(estadoHespo(e, 219)).toMatchObject({ x: 400, y: SUELO_PAGINA, caminando: false });
});

test('sube a un elemento saltando', () => {
  const e = escena([frase('a', 400), 120], [frase('b', 700, 'quieto', undefined, { y: 300 }), 120]);
  const inicioB = 100 + 120 + 8;
  const enVuelo = estadoHespo(e, inicioB + 10);

  expect(enVuelo.caminando).toBe(true);
  expect(enVuelo.articulaciones.brazoI).toBe(POSES_HESPO.salta.brazoI);
  expect(estadoHespo(e, inicioB + 119)).toMatchObject({ x: 700, y: 300, caminando: false });
});

test('el salto hace un arco por encima de la línea recta', () => {
  const e = escena([frase('a', 400), 120], [frase('b', 400, 'quieto', undefined, { y: SUELO_Y - 100 }), 120]);
  const inicioB = 100 + 120 + 8;
  const alturas = Array.from({ length: 96 }, (_, i) => estadoHespo(e, inicioB + i).y);

  expect(Math.min(...alturas)).toBeLessThan(SUELO_Y - 100);
});

test('vuelve al suelo si la siguiente frase no indica altura', () => {
  const e = escena([frase('a', 400, 'quieto', undefined, { y: 300 }), 120], [frase('b', 400), 120]);

  expect(estadoHespo(e, 219).y).toBe(300);
  expect(estadoHespo(e, 347).y).toBe(SUELO_Y);
});

test('luego agrega un movimiento dentro de la frase', () => {
  const e = escena([frase('a', 400, 'senala', undefined, { luego: [{ en: 0.5, x: 900, y: 500, pose: 'pulgar' }] }), 200]);

  expect(estadoHespo(e, 190)).toMatchObject({ x: 400, y: SUELO_Y, pose: 'senala', caminando: false });
  expect(estadoHespo(e, 299)).toMatchObject({ x: 900, y: 500, pose: 'pulgar', caminando: false });
});

test('un salto largo es más rápido que caminar la misma distancia', () => {
  const caminando = escena([frase('a', 1000), 300]);
  const saltando = escena([frase('a', 1000, 'quieto', undefined, { y: 879 }), 300]);

  expect(llegadaDe(saltando, 'a')).toBeLessThan(llegadaDe(caminando, 'a'));
});

test('llegadaDe dice cuándo aterriza cada movimiento', () => {
  const e = escena([frase('a', 400, 'senala', undefined, { luego: [{ en: 0.5, x: 900, y: 500, pose: 'pulgar' }] }), 200]);
  const llegada = llegadaDe(e, 'a', 1);

  expect(estadoHespo(e, llegada - 1).caminando).toBe(true);
  expect(estadoHespo(e, llegada)).toMatchObject({ x: 900, y: 500, caminando: false });
});

test('llegadaDe falla con un movimiento inexistente', () => {
  const e = escena([frase('a', 400), 120]);

  expect(() => llegadaDe(e, 'a', 1)).toThrow(/no tiene el movimiento 1/);
});

test('el parpadeo es determinista', () => {
  const valores = Array.from({ length: 200 }, (_, i) => parpadeo(i));

  expect(Array.from({ length: 200 }, (_, i) => parpadeo(i))).toEqual(valores);
  expect(valores).toContain(0);
  expect(valores).toContain(1);
});

test('la caminata es determinista', () => {
  const e = escena([frase('a', 900), 120]);

  expect(estadoHespo(e, 137)).toEqual(estadoHespo(e, 137));
  expect(estadoHespo(e, 137).articulaciones).not.toEqual(estadoHespo(e, 141).articulaciones);
});

test('en silencio la boca está cerrada', () => {
  expect(formaDeBoca(0)).toBe('cerrada');
});

test('los umbrales de boca', () => {
  expect(formaDeBoca(0.14)).toBe('cerrada');
  expect(formaDeBoca(0.15)).toBe('media');
  expect(formaDeBoca(0.54)).toBe('media');
  expect(formaDeBoca(0.55)).toBe('abierta');
});

test('aperturaDesdeEspectro se mantiene entre 0 y 1', () => {
  expect(aperturaDesdeEspectro([])).toBe(0);
  expect(aperturaDesdeEspectro(new Array(16).fill(0))).toBe(0);
  expect(aperturaDesdeEspectro(new Array(16).fill(1))).toBe(1);
  expect(aperturaDesdeEspectro([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1])).toBeCloseTo(0.7);
});
