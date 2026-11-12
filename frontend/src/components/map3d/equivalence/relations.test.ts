import { conflicts, parseRelations, toggleId, type Relation } from './relations';
const relation: Relation = { id: 'one', code: '49', mapIds: ['11', '12'], skpIds: ['B-1', 'B-2', 'C-3'], note: 'Dos cuerpos y una cubierta', updatedAt: '2026-11-09T12:00:00Z' };
const args = ['source-hash', new Set(['49', '28']), new Set(['11', '12', '13']), new Set(['B-1', 'B-2', 'C-3'])] as const;
const file = () => ({ version: 1, sourceHash: 'source-hash', mapVersion: 4, relations: [{ ...relation, mapIds: [...relation.mapIds], skpIds: [...relation.skpIds] }] });
describe('manual equivalence files', () => {
  it('round-trips named relations without catalog codes even beyond catalog size', () => {
    const named = { ...relation, code: '', codes: [], name: 'Caseta nueva' };
    const input = { ...file(), relations: [named, { ...named, id: 'two', name: 'Otra caseta' }, { ...named, id: 'three' }] };
    const result = parseRelations(JSON.parse(JSON.stringify(input)), ...args);
    expect(result.relations).toEqual(input.relations);
    expect(() => parseRelations({ ...file(), relations: [{ ...named, name: '  ' }] }, ...args)).toThrow();
    expect(() => parseRelations({ ...file(), relations: [{ ...named, code: 'invalid' }] }, ...args)).toThrow();
  });
  it('preserves custom names in JSON and accepts older unnamed relations', () => {
    const input = file(); input.relations[0] = { ...input.relations[0], name: 'Nuevo nombre — Edificio' } as typeof input.relations[0];
    const result = parseRelations(JSON.parse(JSON.stringify(input)), ...args);
    expect(result.relations[0].name).toBe('Nuevo nombre — Edificio');
    expect(parseRelations(file(), ...args).relations[0].name).toBeUndefined();
    expect(() => parseRelations({ ...file(), relations: [{ ...relation, name: 10 }] }, ...args)).toThrow();
    expect(() => parseRelations({ ...file(), relations: [{ ...relation, name: 'a'.repeat(301) }] }, ...args)).toThrow();
  });
  it('round-trips multiple codes and rejects a secondary code reused elsewhere', () => {
    const input = { ...file(), version: 2, relations: [{ ...relation, codes: ['49', '28'] }] };
    const result = parseRelations(input, ...args);
    expect(result.relations[0].codes).toEqual(['49', '28']);
    expect(parseRelations(JSON.parse(JSON.stringify(result)), ...args)).toEqual(result);
    expect(() => parseRelations({ ...input, relations: [...input.relations, { ...relation, id: 'second', code: '28' }] }, ...args)).toThrow();
    expect(() => parseRelations({ ...input, relations: [{ ...relation, codes: ['49', 'missing'] }] }, ...args)).toThrow();
    expect(() => parseRelations({ ...input, relations: [{ ...relation, codes: ['49', '49'] }] }, ...args)).toThrow();
  });
  it('migrates C06 and C07 into one code without losing selections or notes', () => {
    const input = { ...file(), relations: [
      { ...relation, id: 'a', code: 'C06', mapIds: ['11'], skpIds: ['B-1'], note: 'Laboratorio' },
      { ...relation, id: 'b', code: 'C07', mapIds: ['12'], skpIds: ['B-1', 'B-2'], note: 'Talleres' },
    ] };
    const mergedArgs = [args[0], new Set(['C06-C07']), args[2], args[3]] as const;
    const result = parseRelations(input, ...mergedArgs);
    expect(result.relations).toHaveLength(1);
    expect(result.relations[0]).toMatchObject({ code: 'C06-C07', mapIds: ['11', '12'], skpIds: ['B-1', 'B-2'], note: 'Laboratorio\nTalleres' });
    expect(parseRelations(JSON.parse(JSON.stringify(result)), ...mergedArgs)).toEqual(result);
    expect(input.relations[0].code).toBe('C06');
  });
  it('round-trips many-to-many relations without losing parts or notes', () => {
    const result = parseRelations(JSON.parse(JSON.stringify(file())), ...args);
    expect(result.relations).toEqual([relation]);
  });
  it('rejects a different SKP even when part IDs happen to match', () => {
    expect(() => parseRelations({ ...file(), sourceHash: 'other' }, ...args)).toThrow();
  });
  it.each(['mapIds', 'skpIds'] as const)('rejects unknown %s', (key) => {
    for (const ids of [['missing']]) { const input = file(); input.relations[0][key] = ids; expect(() => parseRelations(input, ...args)).toThrow(); }
  });
  it.each(['mapIds', 'skpIds'] as const)('round-trips a relation with no %s', (key) => {
    const input = file(); input.relations[0][key] = [];
    expect(parseRelations(JSON.parse(JSON.stringify(input)), ...args).relations).toEqual(input.relations);
  });
  it('rejects a relation with neither map nor SKP structures', () => {
    const input = file(); input.relations[0].mapIds = []; input.relations[0].skpIds = [];
    expect(() => parseRelations(input, ...args)).toThrow();
  });
  it('rejects duplicate codes, duplicate pieces, and invalid dates', () => {
    const input = file(); input.relations.push({ ...relation, id: 'two' }); expect(() => parseRelations(input, ...args)).toThrow();
    input.relations.pop(); input.relations[0].skpIds = ['B-1', 'B-1']; expect(() => parseRelations(input, ...args)).toThrow();
    input.relations[0] = { ...relation, updatedAt: 'invalid' }; expect(() => parseRelations(input, ...args)).toThrow();
  });
  it('flags shared structures while allowing an existing relation to be edited', () => {
    expect(conflicts([relation], ['11'], ['C-3'], null)).toEqual([relation]);
    expect(conflicts([relation], ['11'], ['C-3'], relation.id)).toEqual([]);
    expect(conflicts([relation], ['13'], [], null)).toEqual([]);
  });
  it('toggles selections independently without mutating prior state', () => {
    const original = ['11']; const added = toggleId(original, '12'); expect(added).toEqual(['11', '12']); expect(original).toEqual(['11']); expect(toggleId(added, '11')).toEqual(['12']);
  });
});
