import { render, screen, fireEvent } from '@testing-library/react';
import type { Specimen } from '@shared/types';
import { SpecimenTable } from '../SpecimenTable';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockSpecimens: Specimen[] = [
  {
    id: 1,
    speciesId: 1,
    code: 'A332',
    reference: 'p01',
    location: 'Rivagüero',
    latitude: -12.067219,
    longitude: -77.079643,
    photoUrl: null,
    observations: 'En floración activa',
    quantity: 1,
    speciesCommonName: 'Palmera Real',
  },
  {
    id: 2,
    speciesId: 1,
    code: null,
    reference: 'p02',
    location: 'Gastronomía',
    latitude: -12.0673,
    longitude: -77.0797,
    photoUrl: null,
    observations: null,
    quantity: 1,
    speciesCommonName: 'Palmera Real',
  },
];

describe('SpecimenTable', () => {
  it('renderiza las columnas principales, la zona de acciones compacta y los códigos limpios', () => {
    render(
      <SpecimenTable
        specimens={mockSpecimens}
        totalElements={2}
        page={0}
        pageSize={10}
        onPageChange={jest.fn()}
        sortBy="reference"
        sortDirection="asc"
        onSortChange={jest.fn()}
      />
    );

    // Columnas principales y zona de acciones
    expect(screen.getByRole('columnheader', { name: 'Foto' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Referencia \/ Código/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Sector \/ Ubicación/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Coordenadas \(GPS\)/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();

    // No debe existir una columna separada de Observación
    expect(screen.queryByRole('columnheader', { name: 'Observación' })).not.toBeInTheDocument();

    // Datos de fila 1
    expect(screen.getByText('p01')).toBeInTheDocument();
    expect(screen.getByText('Cód. A332')).toBeInTheDocument();
    expect(screen.getByText('Rivagüero')).toBeInTheDocument();

    // Datos de fila 2: Sin código amigable y nunca "null"
    expect(screen.getByText('p02')).toBeInTheDocument();
    expect(screen.getByText('Sin código')).toBeInTheDocument();
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument();

    // Botón de mapa visible permanentemente (2 ejemplares con coordenadas)
    const mapButtons = screen.getAllByRole('button', { name: /Ver ubicación de .* en el mapa/i });
    expect(mapButtons).toHaveLength(2);

    // Indicador discreto de observación contiguo a la acción: SOLO para p01, no para p02
    const obsBadges = screen.getAllByRole('note');
    expect(obsBadges).toHaveLength(1);
    expect(obsBadges[0]).toHaveAttribute('aria-label', 'Observación: En floración activa');
  });

  it('abre el lightbox enfocado exclusivamente en la fotografía al hacer clic en la miniatura', () => {
    render(
      <SpecimenTable
        specimens={mockSpecimens}
        totalElements={2}
        page={0}
        pageSize={10}
        onPageChange={jest.fn()}
        sortBy="reference"
        sortDirection="asc"
        onSortChange={jest.fn()}
      />
    );

    const photoButtons = screen.getAllByRole('button', { name: /Ver fotografía ampliada de/i });
    expect(photoButtons).toHaveLength(2);

    // Clic en la foto del ejemplar p01
    fireEvent.click(photoButtons[0]);

    // Debe abrir el lightbox de imagen
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(/p01\s*·\s*Palmera Real/);
    expect(screen.queryByText('Fotografía de referencia')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar vista previa' })).toBeInTheDocument();

    // Cerrar el modal mediante el botón de cierre
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar vista previa' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
