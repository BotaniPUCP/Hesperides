import { render, screen, waitFor } from '@testing-library/react';
import { SpecimenDetailScreen } from '../SpecimenDetailScreen';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('SpecimenDetailScreen', () => {
  it('renderiza la ficha técnica completa del ejemplar', async () => {
    // Ejemplar 1 es p01 de Palmera Real
    render(<SpecimenDetailScreen specimenId={1} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Ejemplar p01/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Ubicación / Sector')).toBeInTheDocument();
    expect(screen.getByText('Coordenadas Geográficas (GPS)')).toBeInTheDocument();
    expect(screen.getByText('Cantidad Censada')).toBeInTheDocument();

    // Validar exclusión de funcionalidades fuera de alcance y etiquetas inventadas
    expect(screen.queryByText(/Google Maps/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Imprimir ficha/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ID Catastral/i)).not.toBeInTheDocument();

    // Validar navegación superior de regreso a la especie
    expect(screen.getByRole('link', { name: /Volver a los ejemplares/i })).toBeInTheDocument();
  });

  it('muestra estado de no encontrado si el ID de ejemplar no existe', async () => {
    render(<SpecimenDetailScreen specimenId={99999} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ejemplar no encontrado' })).toBeInTheDocument();
    });
  });
});
