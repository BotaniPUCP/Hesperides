import {
  DEFAULT_THEME_PREFERENCE,
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
} from '../theme';

describe('parseThemePreference', () => {
  it.each(['light', 'dark', 'system'] as const)('acepta la preferencia guardada %s', (valor) => {
    expect(parseThemePreference(valor)).toBe(valor);
  });

  it('usa la preferencia por defecto cuando no hay nada guardado', () => {
    expect(parseThemePreference(null)).toBe(DEFAULT_THEME_PREFERENCE);
  });

  it.each(['', 'DARK', 'oscuro', '{"x":1}'])('descarta un valor ajeno (%s) en vez de aplicarlo', (valor) => {
    expect(parseThemePreference(valor)).toBe(DEFAULT_THEME_PREFERENCE);
  });
});

describe('resolveTheme', () => {
  it('respeta una elección explícita aunque el sistema diga lo contrario', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('sigue al sistema cuando la preferencia es "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('THEME_BOOT_SCRIPT', () => {
  function ejecutarCon(guardado: string | null, sistemaOscuro: boolean) {
    const raiz = document.documentElement;
    raiz.className = '';
    raiz.style.colorScheme = '';
    if (guardado === null) localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, guardado);
    window.matchMedia = jest.fn().mockReturnValue({ matches: sistemaOscuro });

    new Function(THEME_BOOT_SCRIPT)();
    return raiz;
  }

  it('pinta oscuro antes de hidratar si la preferencia guardada es oscura', () => {
    const raiz = ejecutarCon('dark', false);

    expect(raiz).toHaveClass('dark');
    expect(raiz.style.colorScheme).toBe('dark');
  });

  it('sigue al sistema cuando la preferencia guardada es "system"', () => {
    expect(ejecutarCon('system', true)).toHaveClass('dark');
    expect(ejecutarCon('system', false)).not.toHaveClass('dark');
  });

  it('queda en claro sin preferencia guardada o con un valor ajeno', () => {
    expect(ejecutarCon(null, true)).not.toHaveClass('dark');
    expect(ejecutarCon('oscuro', true)).not.toHaveClass('dark');
  });
});
