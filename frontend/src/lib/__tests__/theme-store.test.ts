import { THEME_STORAGE_KEY } from '../theme';
import { readThemePreference, saveThemePreference, subscribeToThemePreference } from '../theme-store';

describe('theme-store', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    saveThemePreference('light');
  });

  it('guarda la preferencia y la devuelve al leer', () => {
    saveThemePreference('dark');

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readThemePreference()).toBe('dark');
  });

  it('lee claro cuando lo guardado no es una preferencia válida', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'morado');

    expect(readThemePreference()).toBe('light');
  });

  it('avisa a los suscriptores al guardar y deja de avisar al desuscribirse', () => {
    const alCambiar = jest.fn();
    const desuscribir = subscribeToThemePreference(alCambiar);

    saveThemePreference('system');
    desuscribir();
    saveThemePreference('dark');

    expect(alCambiar).toHaveBeenCalledTimes(1);
  });

  it('se entera cuando otra pestaña cambia la preferencia', () => {
    const alCambiar = jest.fn();
    const desuscribir = subscribeToThemePreference(alCambiar);

    window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'otra-clave' }));
    desuscribir();

    expect(alCambiar).toHaveBeenCalledTimes(1);
  });

  it('mantiene la elección en memoria si el navegador bloquea el almacenamiento', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });

    saveThemePreference('dark');

    expect(readThemePreference()).toBe('dark');
  });
});
