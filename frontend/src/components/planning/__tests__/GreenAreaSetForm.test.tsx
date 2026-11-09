import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GreenAreaSetForm } from '../GreenAreaSetForm';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { ApiError } from '@/lib/api';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/green-area-sets-api', () => ({
  greenAreaSetsApi: { get: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
}));
jest.mock('@/lib/maintenance-api', () => ({
  maintenanceApi: { getActivityTypes: jest.fn().mockResolvedValue([
    { id: 30, code: 'CORTE_CESPED', label: 'Corte de césped' }, { id: 31, code: 'RIEGO', label: 'Riego' }]) },
}));
jest.mock('@/lib/irrigation-api', () => ({
  irrigationApi: {
    sectors: jest.fn().mockResolvedValue([{ id: 1, code: 'SEC-1', name: 'Sector 1' }]),
    sections: jest.fn().mockResolvedValue([{ id: 11, code: 'AV-0011', name: 'Jardín Central' }]),
  },
}));
jest.mock('@/components/map3d/SectionMapPicker', () => ({
  SectionMapPicker: ({ onConfirm }: { onConfirm: (ids: number[]) => void }) =>
    <button type="button" onClick={() => onConfirm([11])}>Confirmar mapa</button>,
}));

const api = greenAreaSetsApi as unknown as Record<string, jest.Mock>;

beforeEach(() => jest.clearAllMocks());

async function fillAndPick() {
  await userEvent.type(await screen.findByLabelText(/^Nombre/), 'Pabellones');
  await userEvent.click(screen.getByRole('checkbox', { name: 'Corte de césped' }));
  await userEvent.click(screen.getByRole('button', { name: 'Elegir jardines en el mapa' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Confirmar mapa' }));
}

describe('GreenAreaSetForm (SPEC-203 §5.2)', () => {
  it('exige nombre, al menos un jardín y una actividad antes de llamar al servidor', async () => {
    render(<GreenAreaSetForm />);
    await screen.findByLabelText(/^Nombre/);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar conjunto' }));

    expect(await screen.findByText('Ponle un nombre, elige al menos un jardín y una actividad.')).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('crea el conjunto con los jardines del mapa y vuelve a la lista', async () => {
    api.create.mockResolvedValue({ id: 9, warnings: [] });
    render(<GreenAreaSetForm />);

    await fillAndPick();
    expect(screen.getByText('1 jardín elegido')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar conjunto' }));

    expect(api.create).toHaveBeenCalledWith({ name: 'Pabellones', description: null, zoneIds: [11], activityTypeItemIds: [30] });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/intervenciones/conjuntos'));
  });

  it('muestra los avisos del servidor y no se va de la pantalla', async () => {
    api.create.mockResolvedValue({ id: 9, warnings: ['La sección Sección 113 ya sigue otra frecuencia propia'] });
    render(<GreenAreaSetForm />);

    await fillAndPick();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar conjunto' }));

    expect(await screen.findByText('La sección Sección 113 ya sigue otra frecuencia propia')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('al editar con una versión vieja explica el conflicto', async () => {
    api.get.mockResolvedValue({ id: 3, name: 'Pabellones', description: null, version: 2,
      activities: [{ id: 30, label: 'Corte de césped' }], warnings: [],
      zones: [{ id: 11, code: 'AV-0011', name: 'Jardín Central', displayName: 'Jardín Central', landscapeCode: null, sectorName: null }] });
    api.update.mockRejectedValue(new ApiError(409, 'Otra persona cambió este conjunto. Recarga para ver su versión.'));
    render(<GreenAreaSetForm setId={3} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Guardar conjunto' }));

    expect(api.update).toHaveBeenCalledWith(3, expect.objectContaining({ version: 2, zoneIds: [11] }));
    expect(await screen.findByText('Otra persona cambió este conjunto. Recarga para ver su versión.')).toBeInTheDocument();
  });

  it('dar de baja pide confirmación', async () => {
    api.get.mockResolvedValue({ id: 3, name: 'Pabellones', description: null, version: 0, activities: [], zones: [], warnings: [] });
    api.remove.mockResolvedValue(null);
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GreenAreaSetForm setId={3} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Dar de baja' }));

    expect(confirm).toHaveBeenCalled();
    expect(api.remove).toHaveBeenCalledWith(3);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/intervenciones/conjuntos'));
  });
});
