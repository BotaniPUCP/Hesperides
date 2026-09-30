import { render, screen } from '@testing-library/react';
import type { Species } from '@shared/types';
import { SpeciesCard } from '../SpeciesCard';

const mockSpecies: Species = {
  id: 1,
  commonName: 'Palmera Real',
  scientificName: 'Roystonea regia',
  vegetationTypeCode: 'PALM',
  vegetationTypeName: 'Palmera',
  specimenCount: 164,
  imageUrl: 'https://example.com/palm.jpg',
  family: 'Arecaceae',
};

describe('SpeciesCard', () => {
  it('renderiza nombres, tipo de vegetación y conteo de ejemplares', () => {
    render(<SpeciesCard species={mockSpecies} />);

    expect(screen.getByText('Palmera Real')).toBeInTheDocument();
    expect(screen.getByText('Roystonea regia')).toBeInTheDocument();
    expect(screen.getByText('Palmera')).toBeInTheDocument();
    expect(screen.getByText('164 ejemplares')).toBeInTheDocument();
    expect(screen.getByText('Fam. Arecaceae')).toBeInTheDocument();
  });

  it('enlaza a la pantalla de detalle de la especie', () => {
    render(<SpeciesCard species={mockSpecies} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/inventario-verde/especies/1');
  });

  it('muestra el placeholder si no tiene imageUrl', () => {
    const withoutImg: Species = { ...mockSpecies, imageUrl: null };
    render(<SpeciesCard species={withoutImg} />);

    expect(screen.getByRole('img', { name: 'Palmera Real' })).toBeInTheDocument();
  });
});
