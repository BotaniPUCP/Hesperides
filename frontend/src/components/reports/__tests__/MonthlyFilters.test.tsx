import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReportSections } from '@/hooks/useReports';
import { EMPTY_MONTHLY_FILTERS } from '@/lib/reportNavigation';
import { MonthlyFilters } from '../MonthlyFilters';
import { reportOptions } from '../__fixtures__/monthly';

jest.mock('@/hooks/useReports', () => ({ useReportSections: jest.fn() }));

const idle = { loading: false, errorMessage: null, notFound: false, updateData: jest.fn() };
const onChange = jest.fn();
const options = { data: reportOptions, loading: false, errorMessage: null, reload: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useReportSections).mockReturnValue({
    ...idle, data: [{ id: 50, code: 'AV-0151', name: 'Jardín Frutas', areaM2: 1250.4 }],
  });
});

describe('MonthlyFilters (SPEC-202 §3.4, CA-M03)', () => {
  it('elegir un sector actualiza el filtro por id y limpia la sección', async () => {
    render(<MonthlyFilters filters={{ ...EMPTY_MONTHLY_FILTERS, sectionId: 99 }} invalid={false} options={options} onChange={onChange} />);
    await userEvent.setup().selectOptions(screen.getByLabelText('Sector'), 'SEC-VERDE-01');
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_MONTHLY_FILTERS, sectorId: 1, sectionId: null });
  });

  it('la sección solo se elige dentro de un sector, con las secciones de ese sector', async () => {
    const { rerender } = render(<MonthlyFilters filters={EMPTY_MONTHLY_FILTERS} invalid={false} options={options} onChange={onChange} />);
    expect(screen.getByLabelText('Sección')).toBeDisabled();
    rerender(<MonthlyFilters filters={{ ...EMPTY_MONTHLY_FILTERS, sectorId: 1 }} invalid={false} options={options} onChange={onChange} />);
    expect(useReportSections).toHaveBeenLastCalledWith(1);
    await userEvent.setup().selectOptions(screen.getByLabelText('Sección'), 'AV-0151');
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_MONTHLY_FILTERS, sectorId: 1, sectionId: 50 });
  });

  it('cambiar de clase limpia el tipo y ofrece solo los tipos de esa clase', async () => {
    render(<MonthlyFilters filters={{ ...EMPTY_MONTHLY_FILTERS, classItemId: 12, typeItemId: 30 }} invalid={false}
      options={options} onChange={onChange} />);
    expect(screen.getByLabelText('Tipo de actividad')).not.toHaveTextContent('Deshierbo');
    await userEvent.setup().selectOptions(screen.getByLabelText('Clase de actividad'), 'MANT_JARDINES');
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_MONTHLY_FILTERS, classItemId: 13, typeItemId: null });
  });

  it('el periodo cambia la URL solo cuando las dos fechas son válidas', () => {
    render(<MonthlyFilters filters={EMPTY_MONTHLY_FILTERS} invalid={false} options={options} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-31' } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_MONTHLY_FILTERS, dateFrom: '2026-10-01', dateTo: '2026-10-31' });
  });

  it('ofrece el mes en curso y el mes anterior como atajos', async () => {
    render(<MonthlyFilters filters={{ ...EMPTY_MONTHLY_FILTERS, dateFrom: '2026-09-01', dateTo: '2026-09-30' }}
      invalid={false} options={options} onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_MONTHLY_FILTERS, dateFrom: '2026-10-01', dateTo: '2026-10-31' });
    await user.click(screen.getByRole('button', { name: 'Mes en curso' }));
    expect(onChange).toHaveBeenLastCalledWith(EMPTY_MONTHLY_FILTERS);
  });

  it('si fallan las opciones muestra el error con Reintentar', async () => {
    const reload = jest.fn();
    render(<MonthlyFilters filters={EMPTY_MONTHLY_FILTERS} invalid={false}
      options={{ data: null, loading: false, errorMessage: 'Sin conexión.', reload }} onChange={onChange} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los filtros.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reload).toHaveBeenCalled();
  });
});
