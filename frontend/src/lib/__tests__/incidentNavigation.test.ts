import { incidentFilters, incidentHref, positiveIncidentId, interventionCreationHref, incidentAfterCreationHref } from '../incidentNavigation';

it('preserves only known list filters when linking to detail, capture and back', () => {
  const filters = incidentFilters(new URLSearchParams('search=rama%20%26%20fuga&status=OPEN&page=2&return=https://evil.example'));
  const query = '?search=rama+%26+fuga&status=OPEN&page=2';
  expect(incidentHref('/incidencias', filters)).toBe(`/incidencias${query}`);
  expect(incidentHref('/incidencias/7', filters)).toBe(`/incidencias/7${query}`);
  expect(incidentHref('/incidencias/nueva', filters)).toBe(`/incidencias/nueva${query}`);
});

it.each(['-1', '1.5', 'invalid', 'Infinity', '9007199254740992'])('ignores an invalid page: %s', (page) => {
  expect(incidentFilters(new URLSearchParams({ page })).page).toBe(0);
});

it('omits default filters and bounds incoming text', () => {
  expect(incidentHref('/incidencias', incidentFilters(new URLSearchParams()))).toBe('/incidencias');
  const filters = incidentFilters(new URLSearchParams({ search: 'a'.repeat(201), status: 'b'.repeat(51) }));
  expect(filters.search).toHaveLength(200);
  expect(filters.status).toHaveLength(50);
});

it.each(['0','-1','1.5','//evil.example','9007199254740992','https://evil.example'])('rejects unsafe return context IDs: %s',(value)=>{
  expect(positiveIncidentId(value)).toBeNull();
});

it('returns only to a local incident route and preserves allowed list filters',()=>{
  const filters={search:'rama & riego',status:'OPEN',page:2};
  const creation=new URL(interventionCreationHref(7,filters),'https://local.test');
  expect(creation.pathname).toBe('/intervenciones/nueva');
  expect(creation.searchParams.get('fromIncident')).toBe('7');
  expect(positiveIncidentId('7')).toBe(7);
  expect(incidentAfterCreationHref(7,11,filters)).toBe('/incidencias/7?search=rama+%26+riego&status=OPEN&page=2&selectIntervention=11');
  expect(incidentAfterCreationHref(7,null,filters)).not.toContain('selectIntervention');
});
