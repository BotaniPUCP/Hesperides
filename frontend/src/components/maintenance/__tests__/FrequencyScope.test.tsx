import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MaintenanceFrequency } from '@shared/types';
import { FrequenciesTable } from '../FrequenciesTable';
import { FrequencyFormModal } from '../FrequencyFormModal';

jest.mock('@/components/forms/unsaved/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: () => ({ confirm: (fn: () => void) => fn(), dialog: null, navigate: jest.fn() }),
}));

const sets = [{ id: 5, name: 'Campo deportivo', description: null, zoneCount: 4, activities: [], version: 0 }];

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

    await userEvent.selectOptions(screen.getByLabelText('Conjunto'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar frecuencia' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ scope: 'BY_SET', greenAreaSetId: 5 }));
  });
});
