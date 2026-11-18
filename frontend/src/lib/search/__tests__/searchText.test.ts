import { filterByText, matches, normalize } from '../searchText';

describe('normalize', () => {
  it('quita tildes, mayúsculas y espacios de los bordes', () => {
    expect(normalize('  Área VERDE  ')).toBe('area verde');
  });

  it('convierte la eñe como unaccent de PostgreSQL', () => {
    expect(normalize('Muñoz')).toBe('munoz');
  });

  it('deja vacío un texto vacío', () => {
    expect(normalize('')).toBe('');
  });
});

describe('matches', () => {
  it('encuentra el texto en cualquier parte de la clave', () => {
    expect(matches('facultad de derecho fdd', 'DERECHO')).toBe(true);
  });

  it('ignora tildes en lo que se escribe', () => {
    expect(matches('area de jardines', 'Área')).toBe(true);
  });

  it('busca % y _ como texto literal, no como comodines', () => {
    expect(matches('descuento 10%', '10%')).toBe(true);
    expect(matches('abc', 'a_c')).toBe(false);
    expect(matches('abc', '%')).toBe(false);
  });

  it('un texto vacío coincide con todo', () => {
    expect(matches('lo que sea', '   ')).toBe(true);
  });

  it('no coincide si falta una parte', () => {
    expect(matches('ceiba speciosa', 'ceibo')).toBe(false);
  });
});

describe('filterByText', () => {
  const items = [{ searchKey: 'ceiba speciosa palo borracho' }, { searchKey: 'jacaranda mimosifolia' }];

  it('devuelve solo las filas que coinciden', () => {
    expect(filterByText(items, 'borracho')).toEqual([items[0]]);
  });

  it('con texto vacío devuelve la misma lista', () => {
    expect(filterByText(items, '')).toBe(items);
  });
});
