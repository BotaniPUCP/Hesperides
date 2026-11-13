import { addCampusTargets, campusRowsFromPrefill, removeCampusTargets } from '../campusSelection';
import type { CampusOptions, InterventionLocation } from '@/lib/interventions-api';

const options = {
  selectionRevision: 'r1',
  zones: [{ id: 112, code: 'AV-112' }, { id: 113, code: 'AV-113' }],
  specimens: [{ id: 501, code: 'EV-000501' }, { id: 502, code: 'EV-000502' }],
} as unknown as CampusOptions;

const zone = (zoneId: number): InterventionLocation => ({ clientReference: `z${zoneId}`, zoneId, placeId: null, location: null,
  elementIds: [], description: '', unitItemId: null, requestedQuantity: null });
const specimens = (elementCodes: string[]): InterventionLocation => ({ clientReference: 'e', zoneId: null, placeId: null,
  location: null, elementIds: [], elementCodes, description: 'Ejemplares del conjunto', unitItemId: null, requestedQuantity: null });

describe('campusRowsFromPrefill: lo prellenado pasa a la selección del mapa', () => {
  it('un jardín es un área con la revisión vigente y cada ejemplar su propia fila', () => {
    const { rows, missing } = campusRowsFromPrefill([zone(112), specimens(['EV-000501', 'EV-000502'])], options);

    expect(missing).toBe(0);
    expect(rows.map((r) => [r.zoneId, r.elementIds, r.zoneSelectionRevision])).toEqual([
      [112, [], 'r1'], [null, [501], undefined], [null, [502], undefined]]);
  });

  it('cuenta y deja fuera lo que ya no está en el inventario', () => {
    const { rows, missing } = campusRowsFromPrefill([zone(999), zone(113), specimens(['EV-000501', 'EV-404'])], options);

    expect(missing).toBe(2);
    expect(rows.map((r) => r.zoneId ?? r.elementIds[0])).toEqual([113, 501]);
  });

  it('no repite un jardín ni un ejemplar que llegan dos veces', () => {
    const { rows } = campusRowsFromPrefill([zone(112), zone(112), specimens(['EV-000501', 'EV-000501'])], options);

    expect(rows).toHaveLength(2);
  });

  it('sin nada prellenado no hay selección', () => {
    expect(campusRowsFromPrefill([], options)).toEqual({ rows: [], missing: 0 });
  });
});

describe('agregar y quitar varios a la vez (Ctrl + rectángulo, barrido)', () => {
  const area = (id: number) => ({ kind: 'area' as const, id });
  const tree = (id: number) => ({ kind: 'specimen' as const, id });

  it('agrega solo lo que falta y lo desconocido no entra', () => {
    const first = addCampusTargets([], [area(112)], options);
    const rows = addCampusTargets(first, [area(112), area(113), tree(501), tree(404), area(999)], options);

    expect(rows.map((r) => r.zoneId ?? r.elementIds[0])).toEqual([112, 113, 501]);
    expect(rows[0]).toBe(first[0]);
  });

  it('quita lo indicado y deja lo demás', () => {
    const rows = addCampusTargets([], [area(112), area(113), tree(501), tree(502)], options);

    expect(removeCampusTargets(rows, [area(113), tree(501), tree(404)]).map((r) => r.zoneId ?? r.elementIds[0])).toEqual([112, 502]);
  });

  it('sin nada que cambiar devuelve la misma lista', () => {
    const rows = addCampusTargets([], [area(112)], options);

    expect(addCampusTargets(rows, [area(112)], options)).toBe(rows);
    expect(removeCampusTargets(rows, [area(113)])).toBe(rows);
  });
});
