import { render, screen, within } from '@testing-library/react';
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

    expect(await screen.findAllByText('Corte de césped')).toHaveLength(2);
    expect(screen.getByText('Ingreso Riva-Agüero')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Planificar intervención' }))
      .toHaveAttribute('href', '/intervenciones/nueva?conjunto=3&actividad=30');
    expect(screen.getByRole('link', { name: 'Ver intervención INT-000081' })).toHaveAttribute('href', '/intervenciones/81');
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/ronda|ritmo|propio de este conjunto/i);
  });

  it('al elegir una fila el mapa ilumina sus jardines', async () => {
    rows.mockResolvedValue([planningRow()]);
    render(<PlanningScreen />);

    await userEvent.click(await screen.findByRole('button', { name: /Ingreso Riva-Agüero/ }));

    expect(mockMap).toHaveBeenLastCalledWith(expect.objectContaining({ setId: 3 }));
  });

  it('sin filas invita a crear conjuntos', async () => {
    rows.mockResolvedValue([]);
    render(<PlanningScreen />);

    expect(await screen.findByText('Todavía no hay conjuntos para planificar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Conjuntos' })).toHaveAttribute('href', '/intervenciones/conjuntos');
  });

  describe('la tarjeta', () => {
    it('explica bajo el título qué es cada tarjeta', async () => {
      rows.mockResolvedValue([planningRow()]);
      render(<PlanningScreen />);

      expect(await screen.findByText(/Una tarjeta por cada actividad de cada conjunto de áreas verdes/)).toBeInTheDocument();
    });

    it('siempre tiene la misma forma: estado, actividad, conjunto y sus datos', async () => {
      rows.mockResolvedValue([planningRow({ state: 'OVERDUE', days: 4, elementCount: 2 })]);
      render(<PlanningScreen />);

      const card = within(await screen.findByRole('listitem'));
      expect(card.getByText('Atrasada')).toBeInTheDocument();
      expect(card.getByText('4 días tarde')).toBeInTheDocument();
      expect(card.getByText('Corte de césped')).toBeInTheDocument();
      expect(card.getByText('Ingreso Riva-Agüero')).toBeInTheDocument();
      expect(card.getByText('Última vez')).toBeInTheDocument();
      expect(card.getByText('18 jardines · 2 ejemplares')).toBeInTheDocument();
      expect(card.getByText('Frecuencia')).toBeInTheDocument();
    });

    it('sin frecuencia ofrece configurarla en vez de planificar', async () => {
      rows.mockResolvedValue([planningRow({ state: 'NOT_CONFIGURED', ruleKind: null, rhythm: null, days: null })]);
      render(<PlanningScreen />);

      expect(await screen.findByText('Sin frecuencia configurada')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Configurar frecuencia' })).toHaveAttribute('href', '/intervenciones/frecuencias');
      expect(screen.queryByRole('link', { name: 'Planificar intervención' })).not.toBeInTheDocument();
      expect(screen.queryByText('Frecuencia')).not.toBeInTheDocument();
    });
  });
});
