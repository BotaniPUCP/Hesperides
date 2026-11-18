import { render, screen, within } from '@testing-library/react';
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
    /** Lleva a un sector con el selector del recorrido. */
    goTo: (name: string) => userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sector' }), name),
  };
}

describe('SetMapPicker', () => {
  describe('tarjetas por sector', () => {
    it('por defecto solo van las tarjetas con algo elegido, y en ellas solo lo elegido', () => {
      const { card } = setup([11], [501]);

      expect(within(card('Sector 1')).getByText('1 de 2')).toBeInTheDocument();
      expect(within(card('Sector 1')).getByText('1 jardín · 1 ejemplar')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /^Jardín Central/ })).toBeChecked();
      expect(screen.queryByRole('checkbox', { name: /Berma Norte/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('listitem', { name: 'Sector 2' })).not.toBeInTheDocument();
      expect(screen.queryByRole('listitem', { name: 'Fuera de toda sección' })).not.toBeInTheDocument();
      expect(screen.getByText('Elegido: 1 jardín · 1 ejemplar')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: 'Ver solo lo elegido' })).not.toBeInTheDocument();
    });

    it('sin nada elegido explica cómo empezar', () => {
      setup();

      expect(screen.getByText(/Todavía no elegiste nada/)).toBeInTheDocument();
      expect(screen.queryByRole('listitem', { name: 'Sector 1' })).not.toBeInTheDocument();
    });

    it('en el sector que se recorre se ve todo lo suyo y se marca y desmarca', async () => {
      const { card, goTo, mode, onConfirm } = setup();

      await mode('Ambos');
      await goTo('Sector 1');
      await userEvent.click(screen.getByRole('checkbox', { name: /Berma Norte/ }));
      await userEvent.click(screen.getByRole('checkbox', { name: /Palmera datilera/ }));

      expect(screen.getByRole('checkbox', { name: /^Jardín Central/ })).not.toBeChecked();
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
      const { card, goTo } = setup();

      await goTo('Sector 1');
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

    it('buscar muestra también lo no elegido, y desde ahí se agrega', async () => {
      setup([11]);

      await userEvent.type(screen.getByRole('searchbox'), 'patio');
      expect(screen.queryByRole('listitem', { name: 'Sector 1' })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));

      await userEvent.clear(screen.getByRole('searchbox'));
      expect(screen.getByRole('checkbox', { name: /Patio Sur/ })).toBeChecked();
      expect(screen.getByRole('listitem', { name: 'Sector 1' })).toBeInTheDocument();
      expect(screen.getByText('Elegido: 2 jardines')).toBeInTheDocument();
    });

    it('buscar oculta las tarjetas sin coincidencias', async () => {
      const { mode } = setup();

      await mode('Ejemplares');
      await userEvent.type(screen.getByRole('searchbox'), 'ficus');

      expect(screen.getByRole('checkbox', { name: /Ficus/ })).toBeInTheDocument();
      expect(screen.queryByRole('listitem', { name: 'Sector 1' })).not.toBeInTheDocument();
    });

    it('quitar lo último elegido no esconde la tarjeta ni el jardín bajo el cursor', async () => {
      const { card } = setup([21]);

      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));

      expect(card('Sector 2')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Patio Sur/ })).not.toBeChecked();
    });

    it('al elegir algo se ilumina la tarjeta de su sector', async () => {
      const { card, goTo } = setup([21]);

      await goTo('Sector 1');
      expect(card('Sector 1').className).toMatch(/ring-2/);
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));

      expect(card('Sector 2').className).toMatch(/ring-2/);
      expect(card('Sector 1').className).not.toMatch(/ring-2/);
    });
  });

  describe('qué se elige', () => {
    it('sin nada elegido empieza en Jardines y las tarjetas muestran solo jardines', async () => {
      const { card, goTo } = setup();

      expect(screen.getByRole('radio', { name: 'Jardines' })).toHaveAttribute('aria-checked', 'true');
      await goTo('Sector 1');
      expect(within(card('Sector 1')).queryByText('Ejemplares')).not.toBeInTheDocument();
      expect(within(screen.getByRole('combobox', { name: 'Sector' })).queryByRole('option', { name: 'Fuera de toda sección' }))
        .not.toBeInTheDocument();
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
      expect(screen.getByRole('radiogroup', { name: 'Elegir:' })).toBeInTheDocument();
    });
  });

  describe('recorrer los sectores', () => {
    it('las flechas pasan de un sector al siguiente y dan la vuelta', async () => {
      const { card } = setup();
      const select = screen.getByRole('combobox', { name: 'Sector' });

      expect(select).toHaveValue('');
      await userEvent.click(screen.getByRole('button', { name: 'Sector siguiente' }));
      expect(select).toHaveDisplayValue('Sector 1');
      expect(screen.getByText(/Sector 1 de 2/)).toBeInTheDocument();
      expect(card('Sector 1')).toHaveAttribute('aria-current', 'true');
      expect(within(card('Sector 1')).getByText('En el mapa')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Sector siguiente' }));
      expect(select).toHaveDisplayValue('Sector 2');
      await userEvent.click(screen.getByRole('button', { name: 'Sector siguiente' }));
      expect(select).toHaveDisplayValue('Sector 1');
      await userEvent.click(screen.getByRole('button', { name: 'Sector anterior' }));
      expect(select).toHaveDisplayValue('Sector 2');
    });

    it('el selector lleva directo a un sector y «Todo el campus» lo suelta', async () => {
      const { goTo } = setup();

      await goTo('Sector 2');
      expect(screen.getByRole('checkbox', { name: /Patio Sur/ })).toBeInTheDocument();
      await goTo('Todo el campus');

      expect(screen.queryByRole('listitem', { name: 'Sector 2' })).not.toBeInTheDocument();
      expect(screen.getByText(/Recorre los sectores con las flechas/)).toBeInTheDocument();
    });

    it('ya no hay «Ver en el mapa» por tarjeta', () => {
      setup([11, 21]);

      expect(screen.queryByRole('button', { name: 'Ver en el mapa' })).not.toBeInTheDocument();
    });

    it('avisa, sin impedirlo, al agregar algo de otro sector', async () => {
      const { goTo } = setup();

      await goTo('Sector 1');
      await userEvent.type(screen.getByRole('searchbox'), 'patio');
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));

      expect(screen.getByRole('checkbox', { name: /Patio Sur/ })).toBeChecked();
      expect(screen.getByRole('status')).toHaveTextContent('Agregaste algo de Sector 2, fuera de Sector 1');
    });

    it('con ejemplares, los que están fuera de toda sección también se recorren', async () => {
      const { mode } = setup();

      await mode('Ejemplares');

      expect(within(screen.getByRole('combobox', { name: 'Sector' })).getByRole('option', { name: 'Fuera de toda sección' }))
        .toBeInTheDocument();
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
      const { onCancel, goTo } = setup();

      await goTo('Sector 2');
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar y volver' }));
      await userEvent.click(screen.getByRole('button', { name: 'Salir sin guardar' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('con el menú a la vista, un enlace también avisa si hay cambios', async () => {
      const { onCancel, goTo } = setup();
      render(<Link href="/incidencias">Incidencias</Link>);

      await goTo('Sector 2');
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
