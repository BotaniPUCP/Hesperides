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
    /** Pliega o despliega con la flecha de la tarjeta. */
    fold: (name: string) => userEvent.click(within(screen.getByRole('listitem', { name })).getByRole('button', { name: new RegExp(`(Plegar|Desplegar) ${name}`) })),
    /** Clic en la tarjeta: pone o quita el foco. */
    focusCard: (name: string) => userEvent.click(within(screen.getByRole('listitem', { name })).getByRole('button', { name })),
    mode: (label: string) => userEvent.click(screen.getByRole('radio', { name: label })),
    showAll: () => userEvent.click(screen.getByRole('checkbox', { name: 'Ver solo lo elegido' })),
  };
}

describe('SetMapPicker', () => {
  describe('ver solo lo elegido', () => {
    it('viene marcado: solo van las tarjetas con algo elegido, y en ellas solo lo elegido', () => {
      const { card } = setup([11], [501]);

      expect(screen.getByRole('checkbox', { name: 'Ver solo lo elegido' })).toBeChecked();
      expect(within(card('Sector 1')).getByText('1 de 2')).toBeInTheDocument();
      expect(within(card('Sector 1')).getByText('1 jardín · 1 ejemplar')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /^Jardín Central/ })).toBeChecked();
      expect(screen.queryByRole('checkbox', { name: /Berma Norte/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('listitem', { name: 'Sector 2' })).not.toBeInTheDocument();
      expect(screen.queryByRole('listitem', { name: 'Fuera de toda sección' })).not.toBeInTheDocument();
    });

    it('al quitar lo último elegido ya no se ve nada', async () => {
      setup([21]);

      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));

      expect(screen.queryByRole('listitem', { name: 'Sector 2' })).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: /Patio Sur/ })).not.toBeInTheDocument();
      expect(screen.getByText(/Todavía no elegiste nada/)).toBeInTheDocument();
    });

    it('desmarcado muestra todos los sectores; plegados salvo los que tienen algo', async () => {
      const { card, showAll } = setup([21]);

      await showAll();

      expect(within(card('Sector 1')).getByRole('button', { name: 'Desplegar Sector 1' })).toHaveAttribute('aria-expanded', 'false');
      expect(within(card('Sector 2')).getByRole('button', { name: 'Plegar Sector 2' })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('checkbox', { name: /Patio Sur/ })).toBeChecked();
    });

    it('con todo a la vista se marca y desmarca en cualquier sector', async () => {
      const { card, fold, mode, showAll, onConfirm } = setup();

      await mode('Ambos');
      await showAll();
      await fold('Sector 1');
      await userEvent.click(screen.getByRole('checkbox', { name: /Berma Norte/ }));
      await userEvent.click(screen.getByRole('checkbox', { name: /Palmera datilera/ }));

      expect(within(card('Sector 1')).getByText('1 jardín · 1 ejemplar')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Confirmar 1 jardín · 1 ejemplar' }));
      expect(onConfirm).toHaveBeenCalledWith([12], [501]);
    });

    it('buscar muestra también lo no elegido, y desde ahí se agrega', async () => {
      setup([11]);

      await userEvent.type(screen.getByRole('searchbox'), 'patio');
      expect(screen.queryByRole('listitem', { name: 'Sector 1' })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));
      await userEvent.clear(screen.getByRole('searchbox'));

      expect(screen.getByRole('checkbox', { name: /Patio Sur/ })).toBeChecked();
      expect(screen.getByText('Elegido: 2 jardines')).toBeInTheDocument();
    });

    it('buscar oculta las tarjetas sin coincidencias', async () => {
      const { mode } = setup();

      await mode('Ejemplares');
      await userEvent.type(screen.getByRole('searchbox'), 'ficus');

      expect(screen.getByRole('checkbox', { name: /Ficus/ })).toBeInTheDocument();
      expect(screen.queryByRole('listitem', { name: 'Sector 1' })).not.toBeInTheDocument();
    });
  });

  describe('tarjetas por sector', () => {
    it('la tarjeta se pliega con su flecha aunque tenga algo elegido', async () => {
      const { card, fold } = setup([11]);

      await fold('Sector 1');

      expect(within(card('Sector 1')).getByRole('button', { name: 'Desplegar Sector 1' })).toHaveAttribute('aria-expanded', 'false');
      expect(within(card('Sector 1')).getByText('1 de 2')).toBeInTheDocument();
    });

    it('marcar en grupo agrega lo del sector y queda desactivado cuando ya está todo', async () => {
      const { card, fold, showAll } = setup();

      await showAll();
      await fold('Sector 1');
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

    it('al elegir algo se ilumina la tarjeta de su sector', async () => {
      const { card, fold, showAll } = setup([11]);

      await showAll();
      await fold('Sector 2');
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));

      expect(card('Sector 2').className).toMatch(/ring-brand-600/);
      expect(card('Sector 1').className).not.toMatch(/ring-brand-600/);
    });
  });

  describe('foco en un sector', () => {
    it('el clic en la tarjeta pone el foco sobre lo elegido y sombrea el sector; otro clic lo quita', async () => {
      const { card, focusCard } = setup([11, 21]);

      await focusCard('Sector 1');
      expect(card('Sector 1')).toHaveAttribute('aria-current', 'true');
      expect(within(card('Sector 1')).getByText('En foco')).toBeInTheDocument();
      expect(within(card('Sector 1')).getByRole('button', { name: 'Sector 1' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('group', { name: 'Recorrer sectores' })).toHaveTextContent('1 de 2 · en foco');

      await focusCard('Sector 1');
      expect(card('Sector 1')).not.toHaveAttribute('aria-current');
      expect(within(card('Sector 1')).queryByText('En foco')).not.toBeInTheDocument();
    });

    it('mover el mapa deja solo el sombreado; otro clic en la tarjeta vuelve a lo elegido', async () => {
      const { card, focusCard } = setup([11, 21]);

      await focusCard('Sector 2');
      fireEvent.wheel(screen.getByRole('region', { name: 'Mapa del campus' }));
      expect(within(card('Sector 2')).getByText('Sombreado')).toBeInTheDocument();
      expect(card('Sector 2').className).toMatch(/border-dashed/);
      expect(screen.getByRole('group', { name: 'Recorrer sectores' })).toHaveTextContent('solo sombreado');

      await focusCard('Sector 2');
      expect(within(card('Sector 2')).getByText('En foco')).toBeInTheDocument();
    });

    it('si se le quita todo al sector en foco, el foco se suelta', async () => {
      const { card, focusCard } = setup([11, 21]);

      await focusCard('Sector 2');
      await userEvent.click(within(card('Sector 2')).getByRole('button', { name: 'Quitar del sector' }));

      expect(screen.queryByRole('listitem', { name: 'Sector 2' })).not.toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Recorrer sectores' })).not.toHaveTextContent('en foco');
    });

    it('avisa, sin impedirlo, al agregar algo de otro sector', async () => {
      const { focusCard } = setup([11]);

      await focusCard('Sector 1');
      await userEvent.type(screen.getByRole('searchbox'), 'patio');
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));

      expect(screen.getByRole('checkbox', { name: /Patio Sur/ })).toBeChecked();
      expect(screen.getByRole('status')).toHaveTextContent('Agregaste algo de Sector 2, fuera de Sector 1');
    });
  });

  describe('recorrer los sectores', () => {
    it('las flechas solo pasan por los sectores con algo elegido, y dan la vuelta', async () => {
      const { mode } = setup([], [501, 502]);
      const nav = () => screen.getByRole('group', { name: 'Recorrer sectores' });
      const next = () => userEvent.click(screen.getByRole('button', { name: 'Sector siguiente' }));

      await mode('Ejemplares');
      expect(nav()).toHaveTextContent('Recorre los 2 sectores con algo elegido');
      await next();
      expect(nav()).toHaveTextContent('Sector 1');
      expect(nav()).toHaveTextContent('1 de 2');
      await next();
      expect(nav()).toHaveTextContent('Fuera de toda sección');
      await next();
      expect(nav()).toHaveTextContent('Sector 1');
      await userEvent.click(screen.getByRole('button', { name: 'Sector anterior' }));
      expect(nav()).toHaveTextContent('Fuera de toda sección');
    });

    it('sin nada elegido las flechas no tienen adónde ir, salvo con todo a la vista', async () => {
      const { showAll } = setup();

      expect(screen.getByRole('button', { name: 'Sector siguiente' })).toBeDisabled();
      await showAll();
      await userEvent.click(screen.getByRole('button', { name: 'Sector siguiente' }));

      expect(screen.getByRole('group', { name: 'Recorrer sectores' })).toHaveTextContent('Sector 1');
    });

    it('ya no hay un desplegable de sectores ni «Ver en el mapa» por tarjeta', () => {
      setup([11, 21]);

      expect(screen.queryByRole('combobox', { name: 'Sector' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ver en el mapa' })).not.toBeInTheDocument();
    });
  });

  describe('qué se elige', () => {
    it('sin nada elegido empieza en Jardines y las tarjetas muestran solo jardines', async () => {
      const { card, showAll } = setup();

      expect(screen.getByRole('radio', { name: 'Jardines' })).toHaveAttribute('aria-checked', 'true');
      await showAll();
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
      expect(screen.getByRole('radiogroup', { name: 'Elegir:' })).toBeInTheDocument();
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
      const { onCancel, fold, showAll } = setup();

      await showAll();
      await fold('Sector 2');
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar y volver' }));
      await userEvent.click(screen.getByRole('button', { name: 'Salir sin guardar' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('con el menú a la vista, un enlace también avisa si hay cambios', async () => {
      const { onCancel, fold, showAll } = setup();
      render(<Link href="/incidencias">Incidencias</Link>);

      await showAll();
      await fold('Sector 2');
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
      const { onCancel, showAll } = setup([21]);

      await showAll();
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));
      await userEvent.click(screen.getByRole('checkbox', { name: /Patio Sur/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar y volver' }));

      expect(onCancel).toHaveBeenCalled();
    });
  });
});
