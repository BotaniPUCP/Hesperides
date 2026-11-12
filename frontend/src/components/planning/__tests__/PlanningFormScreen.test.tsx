import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MaintenanceFrequency } from '@shared/types';
import { PlanningFormScreen } from '../PlanningFormScreen';
import { planningApi } from '@/lib/planning-api';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/green-area-sets-api', () => ({
  greenAreaSetsApi: { list: jest.fn().mockResolvedValue([
    { id: 5, name: 'Ingreso', description: null, zoneCount: 3, elementCount: 0, specimenTypes: [], version: 0, updatedAt: '2026-11-10T00:00:00Z' },
    { id: 6, name: 'Palmeras', description: null, zoneCount: 0, elementCount: 4, specimenTypes: [], version: 0, updatedAt: '2026-11-10T00:00:00Z' }]) },
}));
const RIEGO = { id: 30, code: 'RIEGO', label: 'Riego manual' };
const PODA = { id: 31, code: 'PODA', label: 'Poda de mantenimiento' };
const frequency = (over: Partial<MaintenanceFrequency>): MaintenanceFrequency => ({
  id: 1, activityType: RIEGO, regime: 'IN_HOUSE',
  frequencyRuleType: { id: 101, code: 'INTERVAL_DAYS', label: 'Rango de días' }, scope: 'CAMPUS_WIDE', ruleKey: 'r1',
  minDaysInterval: 10, maxDaysInterval: 15, annualTargetCount: null, coverageTargetDays: null, estimatedDurationDays: null,
  seasonStartMonth: null, seasonEndMonth: null, seasons: [], notes: null, validFrom: '2026-01-01', validTo: null,
  current: true, active: true, createdAt: '', updatedAt: '', assignedSetCount: 0, ...over,
});
jest.mock('@/lib/maintenance-api', () => ({ maintenanceApi: { list: jest.fn() } }));
jest.mock('@/lib/planning-api', () => ({
  planningApi: { assignments: { list: jest.fn(), create: jest.fn(), change: jest.fn() } },
}));

const api = planningApi.assignments as unknown as Record<string, jest.Mock>;
const { maintenanceApi } = jest.requireMock('@/lib/maintenance-api') as { maintenanceApi: { list: jest.Mock } };
const palmerasPoda = { id: 70, setId: 6, setName: 'Palmeras', activityTypeItemId: 31, activityLabel: 'Poda de mantenimiento', ruleKey: 'r4-anterior', warnings: [] };

beforeEach(() => {
  jest.clearAllMocks();
  maintenanceApi.list.mockResolvedValue([
    frequency({ id: 2, scope: 'BY_SET', ruleKey: 'r2', minDaysInterval: 5, maxDaysInterval: 7 }),
    frequency({ id: 1 }),
    frequency({ id: 3, regime: 'OUTSOURCED', scope: 'BY_SET', ruleKey: 'r3' }),
    frequency({ id: 4, activityType: PODA, ruleKey: 'r4', minDaysInterval: 1, maxDaysInterval: 10 }),
  ]);
  api.list.mockResolvedValue([palmerasPoda]);
  api.create.mockResolvedValue({ id: 71, warnings: [] });
  api.change.mockResolvedValue({ id: 70, warnings: [] });
});

const choose = async (set: string, activity: string) => {
  await userEvent.selectOptions(await screen.findByLabelText('Conjunto'), set);
  await userEvent.selectOptions(screen.getByLabelText('Actividad'), activity);
};

describe('PlanningFormScreen (SPEC-203 D-16)', () => {
  it('primero se elige la actividad; sus frecuencias aparecen después', async () => {
    render(<PlanningFormScreen />);

    expect(await screen.findByText('Elige primero la actividad: aquí aparecen sus frecuencias.')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('Actividad')).getAllByRole('option').map((o) => o.textContent))
      .toEqual(['Elige una actividad…', 'Poda de mantenimiento', 'Riego manual']);
  });

  it('propone la frecuencia de todo el campus y no deja elegir las tercerizadas', async () => {
    render(<PlanningFormScreen />);
    await choose('5', '30');

    const radios = within(screen.getByRole('radiogroup', { name: 'Frecuencias de Riego manual' })).getAllByRole('radio');
    expect(radios[0]).toHaveAccessibleName(/Cada 10 a 15 días.*Todo el campus/);
    expect(radios[0]).toBeChecked();
    expect(radios[1]).toHaveAccessibleName(/Cada 5 a 7 días.*Solo algunas áreas/);
    expect(screen.getByRole('radio', { name: /tercerizada, no se planifica/ })).toBeDisabled();
  });

  it('guarda el conjunto con la frecuencia elegida y vuelve a planificación', async () => {
    render(<PlanningFormScreen />);
    await choose('5', '30');
    await userEvent.click(screen.getByRole('radio', { name: /Cada 5 a 7 días/ }));

    await userEvent.click(screen.getByRole('button', { name: 'Guardar planificación' }));

    expect(api.create).toHaveBeenCalledWith({ setId: 5, frequencyId: 2 });
    expect(mockPush).toHaveBeenCalledWith('/intervenciones/planificacion');
  });

  it('cambiar de actividad suelta la frecuencia elegida antes', async () => {
    render(<PlanningFormScreen />);
    await choose('5', '30');
    await userEvent.click(screen.getByRole('radio', { name: /Cada 5 a 7 días/ }));

    await userEvent.selectOptions(screen.getByLabelText('Actividad'), '31');

    expect(screen.getByRole('radio', { name: /Cada 1 a 10 días/ })).toBeChecked();
  });

  it('si el conjunto ya tiene esa actividad, avisa y edita esa planificación en vez de crear otra', async () => {
    render(<PlanningFormScreen />);
    await choose('6', '31');

    expect(screen.getByText('Este conjunto ya tiene una planificación de Poda de mantenimiento. Al guardar se edita esa.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(api.change).toHaveBeenCalledWith(70, { frequencyId: 4 });
    expect(api.create).not.toHaveBeenCalled();
  });

  it('si ya tiene esa misma planificación, lo dice y no hay nada que guardar', async () => {
    api.list.mockResolvedValue([{ ...palmerasPoda, ruleKey: 'r4' }]);
    render(<PlanningFormScreen />);
    await choose('6', '31');

    expect(screen.getByText('Este conjunto ya tiene esta planificación de Poda de mantenimiento, con esta misma frecuencia.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('al editar, conjunto y actividad quedan fijos y se marca la frecuencia que usa', async () => {
    api.list.mockResolvedValue([{ ...palmerasPoda, activityTypeItemId: 30, activityLabel: 'Riego manual', ruleKey: 'r2' }]);
    render(<PlanningFormScreen assignmentId={70} />);

    expect(await screen.findByRole('heading', { name: 'Editar planificación · Riego manual en Palmeras' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Conjunto')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Cada 5 a 7 días/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /Cada 1 a 10 días/ })).not.toBeInTheDocument();
  });

  it('una actividad sin frecuencia que se pueda planificar lo dice al guardar', async () => {
    maintenanceApi.list.mockResolvedValue([frequency({ id: 3, regime: 'OUTSOURCED', scope: 'BY_SET', ruleKey: 'r3' })]);
    render(<PlanningFormScreen />);
    await choose('5', '30');

    await userEvent.click(screen.getByRole('button', { name: 'Guardar planificación' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Riego manual no tiene una frecuencia que se pueda planificar.');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('sin conjunto o actividad no llama al servidor', async () => {
    render(<PlanningFormScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar planificación' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Elige el conjunto y la actividad.');
    expect(api.create).not.toHaveBeenCalled();
  });
});
