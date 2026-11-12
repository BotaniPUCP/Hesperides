import {
  activeMonthlyFilters, allowedTabs, defaultTab, EMPTY_MONTHLY_FILTERS, monthlyHref, parseMonthly, resolveTab, tabHref,
} from '../reportNavigation';

const params = (query: string) => new URLSearchParams(query);

describe('pestañas por rol (SPEC-202 D-07, D-13, CA-G03)', () => {
  it('administración y coordinación ven las tres; el capataz, semanal y mensual; el operario, ninguna', () => {
    expect(allowedTabs('ADMIN')).toEqual(['semanal', 'mensual', 'direccion']);
    expect(allowedTabs('COORDINADOR')).toEqual(['semanal', 'mensual', 'direccion']);
    expect(allowedTabs('SUPERVISOR')).toEqual(['semanal', 'mensual']);
    expect(allowedTabs('OPERARIO')).toEqual([]);
    expect(allowedTabs(null)).toEqual([]);
  });

  it('el capataz abre la semanal y la oficina la mensual', () => {
    expect(defaultTab('SUPERVISOR')).toBe('semanal');
    expect(defaultTab('ADMIN')).toBe('mensual');
    expect(defaultTab('COORDINADOR')).toBe('mensual');
  });

  it('una pestaña ausente, inválida o no permitida cae en la del rol', () => {
    expect(resolveTab('mensual', 'SUPERVISOR')).toBe('mensual');
    expect(resolveTab('direccion', 'SUPERVISOR')).toBe('semanal');
    expect(resolveTab('osg', 'ADMIN')).toBe('mensual');
    expect(resolveTab(null, 'COORDINADOR')).toBe('mensual');
  });

  it('cambiar de pestaña descarta los parámetros de las otras', () => {
    expect(tabHref('direccion')).toBe('/reportes?tab=direccion');
  });
});

describe('parámetros de la mensual (§3.4, §5.2)', () => {
  it('lee ids y periodo válidos y los vuelve a escribir en la URL', () => {
    const { filters, invalid } = parseMonthly(params('tab=mensual&dateFrom=2026-10-01&dateTo=2026-10-31&sectorId=2&classItemId=12'));
    expect(invalid).toBe(false);
    expect(filters).toEqual({ ...EMPTY_MONTHLY_FILTERS, dateFrom: '2026-10-01', dateTo: '2026-10-31', sectorId: 2, classItemId: 12 });
    expect(monthlyHref(filters)).toBe('/reportes?tab=mensual&dateFrom=2026-10-01&dateTo=2026-10-31&sectorId=2&classItemId=12');
    expect(activeMonthlyFilters(filters)).toBe(3);
  });

  it('sin parámetros no hay error: el backend aplica el mes en curso', () => {
    expect(parseMonthly(params('tab=mensual'))).toEqual({ filters: EMPTY_MONTHLY_FILTERS, invalid: false });
  });

  it.each([
    ['un id que no es entero positivo', 'sectorId=abc'],
    ['un id cero', 'teamId=0'],
    ['una sola fecha', 'dateFrom=2026-10-01'],
    ['una fecha imposible', 'dateFrom=2026-02-30&dateTo=2026-03-01'],
    ['un rango invertido', 'dateFrom=2026-10-31&dateTo=2026-10-01'],
    ['más de 366 días', 'dateFrom=2026-01-01&dateTo=2027-01-02'],
  ])('marca como inválida la URL con %s', (_, query) => {
    expect(parseMonthly(params(query)).invalid).toBe(true);
  });

  it('acepta un año bisiesto completo', () => {
    expect(parseMonthly(params('dateFrom=2028-01-01&dateTo=2028-12-31')).invalid).toBe(false);
  });
});
