import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GreenAreaSetForm } from '../GreenAreaSetForm';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { ApiError } from '@/lib/api';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/green-area-sets-api', () => ({
  greenAreaSetsApi: { get: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(),
    elementOptions: jest.fn().mockResolvedValue([{ id: 501, code: 'EV-000501', displayName: 'Palmera datilera',
      typeLabel: 'Palmera', sectionName: 'Jardín Central', sectorId: 1, sectorName: 'Sector 1' }]) },
}));
jest.mock('@/lib/maintenance-api', () => ({
  maintenanceApi: { getActivityTypes: jest.fn().mockResolvedValue([
    { id: 30, code: 'CORTE_CESPED', label: 'Corte de césped', parentCode: 'Mantenimiento de jardines' },
    { id: 31, code: 'RIEGO', label: 'Riego manual', parentCode: 'Riego' }]) },
}));
jest.mock('@/lib/irrigation-api', () => ({
  irrigationApi: {
    sectors: jest.fn().mockResolvedValue([{ id: 1, code: 'SEC-1', name: 'Sector 1' }]),
    sections: jest.fn().mockResolvedValue([{ id: 11, code: 'AV-0011', name: 'Jardín Central' }]),
  },
}));
jest.mock('../SetMapPicker', () => ({
  SetMapPicker: ({ onConfirm }: { onConfirm: (ids: number[], specimenIds: number[]) => void }) => <>
    <button type="button" onClick={() => onConfirm([11], [])}>Confirmar mapa</button>
    <button type="button" onClick={() => onConfirm([11], [501])}>Confirmar con ejemplar</button>
  </>,
}));

const api = greenAreaSetsApi as unknown as Record<string, jest.Mock>;

beforeEach(() => jest.clearAllMocks());

async function fillAndPick() {
  await userEvent.type(await screen.findByLabelText(/^Nombre/), 'Pabellones');
  await userEvent.click(screen.getByRole('button', { name: 'Corte de césped' }));
  await userEvent.click(screen.getByRole('button', { name: 'Elegir en el mapa' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Confirmar mapa' }));
}

describe('GreenAreaSetForm (SPEC-203 §5.2)', () => {
  it('exige nombre, al menos un jardín y una actividad antes de llamar al servidor', async () => {
    render(<GreenAreaSetForm />);
    await screen.findByLabelText(/^Nombre/);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar conjunto' }));

    expect(await screen.findByText('Ponle un nombre, elige al menos un jardín o un ejemplar, y una actividad.')).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('las actividades se eligen por grupo y las elegidas se resumen abajo', async () => {
    render(<GreenAreaSetForm />);
    expect(await screen.findByRole('tab', { name: 'Mantenimiento de jardines' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: 'Riego manual' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Riego' }));
    await userEvent.click(screen.getByRole('button', { name: 'Riego manual' }));

    expect(screen.getByRole('button', { name: 'Riego manual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: 'Riego 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar Riego manual' }));
    expect(screen.getByText('Todavía no eliges actividades')).toBeInTheDocument();
  });

  it('crea el conjunto con los jardines del mapa y vuelve a la lista', async () => {
    api.create.mockResolvedValue({ id: 9, warnings: [] });
    render(<GreenAreaSetForm />);

    await fillAndPick();
    expect(screen.getByText('Elegido: 1 jardín')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar conjunto' }));

    expect(api.create).toHaveBeenCalledWith({ name: 'Pabellones', description: null, zoneIds: [11], elementIds: [], activityTypeItemIds: [30] });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/intervenciones/conjuntos'));
  });

  it('muestra los avisos del servidor y no se va de la pantalla', async () => {
    api.create.mockResolvedValue({ id: 9, warnings: ['La sección Sección 113 ya sigue otra frecuencia propia'] });
    render(<GreenAreaSetForm />);

    await fillAndPick();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar conjunto' }));

    expect(await screen.findByText('La sección Sección 113 ya sigue otra frecuencia propia')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    // Ya se guardó: no se ofrece guardar otra vez, que daría 409 o «nombre repetido».
    expect(screen.queryByRole('button', { name: 'Guardar conjunto' })).not.toBeInTheDocument();
  });

  it('al editar con una versión vieja explica el conflicto', async () => {
    api.get.mockResolvedValue({ id: 3, name: 'Pabellones', description: null, version: 2,
      activities: [{ id: 30, label: 'Corte de césped' }], warnings: [], elements: [],
      zones: [{ id: 11, code: 'AV-0011', name: 'Jardín Central', displayName: 'Jardín Central', landscapeCode: null, sectorName: null }] });
    api.update.mockRejectedValue(new ApiError(409, 'Otra persona cambió este conjunto. Recarga para ver su versión.'));
    render(<GreenAreaSetForm setId={3} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Guardar conjunto' }));

    expect(api.update).toHaveBeenCalledWith(3, expect.objectContaining({ version: 2, zoneIds: [11] }));
    expect(await screen.findByText('Otra persona cambió este conjunto mientras lo editabas. Recarga para ver su versión.')).toBeInTheDocument();
  });

  it('un conjunto nuevo abre el mapa de entrada y resume los jardines por sector', async () => {
    render(<GreenAreaSetForm />);

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar mapa' }));

    expect(screen.getByText('Sector 1')).toBeInTheDocument();
    expect(screen.getByText('1 jardín')).toBeInTheDocument();
    expect(screen.getByText('Jardín Central')).toBeVisible();
  });

  it('un conjunto puede mezclar jardines y ejemplares, y los envía juntos', async () => {
    api.create.mockResolvedValue({ id: 9, warnings: [] });
    render(<GreenAreaSetForm />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar con ejemplar' }));
    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Mixto');
    await userEvent.click(screen.getByRole('button', { name: 'Corte de césped' }));

    expect(screen.getByText('Elegido: 1 jardín · 1 ejemplar')).toBeInTheDocument();
    expect(screen.getByText('EV-000501 · Palmera datilera')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar conjunto' }));

    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ zoneIds: [11], elementIds: [501] }));
  });

  it('al editar un conjunto no abre el mapa por su cuenta', async () => {
    api.get.mockResolvedValue({ id: 3, name: 'Pabellones', description: null, version: 0, activities: [], zones: [], elements: [], warnings: [] });
    render(<GreenAreaSetForm setId={3} />);

    await screen.findByRole('button', { name: 'Guardar conjunto' });
    expect(screen.queryByRole('button', { name: 'Confirmar mapa' })).not.toBeInTheDocument();
  });

  it('dar de baja pide confirmación', async () => {
    api.get.mockResolvedValue({ id: 3, name: 'Pabellones', description: null, version: 0, activities: [], zones: [], elements: [], warnings: [] });
    api.remove.mockResolvedValue(null);
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GreenAreaSetForm setId={3} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Dar de baja' }));

    expect(confirm).toHaveBeenCalled();
    expect(api.remove).toHaveBeenCalledWith(3);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/intervenciones/conjuntos'));
  });
});
