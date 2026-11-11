import { render, screen } from '@testing-library/react';
import { GreenAreaSetsScreen } from '../GreenAreaSetsScreen';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';

jest.mock('@/lib/green-area-sets-api', () => ({ greenAreaSetsApi: { list: jest.fn() } }));

const list = greenAreaSetsApi.list as jest.Mock;

describe('GreenAreaSetsScreen (SPEC-203 §5.2)', () => {
  it('muestra cada conjunto con sus jardines y sus actividades', async () => {
    list.mockResolvedValue([
      { id: 3, name: 'Ingreso Riva-Agüero', description: null, zoneCount: 18, elementCount: 0, version: 0,
        activities: [{ id: 30, label: 'Corte de césped' }] },
      { id: 4, name: 'Antiguo', description: null, zoneCount: 0, elementCount: 0, version: 0, activities: [] },
    ]);

    render(<GreenAreaSetsScreen />);

    expect(await screen.findByText('Ingreso Riva-Agüero')).toBeInTheDocument();
    expect(screen.getByText('18 jardines')).toBeInTheDocument();
    expect(screen.getByText('Corte de césped')).toBeInTheDocument();
    expect(screen.getByText('vacío')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nuevo conjunto' })).toHaveAttribute('href', '/intervenciones/conjuntos/nuevo');
    expect(screen.getByRole('link', { name: /Ingreso Riva-Agüero/ })).toHaveAttribute('href', '/intervenciones/conjuntos/3');
  });

  it('un solo jardín se dice en singular', async () => {
    list.mockResolvedValue([{ id: 5, name: 'Campo', description: null, zoneCount: 1, elementCount: 0, version: 0, activities: [] }]);

    render(<GreenAreaSetsScreen />);

    expect(await screen.findByText('1 jardín')).toBeInTheDocument();
  });

  it('sin conjuntos invita a crear el primero', async () => {
    list.mockResolvedValue([]);

    render(<GreenAreaSetsScreen />);

    expect(await screen.findByText('Todavía no hay conjuntos guardados')).toBeInTheDocument();
  });
});
