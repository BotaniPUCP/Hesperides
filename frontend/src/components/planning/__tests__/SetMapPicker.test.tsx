import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetMapPicker } from '../SetMapPicker';

jest.mock('@/hooks/useMapLayers', () => ({
  useMapLayers: () => ({ data: null, isLoading: false, errorMessage: 'Sin mapa en la prueba', stale: false }),
}));

const sectors = [{ id: 1, code: 'SEC-1', name: 'Sector 1' }, { id: 2, code: 'SEC-2', name: 'Sector 2' }];
const sectionsBySector = {
  1: [{ id: 11, code: 'AV-0011', name: 'Jardín Central' }, { id: 12, code: 'AV-0012', name: 'Berma Norte' }],
  2: [{ id: 21, code: 'AV-0021', name: 'Patio Sur' }],
};
const specimens = [
  { id: 501, code: 'EV-000501', displayName: 'Palmera datilera', typeLabel: 'Palmera', sectionName: 'Jardín Central', sectorId: 1, sectorName: 'Sector 1' },
  { id: 502, code: 'EV-000502', displayName: 'Ficus', typeLabel: 'Árbol', sectionName: null, sectorId: null, sectorName: null },
];

function setup(selectedZoneIds: number[] = [], selectedSpecimenIds: number[] = []) {
  const onConfirm = jest.fn();
  render(<SetMapPicker sectors={sectors} sectionsBySector={sectionsBySector} specimens={specimens}
    selectedZoneIds={selectedZoneIds} selectedSpecimenIds={selectedSpecimenIds} onCancel={jest.fn()} onConfirm={onConfirm} />);
  return { onConfirm, card: (name: string) => screen.getByRole('listitem', { name }) };
}

describe('SetMapPicker', () => {
  it('muestra una tarjeta por sector, con lo elegido de cada uno, y los ejemplares sin sección aparte', () => {
    const { card } = setup([11], [501]);

    expect(within(card('Sector 1')).getAllByText('1 de 2')).toHaveLength(1);
    expect(within(card('Sector 1')).getByText('1 de 1')).toBeInTheDocument();
    expect(within(card('Sector 2')).getByText('0 de 1')).toBeInTheDocument();
    expect(card('Fuera de toda sección')).toBeInTheDocument();
    expect(screen.getByText('Elegido: 1 jardín · 1 ejemplar')).toBeInTheDocument();
  });

  it('al abrir una tarjeta se marcan jardines y ejemplares, y el contador de esa fila cambia', async () => {
    const { card, onConfirm } = setup();

    await userEvent.click(within(card('Sector 1')).getByRole('button', { name: /Sector 1/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Berma Norte/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Palmera datilera/ }));

    expect(within(card('Sector 1')).getByText('1 de 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar 1 jardín · 1 ejemplar' }));
    expect(onConfirm).toHaveBeenCalledWith([12], [501]);
  });

  it('se puede quitar en grupo: un sector entero o todo de una vez', async () => {
    const { card } = setup([11, 12, 21], [501]);

    await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Quitar del sector' }));
    expect(screen.getByText('Elegido: 1 jardín')).toBeInTheDocument();
    expect(within(card('Sector 2')).getByText('1 de 1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Quitar todo' }));
    expect(screen.getByText('Nada elegido todavía')).toBeInTheDocument();
  });

  it('marcar en grupo agrega los jardines del sector', async () => {
    const { card } = setup();

    await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Marcar jardines' }));

    expect(within(card('Sector 1')).getByText('2 de 2')).toBeInTheDocument();
    expect(screen.getByText('Elegido: 2 jardines')).toBeInTheDocument();
    expect(within(card('Sector 1')).getByRole('button', { name: 'Marcar jardines' })).toBeDisabled();
  });

  it('cada tarjeta ofrece marcar solo lo que tiene, sin depender del modo del mapa', async () => {
    const { card } = setup();

    expect(within(card('Fuera de toda sección')).queryByRole('button', { name: 'Marcar jardines' })).not.toBeInTheDocument();
    expect(within(card('Sector 2')).queryByRole('button', { name: 'Marcar ejemplares' })).not.toBeInTheDocument();
    await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Marcar ejemplares' }));

    expect(screen.getByText('Elegido: 1 ejemplar')).toBeInTheDocument();
    expect(within(card('Sector 1')).getByRole('button', { name: 'Quitar del sector' })).toBeEnabled();
  });

  it('buscar abre las tarjetas con coincidencias y oculta las demás', async () => {
    setup();

    await userEvent.type(screen.getByRole('searchbox'), 'ficus');

    expect(screen.getByRole('checkbox', { name: /Ficus/ })).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Sector 2' })).not.toBeInTheDocument();
  });

  it('ver solo lo elegido deja las tarjetas que tienen algo marcado', async () => {
    setup([21]);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Ver solo lo elegido' }));

    expect(screen.getByRole('listitem', { name: 'Sector 2' })).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Sector 1' })).not.toBeInTheDocument();
  });
});
