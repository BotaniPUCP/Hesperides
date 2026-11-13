import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanningScreen } from '../PlanningScreen';
import { planningApi } from '@/lib/planning-api';
import { planningRow } from '../__fixtures__/planningFixtures';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  ...jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock,
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock('@/lib/planning-api', () => ({ planningApi: { rows: jest.fn(), assignments: { remove: jest.fn() } } }));
const mockMap = jest.fn();
jest.mock('../PlanningMap', () => ({
  PlanningMap: (props: { setId: number | null; pendingZoneIds?: number[] | null }) => { mockMap(props); return <div data-testid="map" />; },
}));

const rows = planningApi.rows as jest.Mock;
const removeAssignment = planningApi.assignments.remove as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/intervenciones/planificacion');
});

describe('PlanningScreen (SPEC-203 §5.1, §7)', () => {
  it('muestra cada fila con su título, su estado y su botón para planificar', async () => {
    rows.mockResolvedValue([planningRow(), planningRow({ setId: 6, setName: 'Sector Tambo', state: 'IN_PROGRESS', days: 16,
      progress: { done: 34, total: 50 }, openIntervention: { id: 81, code: 'INT-000081', scheduledDate: '2026-11-04', startedDate: '2026-11-05' } })]);

    render(<PlanningScreen />);

    expect(await screen.findAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Ingreso Riva-Agüero')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Planificar intervención' }));
    expect(mockPush).toHaveBeenLastCalledWith('/intervenciones/nueva?conjunto=3&actividad=30');
    await userEvent.click(screen.getByRole('button', { name: 'Ver intervención INT-000081' }));
    expect(mockPush).toHaveBeenLastCalledWith('/intervenciones/81');
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/ronda|ritmo|propio de este conjunto/i);
  });

  it('al elegir una fila el mapa ilumina sus jardines y dice qué conjunto es', async () => {
    rows.mockResolvedValue([planningRow()]);
    render(<PlanningScreen />);
    expect(await screen.findByText('Elige una tarjeta para ver su conjunto en el mapa.')).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: /^Corte de césped en Ingreso Riva-Agüero/ }));

    expect(mockMap).toHaveBeenLastCalledWith(expect.objectContaining({ setId: 3 }));
    expect(screen.getByText(/En el mapa:/)).toHaveTextContent('En el mapa: Ingreso Riva-Agüero · 18 jardines');
  });

  it('sin planificaciones invita a crear una', async () => {
    rows.mockResolvedValue([]);
    render(<PlanningScreen />);

    expect(await screen.findByText('Todavía no hay planificaciones')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '+ Nueva planificación' })[0]).toHaveAttribute('href', '/intervenciones/planificacion/nueva');
    expect(screen.queryByLabelText('Actividad')).not.toBeInTheDocument();
  });

  describe('editar y eliminar (SPEC-203 §3.4)', () => {
    it('cada tarjeta se puede editar', async () => {
      rows.mockResolvedValue([planningRow()]);
      render(<PlanningScreen />);

      await userEvent.click(await screen.findByRole('button', { name: 'Editar la planificación de Corte de césped en Ingreso Riva-Agüero' }));
      expect(mockPush).toHaveBeenCalledWith('/intervenciones/planificacion/71');
    });

    it('eliminar pide confirmación en una ventana del sistema y recarga las tarjetas', async () => {
      rows.mockResolvedValueOnce([planningRow()]).mockResolvedValueOnce([]);
      removeAssignment.mockResolvedValue(null);
      const nativeConfirm = jest.spyOn(window, 'confirm');
      render(<PlanningScreen />);

      await userEvent.click(await screen.findByRole('button', { name: 'Eliminar la planificación de Corte de césped en Ingreso Riva-Agüero' }));

      const dialog = within(screen.getByRole('dialog', { name: 'Eliminar planificación' }));
      expect(dialog.getByText(/Las intervenciones ya registradas no se borran/)).toBeInTheDocument();
      expect(removeAssignment).not.toHaveBeenCalled();
      await userEvent.click(dialog.getByRole('button', { name: 'Eliminar' }));

      expect(nativeConfirm).not.toHaveBeenCalled();
      expect(removeAssignment).toHaveBeenCalledWith(71);
      expect(await screen.findByText('Todavía no hay planificaciones')).toBeInTheDocument();
    });

    it('si se cancela la confirmación no elimina nada', async () => {
      rows.mockResolvedValue([planningRow()]);
      render(<PlanningScreen />);

      await userEvent.click(await screen.findByRole('button', { name: 'Eliminar la planificación de Corte de césped en Ingreso Riva-Agüero' }));
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(removeAssignment).not.toHaveBeenCalled();
    });

    it('desde una frecuencia llega con su actividad filtrada, y «Ver todas» quita el filtro', async () => {
      window.history.replaceState(null, '', '/intervenciones/planificacion?actividad=31');
      rows.mockResolvedValue([planningRow(), planningRow({ setId: 6, setName: 'Sector Tambo', activityTypeItemId: 31,
        activityLabel: 'Riego manual', ruleKey: 'regla-riego', assignmentId: 72 })]);
      render(<PlanningScreen />);

      expect(await screen.findByText('Sector Tambo')).toBeInTheDocument();
      expect(screen.queryByText('Ingreso Riva-Agüero')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Actividad')).toHaveValue('31');
      expect(screen.queryByLabelText('Frecuencia')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1 de 2 planificaciones.');

      await userEvent.click(screen.getByRole('button', { name: 'Ver todas' }));

      expect(screen.getByText('Ingreso Riva-Agüero')).toBeInTheDocument();
      expect(window.location.search).toBe('');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('filtros', () => {
    const two = () => [planningRow(), planningRow({ setId: 6, setName: 'Sector Tambo', state: 'DUE', days: 2, assignmentId: 72 })];

    it('busca el conjunto por nombre sin importar tildes ni mayúsculas, y lo guarda en la URL', async () => {
      rows.mockResolvedValue(two());
      render(<PlanningScreen />);

      await userEvent.type(await screen.findByLabelText('Buscar conjunto'), 'aguero');

      expect(screen.getByText('Ingreso Riva-Agüero')).toBeInTheDocument();
      expect(screen.queryByText('Sector Tambo')).not.toBeInTheDocument();
      expect(window.location.search).toBe('?conjunto=aguero');
    });

    it('filtra por estado y solo ofrece los estados que hay', async () => {
      rows.mockResolvedValue(two());
      render(<PlanningScreen />);

      const estado = await screen.findByLabelText('Estado');
      expect(within(estado).getAllByRole('option').map((o) => o.textContent)).toEqual(['Todos los estados', 'Atrasada', 'Pendiente']);
      await userEvent.selectOptions(estado, 'DUE');

      expect(screen.getByText('Sector Tambo')).toBeInTheDocument();
      expect(screen.queryByText('Ingreso Riva-Agüero')).not.toBeInTheDocument();
    });

    it('si nada coincide lo dice, sin confundirlo con no tener planificaciones', async () => {
      window.history.replaceState(null, '', '/intervenciones/planificacion?conjunto=zzz');
      rows.mockResolvedValue(two());
      render(<PlanningScreen />);

      expect(await screen.findByText('Ninguna planificación coincide con los filtros.')).toBeInTheDocument();
      expect(screen.queryByText('Todavía no hay planificaciones')).not.toBeInTheDocument();
    });
  });

  describe('avance parcial: solo una parte del conjunto quedó al día', () => {
    const partial = () => planningRow({ zoneCount: 4, state: 'OVERDUE', days: 6, ruleKind: 'INTERVAL_DAYS',
      upToDateCount: 2, pendingZoneIds: [13, 14], lastDate: '2026-11-02', daysSinceLast: 10,
      lastDates: [{ date: '2026-11-12', count: 2 }, { date: '2026-11-02', count: 2 }] });

    it('la tarjeta dice cuánto está al día, dónde está el atraso y cada fecha', async () => {
      rows.mockResolvedValue([partial()]);
      render(<PlanningScreen />);

      const card = within(await screen.findByRole('listitem'));
      expect(card.getByText('Al día: 2 de 4 jardines')).toBeInTheDocument();
      expect(card.getByRole('progressbar', { name: 'Al día' })).toHaveAttribute('aria-valuenow', '2');
      expect(card.getByText('6 días tarde en 2 jardines')).toBeInTheDocument();
      expect(card.getByText(/2 nov \(2\)/)).toBeInTheDocument();
    });

    it('planificar propone solo lo que falta', async () => {
      rows.mockResolvedValue([partial()]);
      render(<PlanningScreen />);

      await userEvent.click(await screen.findByRole('button', { name: 'Planificar los 2 pendientes' }));

      expect(mockPush).toHaveBeenCalledWith('/intervenciones/nueva?conjunto=3&actividad=30&pendientes=1');
    });

    it('al elegirla, el mapa recibe lo que falta para resaltarlo', async () => {
      rows.mockResolvedValue([partial()]);
      render(<PlanningScreen />);

      await userEvent.click(await screen.findByRole('button', { name: /^Corte de césped en Ingreso Riva-Agüero/ }));

      expect(mockMap).toHaveBeenLastCalledWith(expect.objectContaining({ setId: 3, pendingZoneIds: [13, 14], pendingElementIds: [], pendingLabel: '2 jardines' }));
    });

    it('sin avance parcial todo queda como siempre', async () => {
      rows.mockResolvedValue([planningRow({ state: 'OVERDUE', days: 4, upToDateCount: 0, pendingZoneIds: [1] })]);
      render(<PlanningScreen />);

      const card = within(await screen.findByRole('listitem'));
      expect(card.queryByText(/^Al día:/)).not.toBeInTheDocument();
      expect(card.getByText('4 días tarde')).toBeInTheDocument();
      expect(card.getByRole('button', { name: 'Planificar intervención' })).toBeInTheDocument();
    });
  });

  describe('la tarjeta', () => {
    it('explica bajo el título qué es cada tarjeta', async () => {
      rows.mockResolvedValue([planningRow()]);
      render(<PlanningScreen />);

      expect(await screen.findByText(/Una tarjeta por cada actividad planificada en un conjunto de áreas verdes/)).toBeInTheDocument();
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
      expect(card.getByText('Suele realizarse')).toBeInTheDocument();
    });

    it('sin frecuencia ofrece elegirla en vez de planificar', async () => {
      rows.mockResolvedValue([planningRow({ state: 'NOT_CONFIGURED', ruleKind: null, rhythm: null, days: null, ruleKey: null })]);
      render(<PlanningScreen />);

      expect(within(await screen.findByRole('listitem')).getByText('Sin frecuencia configurada')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Completar planificación' }));
      expect(mockPush).toHaveBeenCalledWith('/intervenciones/planificacion/71');
      const card = within(screen.getByRole('listitem'));
      expect(card.queryByRole('button', { name: 'Planificar intervención' })).not.toBeInTheDocument();
      expect(card.queryByText('Suele realizarse')).not.toBeInTheDocument();
    });
  });
});
