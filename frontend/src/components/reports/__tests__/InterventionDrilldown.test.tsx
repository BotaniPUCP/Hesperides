import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReportInterventionRow } from '@shared/types';
import { useReportInterventions, useWeeklyReport } from '@/hooks/useReports';
import { EMPTY_MONTHLY_FILTERS } from '@/lib/reportNavigation';
import { InterventionDrilldown } from '../InterventionDrilldown';
import { WeeklyReport } from '../WeeklyReport';
import { demoInterventions, demoOptions, demoWeekly } from '../demo/demoReports';

jest.mock('@/hooks/useReports', () => ({ useReportInterventions: jest.fn(), useWeeklyReport: jest.fn() }));

const idle = { loading: false, errorMessage: null, notFound: false, reload: jest.fn(), updateData: jest.fn() };
const filters = { ...EMPTY_MONTHLY_FILTERS, dateFrom: '2026-10-26', dateTo: '2026-11-01', sectorId: 2 };
const rows: ReportInterventionRow[] = [
  { id: 120, code: 'INT-000120', classLabel: 'Poda', typeLabel: 'Poda de mantenimiento', teamName: 'Cuadrilla 02',
    lastExecutionDate: '2026-10-31', pendingPhotos: 0 },
  { id: 118, code: 'INT-000118', classLabel: 'Riego', typeLabel: null, teamName: null,
    lastExecutionDate: null, pendingPhotos: 2 },
];

function answer(data: { total: number; items: ReportInterventionRow[] } | null, demo = false, errorMessage: string | null = null) {
  jest.mocked(useReportInterventions).mockReturnValue({ ...idle, data, demo, errorMessage });
}

beforeEach(() => jest.clearAllMocks());

describe('InterventionDrilldown (SPEC-202 D-20)', () => {
  it('con la cifra en 0 no ofrece nada que abrir', () => {
    render(<InterventionDrilldown kind="PENDING_APPROVAL" filters={filters} total={0} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('pide la lista solo al abrirla, con el tipo, los filtros y la cifra del reporte', () => {
    answer({ total: 2, items: rows });
    render(<InterventionDrilldown kind="PENDING_APPROVAL" filters={filters} total={2} />);
    expect(useReportInterventions).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Ver cuáles' }));

    expect(useReportInterventions).toHaveBeenCalledWith({ kind: 'PENDING_APPROVAL', filters, total: 2 });
    const dialog = screen.getByRole('dialog', { name: 'Ejecutadas pendientes de aprobación' });
    expect(within(dialog).getByRole('link', { name: 'INT-000120' })).toHaveAttribute('href', '/intervenciones/120');
    expect(within(dialog).getByText('Cuadrilla 02 · Ejecutada el 31 de octubre de 2026')).toBeInTheDocument();
    expect(within(dialog).getByText('Sin cuadrilla · Aún sin ejecutar · 2 fotos sin subir')).toBeInTheDocument();
  });

  it('avisa cuando la lista es más larga que lo que muestra', () => {
    answer({ total: 60, items: rows });
    render(<InterventionDrilldown kind="APPROVED" filters={filters} total={60} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver cuáles' }));
    expect(screen.getByText('Se muestran las 2 más recientes de 60.')).toBeInTheDocument();
  });

  it('en demostración no enlaza: esas intervenciones no existen', () => {
    answer(demoInterventions('APPROVED', filters, 3), true);
    render(<InterventionDrilldown kind="APPROVED" filters={filters} total={3} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver cuáles' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('DEMO-0001')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Datos de demostración/)).toBeInTheDocument();
  });

  it('un error se muestra con «Reintentar» dentro del diálogo', () => {
    answer(null, false, 'Sin conexión');
    render(<InterventionDrilldown kind="APPROVED" filters={filters} total={3} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver cuáles' }));
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar la lista. Sin conexión');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(idle.reload).toHaveBeenCalled();
  });
});

describe('demoInterventions', () => {
  it('trae tantas como dice la cifra, con tope de 50', () => {
    expect(demoInterventions('APPROVED', filters, 14).items).toHaveLength(14);
    const many = demoInterventions('APPROVED', filters, 80);
    expect(many.total).toBe(80);
    expect(many.items).toHaveLength(50);
  });

  it('las fotos pendientes no tienen ejecución todavía', () => {
    expect(demoInterventions('PENDING_PHOTOS', filters, 2).items.every((row) => row.lastExecutionDate === null)).toBe(true);
  });
});

describe('Semanal: del reporte a la intervención', () => {
  it('cada código de la tabla abre su intervención y los pendientes ofrecen su lista', () => {
    const weekly = demoWeekly({ weekStart: '2026-10-26', sectorId: 2 });
    jest.mocked(useWeeklyReport).mockReturnValue({ ...idle, data: weekly });
    render(<WeeklyReport parsed={{ params: { weekStart: '2026-10-26', sectorId: 2 }, invalid: false }}
      onChange={jest.fn()} options={{ data: demoOptions(), loading: false, errorMessage: null, reload: jest.fn() }}
      linkIncidents />);

    expect(screen.getAllByRole('link', { name: 'INT-000120' })[0]).toHaveAttribute('href', '/intervenciones/120');
    // Pendientes de aprobación (3) y fotos sin subir (2).
    expect(screen.getAllByRole('button', { name: 'Ver cuáles' })).toHaveLength(2);
  });
});
