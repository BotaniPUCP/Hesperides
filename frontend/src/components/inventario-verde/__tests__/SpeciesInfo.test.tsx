import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Species } from '@shared/types';
import { SpeciesInfo } from '../SpeciesInfo';
import { palmeraReal } from '../__fixtures__/inventario';

const conFotos: Species = {
  ...palmeraReal,
  imageUrl: '/t1.jpg',
  imageSource: 'SPECIES',
  photos: [
    { thumbnailUrl: '/t1.jpg', imageUrl: '/f1.jpg', author: 'Ana', license: 'CC BY 4.0', sourceUrl: null },
    { thumbnailUrl: '/t2.jpg', imageUrl: '/f2.jpg', author: null, license: null, sourceUrl: null },
  ],
};

describe('SpeciesInfo', () => {
  it('con fotos de especie muestra el contador y abre la galería', async () => {
    render(<SpeciesInfo species={conFotos} />);

    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.queryByText('Foto de un ejemplar')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Ver las 2 fotos/ }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Ana · CC BY 4.0/)).toBeInTheDocument();
  });

  it('sin fotos propias dice que la foto es de un ejemplar y no abre galería', () => {
    render(<SpeciesInfo species={{ ...palmeraReal, imageSource: 'SPECIMEN', photos: [] }} />);

    expect(screen.getByText('Foto de un ejemplar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver las/ })).not.toBeInTheDocument();
  });
});
