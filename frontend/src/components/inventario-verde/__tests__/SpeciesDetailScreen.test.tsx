import { render, screen, waitFor } from '@testing-library/react';
import { SpeciesDetailScreen } from '../SpeciesDetailScreen';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('SpeciesDetailScreen', () => {
  it('renderiza la información de la especie y la tabla de consulta de ejemplares directamente', async () => {
    // Especie 1 es Palmera Real
    render(<SpeciesDetailScreen speciesId={1} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Palmera Real' })).toBeInTheDocument();
    });

    // NO debe existir selector ni toggle de Cuadrícula / Tabla
    expect(screen.queryByRole('button', { name: /Cuadrícula/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tabla/i })).not.toBeInTheDocument();

    // La tabla de consulta de ejemplares debe renderizarse directamente con sus columnas esenciales
    await waitFor(() => {
      expect(screen.getByText('Foto')).toBeInTheDocument();
      expect(screen.getByText('Referencia / Código')).toBeInTheDocument();
      expect(screen.getByText('Sector / Ubicación')).toBeInTheDocument();
      expect(screen.getByText('Coordenadas (GPS)')).toBeInTheDocument();
    });

    // La columna redundante de acciones "Ver ficha" ha sido retirada del flujo
    expect(screen.queryByRole('button', { name: 'Ver ficha' })).not.toBeInTheDocument();
  });

  it('muestra estado vacío si la especie no existe', async () => {
    render(<SpeciesDetailScreen speciesId={9999} />);

    await waitFor(() => {
      expect(screen.getByText('Especie no encontrada')).toBeInTheDocument();
    });
  });
});
