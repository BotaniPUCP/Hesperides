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

  it('Riego conserva sus textos (CA-12)', () => {
    render(<IrrigationMapPicker sectors={sectors} sectionsBySector={sectionsBySector} scope="ALL" selectedIds={[11]}
      onCancel={jest.fn()} onConfirm={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Seleccionar secciones de riego · Mapa 3D' })).toBeInTheDocument();
    expect(screen.getByText('Áreas regadas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar selección de 1 secciones' })).toBeInTheDocument();
  });
});
