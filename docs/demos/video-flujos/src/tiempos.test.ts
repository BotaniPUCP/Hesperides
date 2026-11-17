import { expect, test } from 'vitest';
import type { Frase, Guion } from './guion';
import {
  comprobarAudios,
  construirLinea,
  fraseActiva,
  framesClave,
  FRAMES_PAUSA,
  FRAMES_TRANSICION,
  opacidadDeEscena,
  problemasDeVoz,
  type Manifiesto,
} from './tiempos';

const frase = (id: string, extra: Partial<Frase> = {}): Frase => ({
  id,
  texto: `Texto ${id}`,
  hespo: { x: 0, pose: 'quieto' },
  ...extra,
});

const guion: Guion = {
  voz: 'es-PE-CamilaNeural',
  escenas: [
    { id: 'inicio', frases: [frase('i1'), frase('i2')] },
    { id: 'especies', frases: [frase('e1'), frase('e2')] },
  ],
};

const entrada = (id: string, duracion: number, texto = `Texto ${id}`) => ({ archivo: `${id}.mp3`, duracion, texto });

const manifiesto: Manifiesto = {
  voz: 'es-PE-CamilaNeural',
  frases: {
    i1: entrada('i1', 1),
    i2: entrada('i2', 2),
    e1: entrada('e1', 1),
    e2: entrada('e2', 2),
  },
};

test('las frases no se solapan y respetan la pausa', () => {
  const [a, b] = construirLinea(guion, manifiesto).escenas[0].frases;

  expect(a).toMatchObject({ desde: 0, frames: 30 });
  expect(b).toMatchObject({ desde: 30 + FRAMES_PAUSA, frames: 60 });
});

test('las escenas dejan la transición', () => {
  const [primera, segunda] = construirLinea(guion, manifiesto).escenas;

  expect(primera.frames).toBe(30 + FRAMES_PAUSA + 60);
  expect(segunda.desde).toBe(primera.frames + FRAMES_TRANSICION);
  expect(segunda.frases[0].desde).toBe(segunda.desde);
});

test('redondea los fotogramas hacia arriba', () => {
  const corta = { ...manifiesto, frases: { ...manifiesto.frases, i1: entrada('i1', 1.01) } };

  expect(construirLinea(guion, corta).escenas[0].frases[0].frames).toBe(31);
});

test('el total cubre la última frase', () => {
  const linea = construirLinea(guion, manifiesto);
  const ultima = linea.escenas[1].frases[1];

  expect(linea.framesTotales).toBe(ultima.desde + ultima.frames);
});

test('durante una pausa no hay frase activa', () => {
  const linea = construirLinea(guion, manifiesto);

  expect(fraseActiva(linea, 0)?.frase.id).toBe('i1');
  expect(fraseActiva(linea, 29)?.frase.id).toBe('i1');
  expect(fraseActiva(linea, 30)).toBeNull();
  expect(fraseActiva(linea, 30 + FRAMES_PAUSA)?.frase.id).toBe('i2');
});

test('falla si una frase cambió sin regenerar la voz', () => {
  const cambiado: Guion = {
    ...guion,
    escenas: [{ id: 'inicio', frases: [frase('i1', { texto: 'Otro texto' }), frase('i2')] }, guion.escenas[1]],
  };

  expect(() => construirLinea(cambiado, manifiesto)).toThrow(/Voz desactualizada: i1/);
});

test('compara el texto hablado, no el subtítulo', () => {
  const hablado: Guion = {
    ...guion,
    escenas: [{ id: 'inicio', frases: [frase('i1', { texto: 'Hesperides', textoVoz: 'Texto i1' }), frase('i2')] }, guion.escenas[1]],
  };

  expect(problemasDeVoz(hablado, manifiesto)).toEqual([]);
});

test('falla si falta una frase en el manifiesto', () => {
  const { e2: _e2, ...resto } = manifiesto.frases;

  expect(() => construirLinea(guion, { ...manifiesto, frases: resto })).toThrow(/e2/);
});

test('falla si cambió la voz', () => {
  expect(() => construirLinea({ ...guion, voz: 'es-PE-AlexNeural' }, manifiesto)).toThrow(/es-PE-AlexNeural/);
});

test('falla con una duración de cero', () => {
  const vacia = { ...manifiesto, frases: { ...manifiesto.frases, i2: entrada('i2', 0) } };

  expect(() => construirLinea(guion, vacia)).toThrow(/i2/);
});

test('comprobarAudios nombra el archivo que falta', async () => {
  const linea = construirLinea(guion, manifiesto);

  await expect(comprobarAudios(linea, async (archivo) => archivo !== 'e1.mp3')).rejects.toThrow(/e1\.mp3/);
  await expect(comprobarAudios(linea, async () => true)).resolves.toBeUndefined();
});

test('framesClave da inicio, mitad y final por frase', () => {
  const linea = construirLinea(guion, manifiesto);
  const claves = framesClave(linea);

  expect(claves).toHaveLength(12);
  expect(claves.slice(0, 3)).toEqual([
    { id: 'i1', frame: 0, momento: 'inicio' },
    { id: 'i1', frame: 15, momento: 'mitad' },
    { id: 'i1', frame: 29, momento: 'final' },
  ]);
  claves.forEach(({ id, frame }) => expect(fraseActiva(linea, frame)?.frase.id).toBe(id));
});

test('una escena se desvanece en la transición, salvo la última, que queda en pantalla', () => {
  const linea = construirLinea(guion, manifiesto);
  const [primera, ultima] = linea.escenas;
  const finPrimera = primera.desde + primera.frames;
  expect(opacidadDeEscena(linea, primera, finPrimera - 1)).toBe(1);
  expect(opacidadDeEscena(linea, primera, finPrimera + FRAMES_TRANSICION)).toBe(0);
  expect(opacidadDeEscena(linea, ultima, ultima.desde + ultima.frames + FRAMES_TRANSICION + 30)).toBe(1);
});
