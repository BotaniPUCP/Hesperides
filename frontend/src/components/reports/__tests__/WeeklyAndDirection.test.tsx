import { render, screen } from '@testing-library/react';
import { useDirectionReport, useWeeklyReport } from '@/hooks/useReports';
import { DirectionReport } from '../DirectionReport';
import { WeeklyReport } from '../WeeklyReport';
import { demoDirection, demoOptions, demoWeekly } from '../demo/demoReports';

jest.mock('@/hooks/useReports', () => ({ useWeeklyReport: jest.fn(), useDirectionReport: jest.fn() }));

const idle = { loading: false, errorMessage: null, notFound: false, reload: jest.fn(), updateData: jest.fn() };
const options = { data: demoOptions(), loading: false, errorMessage: null, reload: jest.fn() };

beforeEach(() => jest.clearAllMocks());

describe('WeeklyReport (SPEC-202 CA-S02 a CA-S04)', () => {
  const weekly = demoWeekly({ weekStart: '2026-10-26', sectorId: 2 });

  function show(report = weekly, linkIncidents = true, sectorId: number | null = 2) {
    jest.mocked(useWeeklyReport).mockReturnValue({ ...idle, data: report });
    return render(<WeeklyReport parsed={{ params: { weekStart: '2026-10-26', sectorId }, invalid: false }}
      onChange={jest.fn()} options={options} linkIncidents={linkIncidents} />);
  }

  it('compara con la semana anterior y muestra riego, tipos e incidencias', () => {
    show();
    expect(screen.getByText('3 más que la semana anterior')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Riego del sector 115 de 118 secciones regadas en 3 turnos/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Labores aprobadas por tipo/ })).toBeInTheDocument();
    expect(screen.getAllByText('3 días').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Rama sobre la vía peatonal/ })[0])
      .toHaveAttribute('href', '/incidencias/12');
  });

  it('sin turno de riego no muestra 0 % sino el aviso (D-15)', () => {
    show({ ...weekly, irrigation: { ...weekly.irrigation, turns: 0, irrigatedSections: 0, percent: null } });
    expect(screen.getByText('Sin turno de riego registrado esta semana')).toBeInTheDocument();
  });

  it('ADMIN lee las incidencias sin enlace al detalle (§2.5)', () => {
    show(weekly, false);
    expect(screen.queryByRole('link', { name: /Rama sobre la vía peatonal/ })).not.toBeInTheDocument();
  });

  it('sin sectores a su alcance, el capataz ve el aviso de sector no asignado', () => {
    jest.mocked(useWeeklyReport).mockReturnValue({ ...idle, data: null });
    render(<WeeklyReport parsed={{ params: { weekStart: null, sectorId: null }, invalid: false }} onChange={jest.fn()}
      options={{ ...options, data: { ...options.data, sectors: [] } }} linkIncidents />);
    expect(screen.getByText('Tu cuadrilla no tiene sector asignado')).toBeInTheDocument();
  });
});

describe('DirectionReport (SPEC-202 CA-D01, CA-D04, CA-D06)', () => {
  function show(month: string) {
    jest.mocked(useDirectionReport).mockReturnValue({ ...idle, data: demoDirection(month) });
    return render(<DirectionReport parsed={{ month, invalid: false }} onChange={jest.fn()} options={options} />);
  }

  it('cada indicador muestra su valor, su meta y la variación frente al mes anterior', () => {
    show('2026-10');
    expect(screen.getByText('▲ 4,8 pts frente a septiembre')).toHaveClass('text-success-600');
    expect(screen.getByText('▼ 1,6 pts frente a septiembre')).toHaveClass('text-action-danger');
    expect(screen.getByText('▲ 3 frente a septiembre')).toHaveClass('text-neutral-700');
    expect(screen.getAllByText('Meta: 100,0 %').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: /Cobertura de los últimos 6 meses/ })).toBeInTheDocument();
  });

  it('lo que no tiene fuente dice «Sin datos» con su motivo', () => {
    show('2026-10');
    expect(screen.getAllByText('Sin datos')).toHaveLength(4);
    expect(screen.getByText('Falta definir qué es un ciclo de riego completo.')).toBeInTheDocument();
  });

  it('el mes en curso se rotula como parcial', () => {
    const current = new Date().toISOString().slice(0, 7);
    show(current);
    expect(screen.getByText('Mes en curso: cifras parciales')).toBeInTheDocument();
  });
});
