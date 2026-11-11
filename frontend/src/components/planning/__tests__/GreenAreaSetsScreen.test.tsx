import { render, screen, within } from '@testing-library/react';
import { GreenAreaSetsScreen } from '../GreenAreaSetsScreen';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';

jest.mock('@/lib/green-area-sets-api', () => ({ greenAreaSetsApi: { list: jest.fn() } }));

const list = greenAreaSetsApi.list as jest.Mock;

const set = (over: Record<string, unknown>) => ({ id: 3, name: 'Ingreso Riva-Agüero', description: null, zoneCount: 18,
  elementCount: 0, sectorNames: ['Sector verde 01'], version: 0, updatedAt: '2026-11-10T15:00:00Z',
  activities: [{ id: 30, label: 'Corte de césped' }], ...over });

beforeEach(() => jest.clearAllMocks());

describe('GreenAreaSetsScreen (SPEC-203 §5.2)', () => {
  it('cada tarjeta dice qué contiene, dónde está, qué se planifica y cuándo cambió', async () => {
    list.mockResolvedValue([set({ elementCount: 4, description: 'Bermas del ingreso principal',
      sectorNames: ['Sector verde 01', 'Sector verde 02', 'Sector verde 03', 'Polideportivo'] })]);

    render(<GreenAreaSetsScreen />);

    const card = await screen.findByRole('link', { name: /Ingreso Riva-Agüero/ });
    expect(card).toHaveAttribute('href', '/intervenciones/conjuntos/3');
    expect(within(card).getByText('Bermas del ingreso principal')).toBeInTheDocument();
    expect(within(card).getByText('18 jardines · 4 ejemplares')).toBeInTheDocument();
    expect(within(card).getByText('Sector verde 01, Sector verde 02, Sector verde 03 y 1 más')).toBeInTheDocument();
    expect(within(card).getByText('Actualizado 10/11/2026')).toBeInTheDocument();
    expect(within(card).getByText('Actividades que se planifican')).toBeInTheDocument();
    expect(within(card).getByText('Corte de césped')).toBeInTheDocument();
  });

  it('no muestra cómo va la planificación: eso está en Planificación preventiva', async () => {
    list.mockResolvedValue([set({})]);

    render(<GreenAreaSetsScreen />);

    await screen.findByRole('link', { name: /Ingreso Riva-Agüero/ });
    expect(screen.queryByText(/Lo más urgente|Toca|Aún no toca/)).not.toBeInTheDocument();
  });

  it('un conjunto vacío lo advierte', async () => {
    list.mockResolvedValue([set({ id: 4, name: 'Antiguo', zoneCount: 0, sectorNames: [], activities: [] })]);

    render(<GreenAreaSetsScreen />);

    expect(await screen.findByText('Vacío: sus jardines y ejemplares se dieron de baja')).toBeInTheDocument();
    expect(screen.queryByText('Sector')).not.toBeInTheDocument();
  });

  it('un conjunto de ejemplares sin sección dice que están fuera de toda sección', async () => {
    list.mockResolvedValue([set({ zoneCount: 0, elementCount: 5, sectorNames: [] })]);

    render(<GreenAreaSetsScreen />);

    expect(await screen.findByText('5 ejemplares')).toBeInTheDocument();
    expect(screen.getByText('Fuera de toda sección')).toBeInTheDocument();
  });

  it('sin conjuntos invita a crear el primero', async () => {
    list.mockResolvedValue([]);

    render(<GreenAreaSetsScreen />);

    expect(await screen.findByText('Todavía no hay conjuntos guardados')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nuevo conjunto' })).toHaveAttribute('href', '/intervenciones/conjuntos/nuevo');
  });
});
