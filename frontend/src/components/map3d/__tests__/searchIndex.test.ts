import { buildSearchIndex, normalize, search, type SearchEntry } from '../searchIndex';

describe('normalize', () => {
  it('ignora tildes y mayúsculas, como el personal escribe en campo', () => {
    expect(normalize('Física ÁREA Ñandú')).toBe('fisica area nandu');
  });
});

describe('search', () => {
  const raw: Omit<SearchEntry, 'key'>[] = [
    { title: 'Pabellón Z', subtitle: 'Edificio', terms: 'aulas', target: { layer: 'campusBuildings', index: 0 }, priority: 1 },
    { title: 'Jardín Tinkuy', subtitle: 'Área verde, D 9', terms: '', target: { layer: 'greenAreas', index: 3 }, priority: 0 },
    { title: 'Tinkuy', subtitle: 'Servicios PUCP', terms: '', target: { layer: 'references', index: 7 }, priority: 2 },
    { title: 'Oficina de hallazgos', subtitle: 'Servicios PUCP', terms: 'hallazgos', target: { layer: 'references', index: 8 }, priority: 2 },
  ];
  const entries: SearchEntry[] = raw.map((e) => ({ ...e, key: normalize(`${e.title} ${e.subtitle} ${e.terms}`) }));

  it('no busca con menos de dos caracteres', () => {
    expect(search(entries, 't')).toEqual([]);
  });

  it('encuentra sin tildes ni mayúsculas', () => {
    expect(search(entries, 'pabellon z').map((e) => e.title)).toEqual(['Pabellón Z']);
  });

  it('pone primero la coincidencia exacta, después la que empieza igual', () => {
    expect(search(entries, 'tinkuy').map((e) => e.title)).toEqual(['Tinkuy', 'Jardín Tinkuy']);
  });

  it('encuentra por un término que no está en el título, como un alias', () => {
    expect(search(entries, 'aulas').map((e) => e.title)).toEqual(['Pabellón Z']);
  });

  it('exige todos los términos de la consulta', () => {
    expect(search(entries, 'jardin tinkuy').map((e) => e.title)).toEqual(['Jardín Tinkuy']);
  });

  it('devuelve como máximo nueve resultados', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...entries[0], title: `Pabellón ${i}`, key: `pabellon ${i}` }));
    expect(search(many, 'pabellon')).toHaveLength(9);
  });
});

describe('buildSearchIndex', () => {
  it('indexa los alias de una referencia para encontrarla por ellos', () => {
    const index = buildSearchIndex({
      campusBuildings: [], greenAreas: [], xerophytic: [], reserve: [], supervision: [], gates: [], bins: [],
      references: [{ p: [0, 0], props: { code: 'REF-1', name: 'Oficina de hallazgos', category: 'Servicios PUCP', parentCode: null, aliases: ['hallazgos'] } }],
      sectorNameByCode: {},
    });

    expect(search(index, 'hallazgos')[0].target).toEqual({ layer: 'references', index: 0 });
  });

  const ref = (code: string, name: string, parentCode: string | null = null) => ({
    p: [0, 0] as [number, number],
    props: { code, name, category: 'Servicios PUCP', parentCode, aliases: null },
  });
  const onlyRefs = (references: ReturnType<typeof ref>[]) =>
    buildSearchIndex({
      campusBuildings: [], greenAreas: [], xerophytic: [], reserve: [], supervision: [], gates: [], bins: [],
      references, sectorNameByCode: {},
    });

  it('agrupa los puntos de un mismo lugar en un solo resultado que lleva al primero', () => {
    const index = onlyRefs([ref('REF-1', 'Tinkuy'), ref('REF-2', 'Tinkuy'), ref('REF-3', 'Tinkuy')]);

    const found = search(index, 'tinkuy');
    expect(found).toHaveLength(1);
    expect(found[0].target).toEqual({ layer: 'references', index: 0 });
  });

  it('nombra el lugar padre para distinguir referencias homónimas', () => {
    const index = onlyRefs([
      ref('REF-1', 'Pabellón Z'),
      ref('REF-2', 'Pabellón H'),
      ref('REF-3', 'Cuarto piso', 'REF-1'),
      ref('REF-4', 'Cuarto piso', 'REF-2'),
    ]);

    expect(search(index, 'cuarto piso').map((e) => e.subtitle)).toEqual([
      'Servicios PUCP · Pabellón Z',
      'Servicios PUCP · Pabellón H',
    ]);
    expect(search(index, 'cuarto pabellon h')[0].target).toEqual({ layer: 'references', index: 3 });
  });

  it('no indexa edificios sin nombre: no se pueden buscar', () => {
    const index = buildSearchIndex({
      campusBuildings: [{ g: [], props: { id: 1, name: null, inferredName: false, category: null, campus: true, heightM: 8, levels: null, source: 'OSM', aliases: null } }],
      greenAreas: [], xerophytic: [], reserve: [], supervision: [], gates: [], bins: [], references: [], sectorNameByCode: {},
    });

    expect(index).toHaveLength(0);
  });
});
