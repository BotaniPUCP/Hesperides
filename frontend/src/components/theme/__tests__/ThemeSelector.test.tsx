import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { saveThemePreference } from '@/lib/theme-store';
import { ThemeSelector, ThemeSync } from '..';

function renderConSync() {
  return render(
    <>
      <ThemeSync />
      <ThemeSelector />
    </>,
  );
}

describe('ThemeSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    saveThemePreference('light');
    document.documentElement.className = '';
  });

  it('marca claro como opción inicial', () => {
    renderConSync();

    expect(screen.getByRole('radio', { name: /claro/i })).toBeChecked();
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('al elegir oscuro lo aplica a la página y lo recuerda', async () => {
    renderConSync();

    await userEvent.click(screen.getByRole('radio', { name: /oscuro/i }));

    expect(screen.getByRole('radio', { name: /oscuro/i })).toBeChecked();
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('al volver a claro quita el modo oscuro', async () => {
    saveThemePreference('dark');
    renderConSync();

    await userEvent.click(screen.getByRole('radio', { name: /claro/i }));

    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('en "Sistema" sigue la preferencia del sistema operativo', async () => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
    renderConSync();

    await userEvent.click(screen.getByRole('radio', { name: /sistema/i }));

    expect(document.documentElement).toHaveClass('dark');
  });
});
