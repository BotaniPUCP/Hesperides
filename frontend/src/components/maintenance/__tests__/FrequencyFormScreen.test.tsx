import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MaintenanceFrequency } from '@shared/types';
import { FrequencyFormScreen } from '../FrequencyFormScreen';

const mockNavigate = jest.fn();
jest.mock('@/components/forms/unsaved/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: () => ({ confirm: (fn: () => void) => fn(), dialog: null, navigate: mockNavigate }),
}));
const riego: MaintenanceFrequency = {
  id: 7, activityType: { id: 30, code: 'RIEGO', label: 'Riego manual' }, regime: 'IN_HOUSE',
  frequencyRuleType: { id: 101, code: 'INTERVAL_DAYS', label: 'Rango de días' }, scope: 'BY_SET', ruleKey: 'r7',
  minDaysInterval: 2, maxDaysInterval: 3, annualTargetCount: null, coverageTargetDays: null, estimatedDurationDays: null,
  seasonStartMonth: null, seasonEndMonth: null, seasons: [], notes: null, validFrom: '2026-01-01', validTo: null,
  current: true, active: true, createdAt: '', updatedAt: '', assignedSetCount: 3,
};
jest.mock('@/lib/maintenance-api', () => ({
  maintenanceApi: {
    getActivityTypes: jest.fn().mockResolvedValue([{ id: 30, code: 'RIEGO', label: 'Riego manual' }]),
    getRuleTypes: jest.fn().mockResolvedValue([{ id: 101, code: 'INTERVAL_DAYS', label: 'Rango de días' }]),
    getById: jest.fn(),
    delete: jest.fn().mockResolvedValue(null),
  },
}));
const { maintenanceApi } = jest.requireMock('@/lib/maintenance-api') as { maintenanceApi: Record<string, jest.Mock> };

beforeEach(() => {
  jest.clearAllMocks();
  maintenanceApi.getById.mockResolvedValue(riego);
});

describe('FrequencyFormScreen: desactivar', () => {
  it('pide confirmación en una ventana del sistema y dice cuántas planificaciones quedan sin frecuencia', async () => {
    const nativeConfirm = jest.spyOn(window, 'confirm');
    render(<FrequencyFormScreen frequencyId={7} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar frecuencia' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Desactivar frecuencia' }));
    expect(dialog.getByText('Se usa en 3 planificaciones: quedarán sin frecuencia hasta que les elijas otra.')).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Desactivar' }));

    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(maintenanceApi.delete).toHaveBeenCalledWith(7);
    expect(mockNavigate).toHaveBeenCalledWith('/intervenciones/frecuencias');
  });

  it('cancelar no desactiva ni sale de la página', async () => {
    render(<FrequencyFormScreen frequencyId={7} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar frecuencia' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(maintenanceApi.delete).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
