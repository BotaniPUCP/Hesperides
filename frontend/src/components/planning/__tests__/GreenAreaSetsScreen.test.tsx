import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GreenAreaSetsScreen } from '../GreenAreaSetsScreen';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';

jest.mock('@/lib/green-area-sets-api', () => ({ greenAreaSetsApi: { list: jest.fn(), remove: jest.fn() } }));

const list = greenAreaSetsApi.list as jest.Mock;
const remove = greenAreaSetsApi.remove as jest.Mock;

const set = (over: Record<string, unknown>) => ({ id: 3, name: 'Ingreso Riva-Agüero', description: null, zoneCount: 18,
  elementCount: 0, specimenTypes: [], version: 0, updatedAt: '2026-11-10T15:00:00Z', ...over });

beforeEach(() => jest.clearAllMocks());

describe('GreenAreaSetsScreen (SPEC-203 §5.2)', () => {
  it('cada tarjeta dice qué contiene, sus ejemplares por tipo y cuándo cambió', async () => {
    list.mockResolvedValue([set({ elementCount: 15, description: 'Bermas del ingreso principal',
      specimenTypes: [{ label: 'Palmera', count: 12 }, { label: 'Árbol', count: 3 }] })]);

    render(<GreenAreaSetsScreen />);

    const card = await screen.findByRole('link', { name: /^Ingreso Riva-Agüero/ });
    expect(card).toHaveAttribute('href', '/intervenciones/conjuntos/3');
    expect(within(card).getByText('Bermas del ingreso principal')).toBeInTheDocument();
    expect(within(card).getByText('18 jardines · 15 ejemplares')).toBeInTheDocument();
    expect(within(card).getByText('12 Palmera, 3 Árbol')).toBeInTheDocument();
    expect(within(card).getByText('Actualizado 10/11/2026')).toBeInTheDocument();
  });

  it('no muestra sectores ni qué se planifica: eso se ve en Planificación', async () => {
    list.mockResolvedValue([set({})]);

    render(<GreenAreaSetsScreen />);

    await screen.findByRole('link', { name: /^Ingreso Riva-Agüero/ });
    expect(screen.queryByText(/Sector/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Actividades que se planifican|Atrasada|Pendiente|Al día/)).not.toBeInTheDocument();
  });

  it('ofrece ver el conjunto en el mapa', async () => {
    list.mockResolvedValue([set({})]);

    render(<GreenAreaSetsScreen />);

    expect(await screen.findByRole('link', { name: /en el mapa$/ })).toHaveAttribute('href', '/intervenciones/conjuntos/3#mapa');
  });

  it('un conjunto vacío lo advierte y no ofrece el mapa', async () => {
    list.mockResolvedValue([set({ id: 4, name: 'Antiguo', zoneCount: 0 })]);

    render(<GreenAreaSetsScreen />);

    expect(await screen.findByText('Vacío: sus jardines y ejemplares se dieron de baja')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /en el mapa$/ })).not.toBeInTheDocument();
  });

  it('sin conjuntos invita a crear el primero', async () => {
    list.mockResolvedValue([]);

    render(<GreenAreaSetsScreen />);

    expect(await screen.findByText('Todavía no hay conjuntos guardados')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+ Nuevo conjunto' })).toHaveAttribute('href', '/intervenciones/conjuntos/nuevo');
  });

  it('cada tarjeta se puede eliminar, con confirmación en una ventana del sistema', async () => {
    list.mockResolvedValueOnce([set({})]).mockResolvedValueOnce([]);
    remove.mockResolvedValue(null);
    render(<GreenAreaSetsScreen />);

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Ingreso Riva-Agüero' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Eliminar conjunto' }));
    expect(dialog.getByText(/Sus planificaciones se eliminan/)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Eliminar' }));

    expect(remove).toHaveBeenCalledWith(3);
    expect(await screen.findByText('Todavía no hay conjuntos guardados')).toBeInTheDocument();
  });

  it('un conjunto vacío también se puede eliminar, aunque no tenga qué ver en el mapa', async () => {
    list.mockResolvedValue([set({ zoneCount: 0 })]);
    render(<GreenAreaSetsScreen />);

    expect(await screen.findByRole('button', { name: 'Eliminar Ingreso Riva-Agüero' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /en el mapa$/ })).not.toBeInTheDocument();
  });
});
