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

    await userEvent.click(screen.getByRole('button', { name: /Ver las 2 fotos/ }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Ana · CC BY 4.0/)).toBeInTheDocument();
  });

  it('muestra la etiqueta unificada de tipo de vegetación y familia', () => {
    render(<SpeciesInfo species={{ ...palmeraReal, photos: [] }} />);

    expect(screen.getByText('Palmera')).toBeInTheDocument();
    expect(screen.getByText('Fam. Arecaceae')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver las/ })).not.toBeInTheDocument();
  });

  it('muestra las medidas botánicas de referencia y aplicabilidad de fuste y DAP', () => {
    const conMedidas: Species = {
      ...palmeraReal,
      referenceHeightM: 12.5,
      referenceHeightSourceName: 'Catálogo de flora PUCP',
      referenceCrownRadiusM: 3.2,
      referenceCrownRadiusSourceName: 'Literatura botánica',
      usesTrunkHeight: true,
      usesDbh: true,
      extraMeasures: [
        { code: 'STEM_COUNT', label: 'Número de estípites', unitCode: 'UNIT', referenceNote: 'Generalmente 1' },
      ],
    };

    render(<SpeciesInfo species={conMedidas} />);

    expect(screen.getByText('Medidas botánicas de referencia')).toBeInTheDocument();
    expect(screen.getByText('12.5 m')).toBeInTheDocument();
    expect(screen.getByText('Catálogo de flora PUCP')).toBeInTheDocument();
    expect(screen.getByText('3.2 m')).toBeInTheDocument();
    expect(screen.getByText('Literatura botánica')).toBeInTheDocument();
    expect(screen.getAllByText('Aplica medición')).toHaveLength(2);
    expect(screen.getByText('Número de estípites')).toBeInTheDocument();
    expect(screen.getByText(/Generalmente 1/)).toBeInTheDocument();
  });

  it('renderiza correctamente cuando la especie no tiene nombre común (null o vacío)', () => {
    const sinComun: Species = {
      ...palmeraReal,
      commonName: null as unknown as string,
      scientificName: 'Kkkkkk',
    };

    render(<SpeciesInfo species={sinComun} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kkkkkk');
    expect(screen.queryByText('(Kkkkkk)')).not.toBeInTheDocument();
  });

  it('muestra estado vacío claro cuando la especie no tiene ninguna medida configurada', () => {
    const sinMedidas: Species = {
      ...palmeraReal,
      referenceHeightM: null,
      referenceCrownRadiusM: null,
      usesTrunkHeight: false,
      usesDbh: false,
      extraMeasures: [],
    };

    render(<SpeciesInfo species={sinMedidas} />);

    expect(screen.getByText('Medidas botánicas de referencia')).toBeInTheDocument();
    expect(
      screen.getByText('Esta especie no tiene medidas botánicas de referencia ni parámetros dendrométricos configurados.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Altura promedio')).not.toBeInTheDocument();
  });
});
