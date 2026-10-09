import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SpeciesPhoto } from '@shared/types';
import { SpeciesPhotoViewer } from '../SpeciesPhotoViewer';

const foto = (n: number, extra: Partial<SpeciesPhoto> = {}): SpeciesPhoto => ({
  thumbnailUrl: `/t${n}.jpg`,
  imageUrl: `/f${n}.jpg`,
  author: null,
  license: null,
  sourceUrl: null,
  ...extra,
});

const FOTOS = [
  foto(1, { author: 'Ana Pérez', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:A.jpg' }),
  foto(2, { license: 'CC0' }),
  foto(3),
];

describe('SpeciesPhotoViewer', () => {
  it('muestra la foto grande con su crédito y su posición', () => {
    render(<SpeciesPhotoViewer photos={FOTOS} startAt={0} speciesName="Molle" onClose={jest.fn()} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', '/f1.jpg');
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText(/Ana Pérez · CC BY-SA 4.0/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver fuente' })).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:A.jpg',
    );
  });

  it('recorre las fotos con los botones y el teclado, en círculo', async () => {
    render(<SpeciesPhotoViewer photos={FOTOS} startAt={0} speciesName="Molle" onClose={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Foto siguiente' }));
    expect(screen.getByRole('img')).toHaveAttribute('src', '/f2.jpg');
    expect(screen.getByText(/CC0/)).toBeInTheDocument();

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('img')).toHaveAttribute('src', '/f3.jpg');

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('img')).toHaveAttribute('src', '/f1.jpg');

    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('img')).toHaveAttribute('src', '/f3.jpg');
  });

  it('una foto sin crédito no muestra la línea de crédito', () => {
    render(<SpeciesPhotoViewer photos={FOTOS} startAt={2} speciesName="Molle" onClose={jest.fn()} />);

    expect(screen.queryByText(/^Foto:/)).not.toBeInTheDocument();
  });

  it('con una sola foto no hay flechas ni contador', () => {
    render(<SpeciesPhotoViewer photos={[FOTOS[0]]} startAt={0} speciesName="Molle" onClose={jest.fn()} />);

    expect(screen.queryByRole('button', { name: 'Foto siguiente' })).not.toBeInTheDocument();
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
  });

  it('Escape cierra el visor', async () => {
    const onClose = jest.fn();
    render(<SpeciesPhotoViewer photos={FOTOS} startAt={0} speciesName="Molle" onClose={onClose} />);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
