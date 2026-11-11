import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectionMapPicker } from '../SectionMapPicker';
import { IrrigationMapPicker } from '@/components/irrigation/IrrigationMapPicker';

jest.mock('@/hooks/useMapLayers', () => ({
  useMapLayers: () => ({ data: null, isLoading: false, errorMessage: 'Sin mapa en la prueba', stale: false }),
}));

const sectors = [{ id: 1, code: 'SEC-1', name: 'Sector 1' }];
const sectionsBySector = {
  1: [
    { id: 11, code: 'AV-0011', name: 'Jardín Central' },
    { id: 12, code: 'AV-0012', name: 'Berma Norte' },
  ],
};
const texts = {
  title: 'Elegir jardines del conjunto',
  description: 'Selecciona los jardines que forman el conjunto.',
  listTitle: 'Jardines del conjunto',
  confirmAllPrompt: (n: number) => `¿Agregar ${n} jardines?`,
};

describe('SectionMapPicker (SPEC-203 §5.2)', () => {
  it('confirma los jardines marcados en la lista, que siempre coincide con el mapa', async () => {
    const onConfirm = jest.fn();
    render(<SectionMapPicker sectors={sectors} sectionsBySector={sectionsBySector} scope="ALL" selectedIds={[]}
      onCancel={jest.fn()} onConfirm={onConfirm} texts={texts} />);

    await userEvent.click(screen.getByRole('checkbox', { name: /Jardín Central/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Berma Norte/ }));
    await userEvent.click(screen.getByRole('button', { name: /Confirmar selección de 2/ }));

    expect(onConfirm).toHaveBeenCalledWith([11, 12]);
    expect(screen.getByRole('heading', { name: 'Elegir jardines del conjunto' })).toBeInTheDocument();
  });

  it('el buscador filtra la lista por nombre', async () => {
    render(<SectionMapPicker sectors={sectors} sectionsBySector={sectionsBySector} scope="ALL" selectedIds={[]}
      onCancel={jest.fn()} onConfirm={jest.fn()} texts={texts} />);

    await userEvent.type(screen.getByRole('searchbox'), 'berma');

    expect(screen.queryByRole('checkbox', { name: /Jardín Central/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Berma Norte/ })).toBeInTheDocument();
  });

  it('con ejemplares, elige entre jardines y ejemplares y confirma ambos', async () => {
    const onConfirm = jest.fn();
    const options = [
      { id: 501, code: 'EV-000501', displayName: 'Palmera datilera', typeLabel: 'Palmera', sectionName: 'Jardín Central', sectorId: 1, sectorName: 'Sector 1' },
      { id: 502, code: 'EV-000502', displayName: 'Ficus', typeLabel: 'Árbol', sectionName: null, sectorId: null, sectorName: null },
    ];
    render(<SectionMapPicker sectors={sectors} sectionsBySector={sectionsBySector} scope="ALL" selectedIds={[11]}
      onCancel={jest.fn()} onConfirm={onConfirm} texts={texts} specimens={{ options, selectedIds: [] }} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Ejemplares' }));
    expect(screen.queryByRole('checkbox', { name: /Berma Norte/ })).not.toBeInTheDocument();
    expect(screen.getByText(/fuera de toda sección/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: /Palmera datilera/ }));

    await userEvent.click(screen.getByRole('radio', { name: 'Ambos' }));
    expect(screen.getByRole('tab', { name: 'Ejemplares (1)' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar 1 jardines y 1 ejemplares' }));

    expect(onConfirm).toHaveBeenCalledWith([11], [501]);
  });

  it('Riego conserva sus textos (CA-12)', () => {
    render(<IrrigationMapPicker sectors={sectors} sectionsBySector={sectionsBySector} scope="ALL" selectedIds={[11]}
      onCancel={jest.fn()} onConfirm={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Seleccionar secciones de riego · Mapa 3D' })).toBeInTheDocument();
    expect(screen.getByText('Áreas regadas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar selección de 1 secciones' })).toBeInTheDocument();
  });
});
