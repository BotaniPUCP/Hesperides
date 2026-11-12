import { normalizarNombreCientifico, validarNombreCientifico } from '../validacionesEspecie';

describe('normalización de nombres científicos', () => {
  it.each([
    ['  ÁRBOL   MUÑA ', 'Árbol muña'],
    ['MANGIFERA INDICA', 'Mangifera indica'],
    ['mANGO', 'Mango'],
    ['ñANDÚ', 'Ñandú'],
    ['FICUS SP.', 'Ficus sp.'],
    ['FICUS SPP.', 'Ficus spp.'],
    ['ACER RUBRUM SUBSP. DRUMMONDII', 'Acer rubrum subsp. drummondii'],
    ['ACER RUBRUM VAR. DRUMMONDII', 'Acer rubrum var. drummondii'],
    ['TESTFLORA-ALBA ESPECIE-UNO', 'Testflora-alba especie-uno'],
    ['CUPRESSOCYPARIS × LEYLANDII', 'Cupressocyparis × leylandii'],
    ['× CUPRESSOCYPARIS LEYLANDII', '× Cupressocyparis leylandii'],
  ])('normaliza %s como %s', (input, expected) => {
    expect(validarNombreCientifico(input)).toBeNull();
    expect(normalizarNombreCientifico(input)).toBe(expected);
  });

  it.each([
    'Ficus 2',
    'Ficus/indica',
    "O'Ficus indica",
    'Ficus, indica',
    'Ficus (indica)',
    'Ficus_indica',
    'Ficus–indica',
    'Ficus—indica',
    '-Ficus indica',
    'Ficus- indica',
    'Ficus--indica',
    'Ficus×indica',
    'Ficus × × indica',
    'Ficus indica ×',
    'Ficus sppp.',
    'Ficus sp..',
    'Ficus sp.x',
  ])('rechaza puntuación o token no aprobado: %s', (input) => {
    expect(validarNombreCientifico(input)).not.toBeNull();
  });

  it('normaliza Unicode a NFC sin eliminar diacríticos', () => {
    const composed = normalizarNombreCientifico('ÑANDÚ');
    const decomposed = normalizarNombreCientifico('ÑANDÚ');
    expect(decomposed).toBe(composed);
    expect(decomposed).toBe('Ñandú');
  });
});
