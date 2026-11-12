import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MaintenanceFrequency } from '@shared/types';
import { FrequenciesTable } from '../FrequenciesTable';
import { FrequencyForm } from '../FrequencyForm';

const mockNavigate = jest.fn();
jest.mock('@/components/forms/unsaved/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: () => ({ confirm: (fn: () => void) => fn(), dialog: null, navigate: mockNavigate }),
}));

const frequency: MaintenanceFrequency = {
  id: 1,
  activityType: { id: 30, code: 'RIEGO', label: 'Riego' },
  regime: 'IN_HOUSE',
  frequencyRuleType: { id: 101, code: 'INTERVAL_DAYS', label: 'Intervalo por rango de días' },
  scope: 'BY_SET',
  ruleKey: 'regla-riego',
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
  assignedSetCount: 2,
};

const activities = [{ id: 30, code: 'RIEGO', label: 'Riego' }];
const ruleTypes = [{ id: 101, code: 'INTERVAL_DAYS', label: 'Intervalo por rango de días' }];

beforeEach(() => jest.clearAllMocks());

describe('Frecuencias: dónde rigen (SPEC-203 D-16)', () => {
  describe('la tabla', () => {
    it('dice dónde rige, sin nombrar conjuntos: dónde se usa se ve en Planificación', () => {
      render(<FrequenciesTable frequencies={[frequency]} canManage onEdit={jest.fn()} />);

      const row = screen.getByRole('row', { name: /Riego/ });
      expect(within(row).getByText('Solo algunas áreas')).toBeInTheDocument();
      expect(within(row).queryByRole('link')).not.toBeInTheDocument();
      expect(within(row).queryByText(/conjunto/i)).not.toBeInTheDocument();
    });

    it('la fila se abre con un clic o con el nombre, que también llega por teclado', async () => {
      const onEdit = jest.fn();
      render(<FrequenciesTable frequencies={[frequency]} canManage onEdit={onEdit} />);

      await userEvent.click(screen.getByText('Solo algunas áreas'));
      await userEvent.click(screen.getByRole('button', { name: 'Riego' }));

      expect(onEdit).toHaveBeenCalledTimes(2);
      expect(onEdit).toHaveBeenCalledWith(frequency);
      expect(screen.getByText('01/01/2026')).toBeInTheDocument();
    });
  });

  describe('el formulario, en su propia página', () => {
    it('no es un pop-up y «solo algunas áreas» no pide elegirlas aquí', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(<FrequencyForm activities={activities} ruleTypes={ruleTypes} onSubmit={onSubmit} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText(/teórico/i)).not.toBeInTheDocument();
      await userEvent.selectOptions(screen.getByLabelText('Grupo de actividades'), 'Otras actividades');
      await userEvent.selectOptions(screen.getByLabelText('Actividad'), '30');
      // Por defecto: personal propio y solo algunas áreas, con radios a la vista.
      expect(screen.getByRole('radio', { name: 'Personal propio PUCP' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Solo algunas áreas' })).toBeChecked();
      expect(screen.getByText('Las áreas se eligen al crear cada planificación.')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Conjunto de áreas verdes/)).not.toBeInTheDocument();
      await userEvent.type(screen.getByLabelText(/Mín. días/), '2');
      await userEvent.type(screen.getByLabelText(/Máx. días/), '3');
      await userEvent.click(screen.getByRole('button', { name: 'Registrar frecuencia' }));

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ scope: 'BY_SET' }));
      expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('greenAreaSetId');
      expect(mockNavigate).toHaveBeenCalledWith('/intervenciones/frecuencias');
    });

    it('todo el campus y tercerizado se eligen con un clic', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(<FrequencyForm activities={activities} ruleTypes={ruleTypes} onSubmit={onSubmit} />);
      await userEvent.selectOptions(screen.getByLabelText('Grupo de actividades'), 'Otras actividades');
      await userEvent.selectOptions(screen.getByLabelText('Actividad'), '30');

      await userEvent.click(screen.getByRole('radio', { name: 'Todo el campus' }));
      await userEvent.click(screen.getByRole('radio', { name: 'Servicio tercerizado' }));
      expect(screen.getByText('Las tercerizadas no se planifican.')).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText(/Mín. días/), '2');
      await userEvent.type(screen.getByLabelText(/Máx. días/), '3');
      await userEvent.click(screen.getByRole('button', { name: 'Registrar frecuencia' }));

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ scope: 'CAMPUS_WIDE', regime: 'OUTSOURCED' }));
    });

    it('al editar avisa que el cambio vale para todas las planificaciones que la usan', () => {
      render(<FrequencyForm frequencyToEdit={frequency} activities={activities} ruleTypes={ruleTypes} onSubmit={jest.fn()} />);

      expect(screen.getByRole('note')).toHaveTextContent('Esta frecuencia se usa en 2 planificaciones: el cambio vale para todas.');
      expect(screen.getByRole('link', { name: 'Ver en Planificación' }))
        .toHaveAttribute('href', '/intervenciones/planificacion?actividad=30');
    });

    it('si no la usa ninguna planificación, no avisa', () => {
      render(<FrequencyForm frequencyToEdit={{ ...frequency, assignedSetCount: 0 }} activities={activities} ruleTypes={ruleTypes} onSubmit={jest.fn()} />);

      expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('desactivar está dentro y vuelve a la lista solo si se confirmó', async () => {
      const onDeactivate = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      render(<FrequencyForm frequencyToEdit={frequency} activities={activities} ruleTypes={ruleTypes}
        onSubmit={jest.fn()} onDeactivate={onDeactivate} />);

      await userEvent.click(screen.getByRole('button', { name: 'Desactivar frecuencia' }));
      expect(onDeactivate).toHaveBeenCalledWith(frequency);
      expect(mockNavigate).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Desactivar frecuencia' }));
      expect(mockNavigate).toHaveBeenCalledWith('/intervenciones/frecuencias');
    });

    it('si el servidor rechaza, se queda en la página y lo dice', async () => {
      const onSubmit = jest.fn().mockRejectedValue(new Error('Ya existe una frecuencia vigente de todo el campus para esta actividad y modalidad'));
      render(<FrequencyForm frequencyToEdit={{ ...frequency, scope: 'CAMPUS_WIDE' }} activities={activities}
        ruleTypes={ruleTypes} onSubmit={onSubmit} />);

      await userEvent.click(screen.getByRole('button', { name: 'Guardar versión' }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
