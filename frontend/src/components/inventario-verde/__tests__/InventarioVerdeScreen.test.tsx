import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventarioVerdeScreen } from '../InventarioVerdeScreen';

describe('InventarioVerdeScreen', () => {
  it('renderiza el título, las estadísticas y la barra de búsqueda', async () => {
    render(<InventarioVerdeScreen />);

    expect(screen.getByRole('heading', { name: 'Inventario de Especies' })).toBeInTheDocument();
    expect(screen.getByText('Especies Registradas')).toBeInTheDocument();
    expect(screen.getByText('Ejemplares Censados')).toBeInTheDocument();
    expect(screen.getByText('Tipos de Vegetación')).toBeInTheDocument();
    expect(screen.getByText('Filtrar por tipo de vegetación')).toBeInTheDocument();
    expect(screen.queryByText(/porte botánico/i)).not.toBeInTheDocument();

    // Esperar a que se carguen las especies iniciales del mock
    await waitFor(() => {
      expect(screen.getByText('Palmera Real')).toBeInTheDocument();
    });
  });

  it('permite filtrar por término de búsqueda', async () => {
    render(<InventarioVerdeScreen />);

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre común/i);
    await userEvent.type(searchInput, 'Ponciana');

    await waitFor(
      () => {
        expect(screen.getByText('Ponciana')).toBeInTheDocument();
        expect(screen.queryByText('Palmera Real')).not.toBeInTheDocument();
      },
      { timeout: 2500 }
    );
  });
});
