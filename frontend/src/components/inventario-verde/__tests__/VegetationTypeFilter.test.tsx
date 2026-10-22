import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VegetationTypeFilter } from '../VegetationTypeFilter';

jest.mock('@/lib/inventario-verde-api', () => ({
  inventarioVerdeApi: {
    species: jest.fn().mockResolvedValue({ content: [], totalElements: 0 }),
    specimen: jest.fn().mockResolvedValue(null),
  },
}));

describe('VegetationTypeFilter - Búsqueda predictiva unificada', () => {
  const defaultProps = {
    types: [
      { code: 'ARBOL', label: 'Árbol', count: 50 },
      { code: 'PALMERA', label: 'Palmera', count: 20 },
    ],
    selectedType: 'ALL',
    onSelectType: jest.fn(),
    totalAllCount: 70,
    searchValue: '',
    onSearchChange: jest.fn(),
  };

  it('el input de búsqueda tiene autocomplete="off" para evitar desplegables del navegador', () => {
    render(<VegetationTypeFilter {...defaultProps} />);
    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('autocomplete', 'off');
  });

  it('permite buscar ejemplares desde la primera letra "E" y muestra hasta 10 en orden', async () => {
    const handleSearchChange = jest.fn();
    const { rerender } = render(
      <VegetationTypeFilter
        {...defaultProps}
        searchValue="E"
        onSearchChange={handleSearchChange}
      />,
    );

    expect(screen.getByText(/Ejemplares coincidentes/i)).toBeInTheDocument();
    expect(screen.getByText('EV-000001')).toBeInTheDocument();
    expect(screen.getByText('EV-000010')).toBeInTheDocument();

    // No debe exceder el límite de 10
    expect(screen.queryByText('EV-000011')).not.toBeInTheDocument();
  });

  it('encuentra el ejemplar por su referencia de campo (ej. "A231")', async () => {
    render(
      <VegetationTypeFilter
        {...defaultProps}
        searchValue="A231"
        onSearchChange={jest.fn()}
      />,
    );

    expect(screen.getByText('EV-000240')).toBeInTheDocument();
    expect(screen.getByText('Ref: A231')).toBeInTheDocument();
    expect(screen.getByText('Buganvilla')).toBeInTheDocument();
  });

  it('encuentra el ejemplar por su código legacy / placa antigua (ej. "959")', async () => {
    render(
      <VegetationTypeFilter
        {...defaultProps}
        searchValue="959"
        onSearchChange={jest.fn()}
      />,
    );

    expect(screen.getByText('EV-000243')).toBeInTheDocument();
    expect(screen.getByText('Placa: 959')).toBeInTheDocument();
  });

  it('permite seleccionar chips de tipo de vegetación', async () => {
    const handleSelectType = jest.fn();
    render(
      <VegetationTypeFilter
        {...defaultProps}
        onSelectType={handleSelectType}
      />,
    );

    const arbolChip = screen.getByRole('tab', { name: /Árbol/i });
    await userEvent.click(arbolChip);
    expect(handleSelectType).toHaveBeenCalledWith('ARBOL');
  });
});
