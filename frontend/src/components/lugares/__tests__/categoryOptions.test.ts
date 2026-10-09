import type { CatalogItem } from '@shared/types';
import { categoryOptions } from '../categoryOptions';

const item = (code: string, label: string, sortOrder: number): CatalogItem => ({ code, label, sortOrder, isActive: true, parentCode: null });

describe('categoryOptions', () => {
  it('ordena alfabéticamente sin importar el orden del catálogo, las tildes ni las mayúsculas', () => {
    const options = categoryOptions([
      item('PISO', 'Piso', 1),
      item('AREA_VERDE', 'Área verde', 2),
      item('EDIFICIO', 'Edificio', 3),
      item('E_E_G_G', 'E.E.G.G', 4),
      item('AUDITORIO', 'Auditorio', 5),
      item('BIBLIOTECA', 'biblioteca', 6),
    ]);

    expect(options.map((o) => o.label)).toEqual(['Área verde', 'Auditorio', 'biblioteca', 'E.E.G.G', 'Edificio', 'Piso']);
  });

  it('no cambia el catálogo recibido', () => {
    const items = [item('PISO', 'Piso', 1), item('AREA_VERDE', 'Área verde', 2)];
    categoryOptions(items);
    expect(items[0].code).toBe('PISO');
  });
});
