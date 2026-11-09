import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMonthlyReport, useReportSections } from '@/hooks/useReports';
import { EMPTY_MONTHLY_FILTERS } from '@/lib/reportNavigation';
import { MonthlyReport } from '../MonthlyReport';
import { monthlyReport, reportOptions } from '../__fixtures__/monthly';

jest.mock('@/hooks/useReports', () => ({ useMonthlyReport: jest.fn(), useReportSections: jest.fn() }));

const idle = { loading: false, errorMessage: null, notFound: false, reload: jest.fn(), updateData: jest.fn() };
const options = { data: reportOptions, loading: false, errorMessage: null, reload: jest.fn() };
const onChange = jest.fn();

function show(report: Partial<ReturnType<typeof useMonthlyReport>> = {}, filters = EMPTY_MONTHLY_FILTERS, invalid = false) {
  jest.mocked(useMonthlyReport).mockReturnValue({ ...idle, data: monthlyReport, ...report });
  return render(<MonthlyReport parsed={{ filters, invalid }} onChange={onChange} options={options} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useReportSections).mockReturnValue({ ...idle, data: null });
});

describe('MonthlyReport (SPEC-202 §5.1, §7.4)', () => {
  it('pondera la cobertura por superficie y muestra la regla provisional (CA-M02)', () => {
    show();
    expect(screen.getAllByText(/25,0\s%/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1000 de 4000\sm²/).length).toBeGreaterThan(0);
    expect(screen.getByText('Regla provisional')).toHaveClass('text-info-600');
    expect(screen.getByRole('img', { name: /Cobertura por sector/ })).toBeInTheDocument();
    expect(screen.getByText('Del 1 al 31 de octubre de 2026')).toBeInTheDocument();
  });

  it('lo no evaluable se ve en gris y lo vencido en rojo con su lugar (CA-M04, CA-M05)', () => {
    show();
    const table = screen.getAllByRole('table').find((t) => within(t).queryByText('Poda sanitaria'))!;
    expect(within(table).getByText('No evaluable')).toHaveClass('text-neutral-700');
    expect(within(table).getByText('Tercerizado: su ejecución no se registra por lugar.')).toBeInTheDocument();
    expect(within(table).getByText('Fuera de plazo (1)')).toHaveClass('text-action-danger');
    expect(within(table).getByText('Antes del mínimo (1)')).toHaveClass('text-neutral-700');
    expect(within(table).queryByText(/Dentro de tolerancia/)).not.toBeInTheDocument();
    expect(within(table).getByText('Jardín Frutas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver detalle por lugar' })).toHaveAttribute('href', '/admin/frecuencias');
  });

  it('muestra el total exacto de una lista con tope', () => {
    show();
    expect(screen.getByText('Se muestran 1 de 14.')).toBeInTheDocument();
  });

  it('avisa al capataz sin sector en vez de mostrar un porcentaje', () => {
    show({ data: { ...monthlyReport, coverage: { ...monthlyReport.coverage, available: false, unavailableReason: 'NO_SECTOR_ASSIGNED', percent: null } } });
    expect(screen.getByText(/Tu cuadrilla no tiene sector asignado/)).toBeInTheDocument();
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });

  it('un error se muestra con Reintentar y no afecta a los filtros', async () => {
    const reload = jest.fn();
    show({ data: null, errorMessage: 'Error del servidor.', reload });
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el reporte mensual.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reload).toHaveBeenCalled();
    expect(screen.getByLabelText('Sector')).toBeInTheDocument();
  });

  it('al recargar por un filtro conserva los datos previos atenuados', () => {
    const { container } = show({ loading: true });
    expect(container.querySelector('[aria-busy="true"]')).toHaveClass('opacity-60');
    expect(screen.getByText('Poda de mantenimiento')).toBeInTheDocument();
  });

  it('una URL inválida no consulta y ofrece volver al periodo por defecto', async () => {
    show({ data: null }, { ...EMPTY_MONTHLY_FILTERS, dateFrom: '2026-10-01' }, true);
    expect(useMonthlyReport).toHaveBeenCalledWith(null);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Volver al periodo por defecto' }));
    expect(onChange).toHaveBeenCalledWith(EMPTY_MONTHLY_FILTERS);
  });

  it('distingue un filtro sin secciones de un periodo sin trabajo aprobado', () => {
    const { unmount } = show({ data: { ...monthlyReport, coverage: { ...monthlyReport.coverage, totalSections: 0, coveredSections: 0 } } });
    expect(screen.getByText('Tu filtro no encontró secciones')).toBeInTheDocument();
    unmount();
    show({ data: { ...monthlyReport, interventions: { approved: 0, pendingApproval: 0 }, coverage: { ...monthlyReport.coverage, coveredSections: 0 } } });
    expect(screen.getByText('No hay trabajo aprobado en este periodo')).toBeInTheDocument();
  });

  it('anota los sectores sin cuadrilla propia y que la cuadrilla no filtra el cumplimiento', () => {
    show({}, { ...EMPTY_MONTHLY_FILTERS, sectorId: 4, teamId: 5 });
    expect(screen.getByText(/Mantenimiento tercerizado o a demanda/)).toBeInTheDocument();
    expect(screen.getByText(/El filtro de cuadrilla no aplica al cumplimiento/)).toBeInTheDocument();
  });

  it('un id fuera del alcance (404) ofrece volver al periodo por defecto', () => {
    show({ data: null, notFound: true });
    expect(screen.getByText(/no existe o no está a tu alcance/)).toBeInTheDocument();
  });
});
