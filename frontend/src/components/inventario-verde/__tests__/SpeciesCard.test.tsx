import { render, screen } from '@testing-library/react';
import type { Species } from '@shared/types';
import { SpeciesCard } from '../SpeciesCard';
import { palmeraReal } from '../__fixtures__/inventario';

describe('SpeciesCard', () => {
  it('renderiza nombres, tipo de vegetación, familia y conteo de ejemplares', () => {
    render(<SpeciesCard species={palmeraReal} />);

    expect(screen.getByText('Palmera real')).toBeInTheDocument();
    expect(screen.getByText('Roystonea regia')).toBeInTheDocument();
    expect(screen.getByText('Palmera')).toBeInTheDocument();
    expect(screen.getByText('167 ejemplares')).toBeInTheDocument();
    expect(screen.getByText('Fam. Arecaceae')).toBeInTheDocument();
  });

  it('enlaza a la ficha de la especie por su nombre científico', () => {
    render(<SpeciesCard species={palmeraReal} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/inventario-verde/especies/roystonea-regia');
  });

  it('dice que la foto es de un ejemplar, no una imagen de referencia', () => {
    render(<SpeciesCard species={palmeraReal} />);

    expect(screen.getByText('Foto de un ejemplar')).toBeInTheDocument();
    expect(screen.queryByText(/referencial/i)).not.toBeInTheDocument();
  });

  it('muestra el placeholder si la especie no tiene foto', () => {
    const withoutImg: Species = { ...palmeraReal, imageUrl: null };
    render(<SpeciesCard species={withoutImg} />);

    expect(screen.getByRole('img', { name: 'Palmera real' })).toBeInTheDocument();
  });
});
