import { similarity, trigrams, wordSimilarity } from '../trigram';

/** Valores sacados de pg_trgm en la BD de desarrollo (18 nov 2026), redondeados a 6 decimales. */
const close = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 5);

describe('trigrams', () => {
  it('rellena cada palabra como pg_trgm y separa por lo que no es letra ni número', () => {
    expect([...trigrams('a-b c')].sort()).toEqual(['  a', '  b', '  c', ' a ', ' b ', ' c ']);
  });
});

describe('similarity', () => {
  it.each([
    ['facultad de derecho', 'facultad de derecho', 1],
    ['facultad de derecho', 'facultad derecho', 0.944444],
    ['derecho', 'facultad de derecho', 0.444444],
    ['juan perez', 'juan peres', 0.692308],
    ['abc', 'xyz', 0],
    ['a-b c', 'a b c', 1],
  ])('similarity(%p, %p) = %p', (a, b, expected) => close(similarity(a, b), expected));

  it('dos textos vacíos no se parecen', () => {
    expect(similarity('', '')).toBe(0);
  });
});

describe('wordSimilarity', () => {
  it.each([
    ['derecho', 'facultad de derecho', 1],
    ['word', 'two words', 0.8],
    ['juan p', 'maria juana perez', 0.571429],
    ['ingenieria', 'seccion de ingenieria civil', 1],
    ['facu derecho', 'facultad de derecho', 0.631579],
  ])('wordSimilarity(%p, %p) = %p', (a, b, expected) => close(wordSimilarity(a, b), expected));

  it('un texto vacío no se parece a nada', () => {
    expect(wordSimilarity('', 'algo')).toBe(0);
  });
});
