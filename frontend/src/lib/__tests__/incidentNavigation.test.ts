import { incidentFilters, incidentHref } from '../incidentNavigation';

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
