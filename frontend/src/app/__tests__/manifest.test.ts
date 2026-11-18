import fs from 'fs';
import path from 'path';
import manifest from '../manifest';

const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'public');

describe('manifest', () => {
  const result = manifest();

  it('abre el sistema a pantalla completa desde la raiz', () => {
    expect(result.name).toBe('Hesperides');
    expect(result.short_name).toBe('Hesperides');
    expect(result.start_url).toBe('/');
    expect(result.display).toBe('standalone');
  });

  it('usa el verde de marca en la barra y en la pantalla de arranque', () => {
    expect(result.theme_color).toBe('#02591F');
    expect(result.background_color).toBe('#02591F');
  });

  it('declara los tamanos que Chrome exige para instalar, normales y recortables', () => {
    const icons = result.icons ?? [];
    for (const size of ['192x192', '512x512']) {
      expect(icons).toContainEqual(expect.objectContaining({ sizes: size, purpose: 'any' }));
      expect(icons).toContainEqual(expect.objectContaining({ sizes: size, purpose: 'maskable' }));
    }
  });

  it('cada icono declarado existe en public', () => {
    for (const icon of result.icons ?? []) {
      expect(fs.existsSync(path.join(PUBLIC_DIR, icon.src))).toBe(true);
    }
  });
});
