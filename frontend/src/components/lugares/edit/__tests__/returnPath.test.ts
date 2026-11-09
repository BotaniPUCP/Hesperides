import { returnPathFrom } from '../returnPath';

describe('returnPathFrom', () => {
  it('desde la migración vuelve a su cola', () => {
    expect(returnPathFrom('migracion')).toBe('/lugares/migracion');
  });

  it('sin origen, o con uno desconocido, no hay vuelta especial', () => {
    expect(returnPathFrom(undefined)).toBeUndefined();
    expect(returnPathFrom('https://otro.sitio')).toBeUndefined();
    expect(returnPathFrom('//otro.sitio')).toBeUndefined();
  });
});
