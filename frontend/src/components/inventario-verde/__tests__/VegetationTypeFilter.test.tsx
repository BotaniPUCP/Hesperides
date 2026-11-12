import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VegetationTypeFilter } from '../VegetationTypeFilter';

describe('VegetationTypeFilter - Búsqueda de especies y filtros de tipo', () => {
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

  it('permite escribir en el buscador y llama a onSearchChange', async () => {
    const handleSearchChange = jest.fn();
    render(
      <VegetationTypeFilter
        {...defaultProps}
        searchValue=""
        onSearchChange={handleSearchChange}
      />,
    );

    const input = screen.getByRole('searchbox');
    await userEvent.type(input, 'ficus');
    expect(handleSearchChange).toHaveBeenCalled();
  });

  it('no muestra popovers ni sugerencias de ejemplares directamente en el buscador', () => {
    render(
      <VegetationTypeFilter
        {...defaultProps}
        searchValue="EV-000240"
      />,
    );

    expect(screen.queryByText(/Ejemplares coincidentes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ir directo a la ficha/i)).not.toBeInTheDocument();
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
