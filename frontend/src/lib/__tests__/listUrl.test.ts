import { isoDateFrom, listHref, listQuery, oneOf, pageFrom, readListValues } from '../listUrl';

describe('isoDateFrom', () => {
  it('acepta una fecha en formato ISO', () => {
    expect(isoDateFrom('2026-10-31')).toBe('2026-10-31');
  });

  it.each(['ayer', '2026-10', '31/10/2026', '2026-10-31T00:00', ''])('descarta «%s»', (value) => {
    expect(isoDateFrom(value)).toBe('');
  });
});

const DEFAULTS = { search: '', type: 'ALL', page: '0' };

describe('readListValues', () => {
  it('toma de la URL los valores presentes y completa el resto', () => {
    expect(readListValues(new URLSearchParams('type=PALM'), DEFAULTS)).toEqual({ search: '', type: 'PALM', page: '0' });
  });

  it('ignora parámetros que la lista no conoce', () => {
    expect(readListValues(new URLSearchParams('admin=1'), DEFAULTS)).toEqual(DEFAULTS);
  });
});

describe('listQuery', () => {
  it('omite los valores por defecto para dejar la URL limpia', () => {
    expect(listQuery({ search: '', type: 'PALM', page: '0' }, DEFAULTS)).toBe('type=PALM');
    expect(listQuery(DEFAULTS, DEFAULTS)).toBe('');
  });

  it('codifica el texto de búsqueda', () => {
    expect(listQuery({ ...DEFAULTS, search: 'palmera real&x' }, DEFAULTS)).toBe('search=palmera+real%26x');
  });
});

describe('listHref', () => {
  it('sin filtros devuelve la ruta sola', () => {
    expect(listHref('/lista', DEFAULTS, DEFAULTS)).toBe('/lista');
  });

  it('con filtros agrega la consulta', () => {
    expect(listHref('/lista', { ...DEFAULTS, page: '2' }, DEFAULTS)).toBe('/lista?page=2');
  });
});

describe('pageFrom', () => {
  it('lee una página válida', () => {
    expect(pageFrom('3')).toBe(3);
  });

  it.each(['-1', 'abc', '1.5', '', '99999999999999999999'])('vuelve a la primera con «%s»', (value) => {
    expect(pageFrom(value)).toBe(0);
  });
});

describe('oneOf', () => {
  it('acepta un valor permitido', () => {
    expect(oneOf('b', ['a', 'b'] as const, 'a')).toBe('b');
  });

  it('cambia por el defecto un valor no permitido', () => {
    expect(oneOf('photo_url; drop', ['a', 'b'] as const, 'a')).toBe('a');
  });
});
