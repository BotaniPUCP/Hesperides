import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Link from 'next/link';
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
  const onCancel = jest.fn();
  render(<SetMapPicker sectors={sectors} sectionsBySector={sectionsBySector} specimens={specimens}
    selectedZoneIds={selectedZoneIds} selectedSpecimenIds={selectedSpecimenIds} onCancel={onCancel} onConfirm={onConfirm} />);
  return {
    onConfirm, onCancel,
    card: (name: string) => screen.getByRole('listitem', { name }),
    open: (name: string) => userEvent.click(within(screen.getByRole('listitem', { name })).getByRole('button', { name: new RegExp(name) })),
    mode: (label: string) => userEvent.click(screen.getByRole('radio', { name: label })),
  };
}

describe('SetMapPicker', () => {
  describe('tarjetas por sector', () => {
    it('cada sector cuenta lo elegido, y los ejemplares sin sección van aparte', () => {
      const { card } = setup([11], [501]);

      expect(within(card('Sector 1')).getByText('1 de 2')).toBeInTheDocument();
      expect(within(card('Sector 1')).getByText('1 de 1')).toBeInTheDocument();
      expect(within(card('Sector 1')).getByText('1 jardín · 1 ejemplar')).toBeInTheDocument();
      expect(within(card('Sector 2')).getByText('0 de 1')).toBeInTheDocument();
      expect(within(card('Sector 2')).getByText('Nada elegido')).toBeInTheDocument();
      expect(card('Fuera de toda sección')).toBeInTheDocument();
      expect(screen.getByText('Elegido: 1 jardín · 1 ejemplar')).toBeInTheDocument();
    });

    it('empiezan plegadas; solo se abren las que ya tienen algo elegido', () => {
      const { card } = setup([21]);

      expect(within(card('Sector 1')).getByRole('button', { name: /Sector 1/ })).toHaveAttribute('aria-expanded', 'false');
      expect(within(card('Sector 2')).getByRole('button', { name: /Sector 2/ })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.queryByRole('checkbox', { name: /Jardín Central/ })).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Patio Sur/ })).toBeChecked();
    });

    it('al abrir una tarjeta se marcan y desmarcan, y el contador de esa fila cambia', async () => {
      const { card, open, mode, onConfirm } = setup();

      await mode('Ambos');
      await open('Sector 1');
      await userEvent.click(screen.getByRole('checkbox', { name: /Berma Norte/ }));
      await userEvent.click(screen.getByRole('checkbox', { name: /Palmera datilera/ }));

      expect(within(card('Sector 1')).getByText('1 jardín · 1 ejemplar')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Confirmar 1 jardín · 1 ejemplar' }));
      expect(onConfirm).toHaveBeenCalledWith([12], [501]);
    });

    it('la tarjeta se puede plegar a mano aunque tenga algo elegido', async () => {
      const { card, open } = setup([11]);

      await open('Sector 1');

      expect(within(card('Sector 1')).getByRole('button', { name: /Sector 1/ })).toHaveAttribute('aria-expanded', 'false');
      expect(within(card('Sector 1')).getByText('1 de 2')).toBeInTheDocument();
    });

    it('marcar en grupo agrega lo del sector y queda desactivado cuando ya está todo', async () => {
      const { card, open } = setup();

      await open('Sector 1');
      await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Marcar jardines' }));

      expect(within(card('Sector 1')).getByText('2 de 2')).toBeInTheDocument();
      expect(screen.getByText('Elegido: 2 jardines')).toBeInTheDocument();
      expect(within(card('Sector 1')).getByRole('button', { name: 'Marcar jardines' })).toBeDisabled();
    });

    it('se puede quitar en grupo: un sector entero o todo de una vez', async () => {
      const { card } = setup([11, 12, 21], [501]);

      await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Quitar del sector' }));
      expect(screen.getByText('Elegido: 1 jardín')).toBeInTheDocument();
      expect(within(card('Sector 2')).getByText('1 de 1')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Quitar todo' }));
      expect(screen.getByText('Nada elegido todavía')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirmar sin elementos' })).toBeInTheDocument();
    });

    it('buscar abre las tarjetas con coincidencias y oculta las demás', async () => {
      const { mode } = setup();

      await mode('Ejemplares');
      await userEvent.type(screen.getByRole('searchbox'), 'ficus');

      expect(screen.getByRole('checkbox', { name: /Ficus/ })).toBeInTheDocument();
      expect(screen.queryByRole('listitem', { name: 'Sector 1' })).not.toBeInTheDocument();
    });

    it('ver solo lo elegido deja las tarjetas que tienen algo marcado', async () => {
      setup([21]);

      await userEvent.click(screen.getByRole('checkbox', { name: 'Ver solo lo elegido' }));

      expect(screen.getByRole('listitem', { name: 'Sector 2' })).toBeInTheDocument();
      expect(screen.queryByRole('listitem', { name: 'Sector 1' })).not.toBeInTheDocument();
    });
  });

  describe('qué se elige', () => {
    it('sin nada elegido empieza en Jardines y las tarjetas muestran solo jardines', () => {
      const { card } = setup();

      expect(screen.getByRole('radio', { name: 'Jardines' })).toHaveAttribute('aria-checked', 'true');
      expect(within(card('Sector 1')).queryByText('Ejemplares')).not.toBeInTheDocument();
      expect(screen.queryByRole('listitem', { name: 'Fuera de toda sección' })).not.toBeInTheDocument();
    });

    it('un conjunto que ya tiene ejemplares se abre en el modo que le corresponde', () => {
      setup([], [501]);

      expect(screen.getByRole('radio', { name: 'Ejemplares' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.queryByRole('listitem', { name: 'Sector 2' })).not.toBeInTheDocument();
    });

    it('con jardines y ejemplares se abre en Ambos', () => {
      setup([11], [502]);

      expect(screen.getByRole('radio', { name: 'Ambos' })).toHaveAttribute('aria-checked', 'true');
    });

    it('pasar de Ambos a Ejemplares quita los jardines, y se puede deshacer', async () => {
      const { mode } = setup([11, 21], [501]);

      await mode('Ejemplares');

      expect(screen.getByText('Elegido: 1 ejemplar')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Se quitaron 2 jardines al cambiar a Ejemplares.');
      await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
      expect(screen.getByText('Elegido: 2 jardines · 1 ejemplar')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Ambos' })).toHaveAttribute('aria-checked', 'true');
    });

    it('pasar de Ambos a Jardines quita los ejemplares', async () => {
      const { mode, onConfirm } = setup([11], [501, 502]);

      await mode('Jardines');

      expect(screen.getByRole('status')).toHaveTextContent('Se quitaron 2 ejemplares al cambiar a Jardines.');
      await userEvent.click(screen.getByRole('button', { name: 'Confirmar 1 jardín' }));
      expect(onConfirm).toHaveBeenCalledWith([11], []);
    });

    it('pasar de Jardines a Ejemplares también quita los jardines', async () => {
      const { mode } = setup([11]);

      await mode('Ejemplares');

      expect(screen.getByText('Nada elegido todavía')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Se quitó 1 jardín al cambiar a Ejemplares.');
    });

    it('pasar a Ambos no quita nada ni avisa', async () => {
      const { mode } = setup([11]);

      await mode('Ambos');

      expect(screen.getByText('Elegido: 1 jardín')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('el modo se puede cambiar aunque el mapa no esté disponible', () => {
      setup();

      expect(screen.getByText('Mapa 3D no disponible')).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: 'Elegir' })).toBeInTheDocument();
    });
  });

  describe('ver un sector en el mapa', () => {
    it('avisa, sin impedirlo, al agregar algo de otro sector', async () => {
      const { card, open } = setup();

      await open('Sector 1');
      await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Ver en el mapa' }));
      expect(screen.getByText('Viendo Sector 1')).toBeInTheDocument();
      await open('Sector 2');
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));

      expect(screen.getByRole('checkbox', { name: /Patio Sur/ })).toBeChecked();
      expect(screen.getByRole('status')).toHaveTextContent('Agregaste algo de Sector 2, fuera de Sector 1');
    });

    it('acercar o mover el mapa deja de ver el sector y quita el aviso', async () => {
      const { card, open } = setup();

      await open('Sector 1');
      await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Ver en el mapa' }));
      await open('Sector 2');
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));
      fireEvent.wheel(screen.getByRole('region', { name: 'Mapa del campus' }));

      expect(screen.queryByText('Viendo Sector 1')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('muestra lo elegido del sector y, si no hay nada elegido, el sector entero', async () => {
      const { card, open } = setup([21]);

      await userEvent.click(within(card('Sector 2')).getByRole('button', { name: 'Ver en el mapa' }));
      expect(screen.getByText('Viendo lo elegido en Sector 2')).toBeInTheDocument();

      await open('Sector 1');
      await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Ver en el mapa' }));
      expect(screen.getByText('Viendo Sector 1')).toBeInTheDocument();
    });

    it('los ejemplares fuera de toda sección también se pueden ver en el mapa', async () => {
      const { card } = setup([], [502]);

      expect(within(card('Fuera de toda sección')).getByRole('button', { name: 'Ver en el mapa' })).toBeInTheDocument();
    });

    it('se deja de ver con la ✕ o con el mismo botón de la tarjeta', async () => {
      const { card, open } = setup();

      await open('Sector 1');
      await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Ver en el mapa' }));
      await userEvent.click(screen.getByRole('button', { name: 'Dejar de ver Sector 1' }));
      expect(screen.queryByText('Viendo Sector 1')).not.toBeInTheDocument();

      await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Ver en el mapa' }));
      await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Dejar de ver' }));
      expect(screen.queryByText('Viendo Sector 1')).not.toBeInTheDocument();
    });
  });

  describe('cancelar', () => {
    it('sin cambios vuelve sin preguntar', async () => {
      const { onCancel } = setup([11]);

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar y volver' }));

      expect(onCancel).toHaveBeenCalled();
      expect(screen.queryByRole('dialog', { name: 'Cambios sin guardar' })).not.toBeInTheDocument();
    });

    it('con cambios avisa; «Seguir editando» conserva lo elegido', async () => {
      const { onCancel, card } = setup([11]);

      await userEvent.click(within(card('Sector 1')).getByRole('button', { name: 'Quitar del sector' }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar y volver' }));

      expect(screen.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
      expect(onCancel).not.toHaveBeenCalled();
      expect(screen.getByText('Nada elegido todavía')).toBeInTheDocument();
    });

    it('«Salir sin guardar» descarta lo elegido', async () => {
      const { onCancel, open } = setup();

      await open('Sector 2');
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar y volver' }));
      await userEvent.click(screen.getByRole('button', { name: 'Salir sin guardar' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('con el menú a la vista, un enlace también avisa si hay cambios', async () => {
      const { onCancel, open } = setup();
      render(<Link href="/incidencias">Incidencias</Link>);

      await open('Sector 2');
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));
      await userEvent.click(screen.getByRole('link', { name: 'Incidencias' }));

      expect(screen.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
      expect(screen.getByRole('checkbox', { name: /Patio Sur/ })).toBeChecked();
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('va dentro de la pantalla, no como una ventana encima', () => {
      setup();

      expect(screen.getByRole('region', { name: 'Elegir jardines y ejemplares del conjunto' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('volver a dejar lo mismo que al abrir no cuenta como cambio', async () => {
      const { onCancel } = setup([21]);

      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar y volver' }));

      expect(onCancel).toHaveBeenCalled();
    });
  });
});
