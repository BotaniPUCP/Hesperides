import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MaintenanceFrequency } from '@shared/types';
import { FrequenciesTable } from '../FrequenciesTable';
import { FrequencyFormModal } from '../FrequencyFormModal';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';

jest.mock('@/lib/green-area-sets-api', () => ({ greenAreaSetsApi: { list: jest.fn() } }));
jest.mock('@/components/forms/unsaved/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: () => ({ confirm: (fn: () => void) => fn(), dialog: null, navigate: jest.fn() }),
}));

const sets = [{ id: 5, name: 'Campo deportivo', description: null, zoneCount: 4, elementCount: 0, sectorNames: ['Sector 1'], activities: [], version: 0, updatedAt: '2026-11-10T12:00:00Z' }];

const frequency: MaintenanceFrequency = {
  id: 1,
  activityType: { id: 30, code: 'RIEGO', label: 'Riego' },
  regime: 'IN_HOUSE',
  frequencyRuleType: { id: 101, code: 'INTERVAL_DAYS', label: 'Intervalo por rango de días' },
  scope: 'BY_SET',
  greenAreaSetId: 5,
  minDaysInterval: 2,
  maxDaysInterval: 3,
  annualTargetCount: null,
  coverageTargetDays: null,
  estimatedDurationDays: null,
  seasonStartMonth: null,
  seasonEndMonth: null,
  seasons: [],
  notes: null,
  validFrom: '2026-01-01',
  validTo: null,
  current: true,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('Frecuencias por conjunto (SPEC-203 §5.3)', () => {
  it('la fila de una frecuencia propia dice a qué conjunto aplica', () => {
    render(<FrequenciesTable frequencies={[frequency]} sets={sets} canManage onEdit={jest.fn()} />);

    const row = screen.getByRole('row', { name: /Riego/ });
    expect(within(row).getByText('Campo deportivo')).toBeInTheDocument();
    expect(within(row).getByText('propio de este conjunto')).toBeInTheDocument();
  });

  it('la fila se abre con un clic o con el nombre, que también llega por teclado', async () => {
    const onEdit = jest.fn();
    render(<FrequenciesTable frequencies={[frequency]} sets={sets} canManage onEdit={onEdit} />);

    await userEvent.click(screen.getByText('Campo deportivo'));
    await userEvent.click(screen.getByRole('button', { name: 'Riego' }));

    expect(onEdit).toHaveBeenCalledTimes(2);
    expect(onEdit).toHaveBeenCalledWith(frequency);
    expect(screen.getByText('01/01/2026')).toBeInTheDocument();
  });

  it('desactivar está dentro del formulario y lo cierra solo si se confirmó', async () => {
    const onClose = jest.fn();
    const onDeactivate = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<FrequencyFormModal isOpen onClose={onClose} frequencyToEdit={frequency}
      activities={[{ id: 30, code: 'RIEGO', label: 'Riego' }]}
      ruleTypes={[{ id: 101, code: 'INTERVAL_DAYS', label: 'Rango de días' }]} sets={sets}
      onSubmit={jest.fn()} onDeactivate={onDeactivate} />);

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar frecuencia' }));
    expect(onDeactivate).toHaveBeenCalledWith(1);
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar frecuencia' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('el formulario no pide «Teórico» y una frecuencia propia exige elegir el conjunto', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<FrequencyFormModal isOpen onClose={jest.fn()} activities={[{ id: 30, code: 'RIEGO', label: 'Riego' }]}
      ruleTypes={[{ id: 101, code: 'INTERVAL_DAYS', label: 'Intervalo por rango de días' }]} sets={sets} onSubmit={onSubmit} />);

    expect(screen.queryByText(/teórico/i)).not.toBeInTheDocument();
    // Una frecuencia nueva no trae actividad elegida: se elige grupo y actividad.
    await userEvent.selectOptions(screen.getByLabelText('Grupo de actividades'), 'Otras actividades');
    await userEvent.selectOptions(screen.getByLabelText('Actividad'), '30');
    await userEvent.selectOptions(screen.getByLabelText('Se aplica a'), 'BY_SET');
    await userEvent.type(screen.getByLabelText(/Mín. días/), '2');
    await userEvent.type(screen.getByLabelText(/Máx. días/), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar frecuencia' }));
    expect(await screen.findByText(/Elige el conjunto/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText('Conjunto de áreas verdes'), '5');
    const link = screen.getByRole('link', { name: /Ver conjunto/ });
    expect(link).toHaveAttribute('href', '/intervenciones/conjuntos/5');
    expect(link).toHaveAttribute('target', '_blank');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar frecuencia' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ scope: 'BY_SET', greenAreaSetId: 5 }));
  });

  describe('elegir el conjunto', () => {
    const openNew = async (withSets = sets) => {
      render(<FrequencyFormModal isOpen onClose={jest.fn()} activities={[{ id: 30, code: 'RIEGO', label: 'Riego' }]}
        ruleTypes={[{ id: 101, code: 'INTERVAL_DAYS', label: 'Intervalo por rango de días' }]} sets={withSets} onSubmit={jest.fn()} />);
      await userEvent.selectOptions(screen.getByLabelText('Se aplica a'), 'BY_SET');
    };

    it('dice en una línea qué es un conjunto y cada opción muestra qué contiene', async () => {
      await openNew();

      expect(screen.getByRole('option', { name: 'Un conjunto de áreas verdes' })).toBeInTheDocument();
      expect(screen.getByText(/Grupo de jardines y ejemplares/)).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Campo deportivo · 4 jardines' })).toBeInTheDocument();
    });

    it('ofrece crear el conjunto primero, en otra pestaña para no perder lo escrito', async () => {
      await openNew();

      const create = screen.getByRole('link', { name: /Crear conjunto/ });
      expect(create).toHaveAttribute('href', '/intervenciones/conjuntos/nuevo?desde=frecuencia');
      expect(create).toHaveAttribute('target', '_blank');
    });

    it('un conjunto vacío se nota en la lista', async () => {
      await openNew([...sets, { ...sets[0], id: 6, name: 'Antiguo', zoneCount: 0, sectorNames: [] }]);

      expect(screen.getByRole('option', { name: 'Antiguo · vacío' })).toBeInTheDocument();
    });

    it('sin conjuntos invita a crear el primero', async () => {
      await openNew([]);

      expect(screen.getByRole('option', { name: 'Todavía no hay conjuntos' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Crear el primer conjunto/ })).toBeInTheDocument();
    });

    it('al volver a la pestaña recarga la lista y elige el conjunto recién creado', async () => {
      const created = { ...sets[0], id: 8, name: 'Ingreso principal', zoneCount: 2, elementCount: 3 };
      (greenAreaSetsApi.list as jest.Mock).mockResolvedValue([...sets, created]);
      await openNew();

      await act(async () => { window.dispatchEvent(new Event('focus')); });

      expect(screen.getByLabelText('Conjunto de áreas verdes')).toHaveValue('8');
      expect(screen.getByRole('option', { name: 'Ingreso principal · 2 jardines · 3 ejemplares' })).toBeInTheDocument();
    });

    it('si ya había uno elegido, al volver no lo cambia', async () => {
      (greenAreaSetsApi.list as jest.Mock).mockResolvedValue([...sets, { ...sets[0], id: 8, name: 'Otro' }]);
      await openNew();
      await userEvent.selectOptions(screen.getByLabelText('Conjunto de áreas verdes'), '5');

      await act(async () => { window.dispatchEvent(new Event('focus')); });

      expect(screen.getByLabelText('Conjunto de áreas verdes')).toHaveValue('5');
      expect(screen.getByRole('option', { name: /Otro/ })).toBeInTheDocument();
    });
  });
});
