import { rememberListQuery, rememberedHref } from '../listMemory';

beforeEach(() => window.sessionStorage.clear());

it('sin nada recordado devuelve la ruta sola', () => {
  expect(rememberedHref('/lista')).toBe('/lista');
});

it('devuelve la ruta con los últimos filtros de esa lista', () => {
  rememberListQuery('/lista', 'type=PALM');
  rememberListQuery('/otra', 'page=2');
  expect(rememberedHref('/lista')).toBe('/lista?type=PALM');
});

it('una consulta vacía borra lo recordado', () => {
  rememberListQuery('/lista', 'type=PALM');
  rememberListQuery('/lista', '');
  expect(rememberedHref('/lista')).toBe('/lista');
});

it('sin almacenamiento disponible sigue funcionando, sin recordar', () => {
  const blocked = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('bloqueado');
  });
  expect(rememberedHref('/lista')).toBe('/lista');
  blocked.mockRestore();
});
