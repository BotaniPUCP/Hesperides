import { forgetListScroll, readListScroll, saveListScroll } from '../listScroll';

beforeEach(() => window.sessionStorage.clear());

it('sin nada guardado no hay posición', () => {
  expect(readListScroll('/lista')).toBeNull();
});

it('recuerda la posición y los filtros de cada lista por separado', () => {
  saveListScroll('/lista', 'type=PALM', 900);
  saveListScroll('/otra', '', 40);
  expect(readListScroll('/lista')).toEqual({ query: 'type=PALM', top: 900 });
  expect(readListScroll('/otra')).toEqual({ query: '', top: 40 });
});

it('olvidar borra solo esa lista', () => {
  saveListScroll('/lista', '', 900);
  saveListScroll('/otra', '', 40);
  forgetListScroll('/lista');
  expect(readListScroll('/lista')).toBeNull();
  expect(readListScroll('/otra')).not.toBeNull();
});

it.each(['no es json', '{"query":"a"}', '{"query":1,"top":2}', '{"query":"a","top":-5}', 'null'])(
  'descarta un valor corrupto: %s',
  (stored) => {
    window.sessionStorage.setItem('hesperides.listScroll:/lista', stored);
    expect(readListScroll('/lista')).toBeNull();
  },
);

it('sin almacenamiento disponible sigue funcionando, sin recordar', () => {
  const blockedRead = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('bloqueado');
  });
  const blockedWrite = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('bloqueado');
  });
  expect(() => saveListScroll('/lista', '', 900)).not.toThrow();
  expect(readListScroll('/lista')).toBeNull();
  blockedRead.mockRestore();
  blockedWrite.mockRestore();
});
