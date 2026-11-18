import { pageOf } from '../pageOf';

const items = [1, 2, 3, 4, 5];

describe('pageOf', () => {
  it('corta la página pedida', () => {
    expect(pageOf(items, 1, 2)).toEqual({ rows: [3, 4], page: 1 });
  });

  it('una página fuera de rango muestra la última', () => {
    expect(pageOf(items, 9, 2)).toEqual({ rows: [5], page: 2 });
  });

  it('una página negativa muestra la primera', () => {
    expect(pageOf(items, -1, 2)).toEqual({ rows: [1, 2], page: 0 });
  });

  it('una lista vacía da la página cero sin filas', () => {
    expect(pageOf([], 3, 2)).toEqual({ rows: [], page: 0 });
  });
});
