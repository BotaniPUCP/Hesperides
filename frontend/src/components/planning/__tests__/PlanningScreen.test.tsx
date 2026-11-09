import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanningScreen } from '../PlanningScreen';
import { planningApi } from '@/lib/planning-api';
import { planningRow } from '../__fixtures__/planningFixtures';

jest.mock('@/lib/planning-api', () => ({ planningApi: { rows: jest.fn() } }));
const mockMap = jest.fn();
jest.mock('../PlanningMap', () => ({
  PlanningMap: (props: { setId: number | null }) => { mockMap(props); return <div data-testid="map" />; },
}));

const rows = planningApi.rows as jest.Mock;

describe('PlanningScreen (SPEC-203 §5.1, §7)', () => {
  it('muestra cada fila con su título, su estado y su enlace para planificar', async () => {
    rows.mockResolvedValue([planningRow(), planningRow({ setId: 6, setName: 'Sector Tambo', state: 'IN_PROGRESS', days: 16,
      progress: { done: 34, total: 50 }, openIntervention: { id: 81, code: 'INT-000081', scheduledDate: '2026-11-04', startedDate: '2026-11-05' } })]);

    render(<PlanningScreen />);

    expect(await screen.findByText('Corte de césped en Ingreso Riva-Agüero')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Planificar intervención' }))
      .toHaveAttribute('href', '/intervenciones/nueva?conjunto=3&actividad=30');
    expect(screen.getByRole('link', { name: 'Ver intervención' })).toHaveAttribute('href', '/intervenciones/81');
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/ronda|ritmo|propio de este conjunto/i);
  });

  it('al elegir una fila el mapa ilumina sus jardines', async () => {
    rows.mockResolvedValue([planningRow()]);
    render(<PlanningScreen />);

    await userEvent.click(await screen.findByRole('button', { name: /Corte de césped en Ingreso Riva-Agüero/ }));

    expect(mockMap).toHaveBeenLastCalledWith(expect.objectContaining({ setId: 3 }));
  });

  it('sin filas invita a crear conjuntos', async () => {
    rows.mockResolvedValue([]);
    render(<PlanningScreen />);

    expect(await screen.findByText('Todavía no hay conjuntos para planificar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Conjuntos' })).toHaveAttribute('href', '/intervenciones/conjuntos');
  });
});
