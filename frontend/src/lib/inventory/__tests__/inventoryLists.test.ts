import type { Species, SpecimenListItem } from '@shared/types';
import { sortSpecimens, speciesMatching, specimensMatching } from '../inventoryLists';

const specimen = (code: string, extra: Partial<SpecimenListItem> = {}): SpecimenListItem => ({
  code, sourceReference: null, sourceLocation: null, latitude: null, longitude: null, photoUrl: null, imageUrl: null,
  thumbnailUrl: null, quantity: 1, notes: null, speciesSlug: 'coffea-arabica', vegetationTypeCode: 'SHRUB',
  speciesCritical: false, measured: false, searchKey: code.toLowerCase(), ...extra,
});

const species = (slug: string, extra: Partial<Species> = {}): Species => ({
  slug, isActive: true, scientificName: slug, commonName: slug, otherNames: [], family: null,
  vegetationTypeCode: 'TREE', vegetationTypeName: 'Árbol', specimenCount: 0, imageUrl: null, photos: [],
  searchKey: slug, ...extra,
} as Species);

describe('specimensMatching', () => {
  const items = [
    specimen('EV-1', { speciesSlug: 'roystonea-regia', vegetationTypeCode: 'PALM', sourceLocation: 'Mecánica',
      speciesCritical: true, measured: true, searchKey: 'ev-1 p01 mecanica palmera real' }),
    specimen('EV-2', { sourceLocation: 'Biblioteca', searchKey: 'ev-2 c1 biblioteca cafeto coffea arabica' }),
    specimen('EV-3', { sourceLocation: 'Mecánica', speciesCritical: true, searchKey: 'ev-3 c2 mecanica cafeto' }),
  ];
  const codes = (f: Parameters<typeof specimensMatching>[1]) => specimensMatching(items, f).map((s) => s.code);

  it('sin filtros devuelve todos', () => {
    expect(codes({})).toEqual(['EV-1', 'EV-2', 'EV-3']);
  });

  it('filtra por especie, ubicación y tipo; «ALL» no filtra', () => {
    expect(codes({ slug: 'coffea-arabica' })).toEqual(['EV-2', 'EV-3']);
    expect(codes({ location: 'Mecánica' })).toEqual(['EV-1', 'EV-3']);
    expect(codes({ location: 'ALL', vegetationType: 'ALL' })).toEqual(['EV-1', 'EV-2', 'EV-3']);
    expect(codes({ vegetationType: 'PALM' })).toEqual(['EV-1']);
  });

  it('crítica y medida son independientes; sin valor no filtran', () => {
    expect(codes({ critical: true })).toEqual(['EV-1', 'EV-3']);
    expect(codes({ critical: true, measured: false })).toEqual(['EV-3']);
    expect(codes({ measured: true })).toEqual(['EV-1']);
  });

  it('busca sin tildes y combina con los demás filtros', () => {
    expect(codes({ search: 'CAFETO' })).toEqual(['EV-2', 'EV-3']);
    expect(codes({ search: 'cafeto', location: 'Mecánica' })).toEqual(['EV-3']);
    expect(codes({ search: 'cafeto', vegetationType: 'PALM' })).toEqual([]);
  });
});

describe('sortSpecimens', () => {
  const refs = (items: SpecimenListItem[]) => items.map((s) => s.sourceReference);

  it('ordena la referencia en orden natural: p2 antes que p10', () => {
    const items = [specimen('A', { sourceReference: 'p10' }), specimen('B', { sourceReference: 'p2' }),
      specimen('C', { sourceReference: 'c1' })];
    expect(refs(sortSpecimens(items, 'reference', 'asc'))).toEqual(['c1', 'p2', 'p10']);
    expect(refs(sortSpecimens(items, 'reference', 'desc'))).toEqual(['p10', 'p2', 'c1']);
  });

  it('las referencias vacías van al final al subir', () => {
    const items = [specimen('A'), specimen('B', { sourceReference: 'p1' })];
    expect(refs(sortSpecimens(items, 'reference', 'asc'))).toEqual(['p1', null]);
  });

  it('ordena por código y por ubicación, desempatando por código', () => {
    const items = [specimen('EV-2', { sourceLocation: 'B' }), specimen('EV-1', { sourceLocation: 'B' }),
      specimen('EV-3', { sourceLocation: 'A' })];
    expect(sortSpecimens(items, 'code', 'asc').map((s) => s.code)).toEqual(['EV-1', 'EV-2', 'EV-3']);
    expect(sortSpecimens(items, 'location', 'asc').map((s) => s.code)).toEqual(['EV-3', 'EV-1', 'EV-2']);
  });

  it('no cambia la lista original', () => {
    const items = [specimen('EV-2'), specimen('EV-1')];
    sortSpecimens(items, 'code', 'asc');
    expect(items.map((s) => s.code)).toEqual(['EV-2', 'EV-1']);
  });
});

describe('speciesMatching', () => {
  const items = [
    species('syagrus-romanzoffiana', { vegetationTypeCode: 'PALM', searchKey: 'syagrus romanzoffiana pindo palmera bruja' }),
    species('jacaranda-mimosifolia', { searchKey: 'jacaranda mimosifolia jacaranda' }),
    species('retirada', { isActive: false, searchKey: 'retirada' }),
  ];
  const slugs = (f: Parameters<typeof speciesMatching>[1]) => speciesMatching(items, f).map((s) => s.slug);

  it('el catálogo normal muestra solo las activas; «en retiro», solo las inactivas', () => {
    expect(slugs({})).toEqual(['syagrus-romanzoffiana', 'jacaranda-mimosifolia']);
    expect(slugs({ retiring: true })).toEqual(['retirada']);
  });

  it('busca por nombres alternativos sin tildes y filtra por tipo', () => {
    expect(slugs({ search: 'Palmera Bruja' })).toEqual(['syagrus-romanzoffiana']);
    expect(slugs({ search: 'JACARANDÁ' })).toEqual(['jacaranda-mimosifolia']);
    expect(slugs({ vegetationType: 'PALM' })).toEqual(['syagrus-romanzoffiana']);
    expect(slugs({ vegetationType: 'ALL' })).toHaveLength(2);
  });
});
