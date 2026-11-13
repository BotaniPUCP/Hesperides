import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GreenAreaSetForm } from '../GreenAreaSetForm';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { ApiError } from '@/lib/api';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/green-area-sets-api', () => ({
  greenAreaSetsApi: { get: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(),
    elementOptions: jest.fn().mockResolvedValue([
      { id: 501, code: 'EV-000501', displayName: 'Palmera datilera', typeLabel: 'Palmera', sectionName: 'Jardín Central', sectorId: 1, sectorName: 'Sector 1' },
      { id: 502, code: 'EV-000502', displayName: 'Ficus', typeLabel: 'Árbol', sectionName: null, sectorId: null, sectorName: null }]) },
}));
jest.mock('@/lib/irrigation-api', () => ({
  irrigationApi: {
    sectors: jest.fn().mockResolvedValue([{ id: 1, code: 'SEC-1', name: 'Sector 1' }]),
    sections: jest.fn().mockResolvedValue([{ id: 11, code: 'AV-0011', name: 'Jardín Central' }]),
  },
}));
jest.mock('../SetMapPicker', () => ({
  SetMapPicker: ({ onConfirm, onCancel }: { onConfirm: (ids: number[], specimenIds: number[]) => void; onCancel: () => void }) => <>
    <button type="button" onClick={onCancel}>Cancelar mapa</button>
    <button type="button" onClick={() => onConfirm([11], [])}>Confirmar mapa</button>
    <button type="button" onClick={() => onConfirm([11], [501, 502])}>Confirmar con ejemplares</button>
  </>,
}));
const mockSetMap = jest.fn();
jest.mock('../SetMap', () => ({
  SetMap: (props: { zoneCodes: string[]; specimenCodes: string[] }) => { mockSetMap(props); return <div data-testid="mapa-del-conjunto" />; },
}));

const api = greenAreaSetsApi as unknown as Record<string, jest.Mock>;
/** La parte de lo elegido: se resume en la insignia de su encabezado. */
const contents = () => within(screen.getByRole('region', { name: 'Jardines y ejemplares' }));

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/intervenciones/conjuntos/nuevo');
});

/** Un conjunto nuevo empieza en el mapa: se confirma y luego se completa el resto. */
async function fillAndPick() {
  await userEvent.click(await screen.findByRole('button', { name: 'Confirmar mapa' }));
  await userEvent.type(screen.getByLabelText(/^Nombre/), 'Pabellones');
}

/** Cierra el mapa con que abre un conjunto nuevo, sin elegir nada. */
const skipMap = async () => userEvent.click(await screen.findByRole('button', { name: 'Cancelar mapa' }));

const existing = (over: Record<string, unknown> = {}) => ({ id: 3, name: 'Pabellones', description: null, version: 0,
  zones: [], elements: [], warnings: [], ...over });

describe('GreenAreaSetForm (SPEC-203 §5.2)', () => {
  it('exige nombre y al menos un jardín o ejemplar antes de llamar al servidor', async () => {
    render(<GreenAreaSetForm />);
    await skipMap();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar conjunto' }));

    expect(await screen.findByText('Ponle un nombre y elige al menos un jardín o un ejemplar.')).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('un conjunto ya no lleva actividades: se asignan en Planificación', async () => {
    render(<GreenAreaSetForm />);
    await skipMap();

    expect(screen.queryByText(/Actividades que se planifican/)).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('crea el conjunto con los jardines del mapa y vuelve a la lista', async () => {
    api.create.mockResolvedValue({ id: 9, warnings: [] });
    render(<GreenAreaSetForm />);

    await fillAndPick();
    expect(contents().getAllByText('1 jardín')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar jardines y ejemplares' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar conjunto' }));

    expect(api.create).toHaveBeenCalledWith({ name: 'Pabellones', description: null, zoneIds: [11], elementIds: [] });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/intervenciones/conjuntos'));
  });

  it('muestra los avisos del servidor y no se va de la pantalla', async () => {
    api.create.mockResolvedValue({ id: 9, warnings: ['Un aviso del servidor'] });
    render(<GreenAreaSetForm />);

    await fillAndPick();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar conjunto' }));

    expect(await screen.findByText('Un aviso del servidor')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    // Ya se guardó: no se ofrece guardar otra vez, que daría 409 o «nombre repetido».
    expect(screen.queryByRole('button', { name: 'Guardar conjunto' })).not.toBeInTheDocument();
  });

  it('al editar con una versión vieja explica el conflicto', async () => {
    api.get.mockResolvedValue(existing({ version: 2,
      zones: [{ id: 11, code: 'AV-0011', name: 'Jardín Central', displayName: 'Jardín Central', landscapeCode: null, sectorName: null }] }));
    api.update.mockRejectedValue(new ApiError(409, 'Otra persona cambió este conjunto. Recarga para ver su versión.'));
    render(<GreenAreaSetForm setId={3} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Guardar conjunto' }));

    expect(api.update).toHaveBeenCalledWith(3, expect.objectContaining({ version: 2, zoneIds: [11] }));
    expect(await screen.findByText('Otra persona cambió este conjunto mientras lo editabas. Recarga para ver su versión.')).toBeInTheDocument();
  });

  it('lo elegido se resume por tipo: los jardines y los ejemplares de cada tipo, sin sectores', async () => {
    api.create.mockResolvedValue({ id: 9, warnings: [] });
    render(<GreenAreaSetForm />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar con ejemplares' }));

    expect(contents().getAllByText('1 jardín · 2 ejemplares')[0]).toBeInTheDocument();
    expect(contents().getByText('Jardines')).toBeInTheDocument();
    expect(contents().getByText('Palmera')).toBeInTheDocument();
    expect(contents().getByText('Árbol')).toBeInTheDocument();
    expect(contents().getByText('EV-000501 · Palmera datilera')).toBeInTheDocument();
    expect(contents().queryByText('Sector 1')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Mixto');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar conjunto' }));
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ zoneIds: [11], elementIds: [501, 502] }));
  });

  it('«Ver en el mapa» muestra el conjunto con lo elegido', async () => {
    render(<GreenAreaSetForm />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar con ejemplares' }));

    await userEvent.click(screen.getByRole('button', { name: 'Ver en el mapa' }));

    expect(screen.getByTestId('mapa-del-conjunto')).toBeInTheDocument();
    expect(mockSetMap).toHaveBeenLastCalledWith({ zoneCodes: ['AV-0011'], specimenCodes: ['EV-000501', 'EV-000502'], className: 'h-full' });
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar mapa' }));
    expect(screen.queryByTestId('mapa-del-conjunto')).not.toBeInTheDocument();
  });

  it('llegar con #mapa (desde la lista) abre el mapa de entrada', async () => {
    window.history.replaceState(null, '', '/intervenciones/conjuntos/3#mapa');
    api.get.mockResolvedValue(existing({
      zones: [{ id: 11, code: 'AV-0011', name: 'Jardín Central', displayName: 'Jardín Central', landscapeCode: null, sectorName: null }] }));
    render(<GreenAreaSetForm setId={3} />);

    expect(await screen.findByTestId('mapa-del-conjunto')).toBeInTheDocument();
  });

  it('mientras se elige en el mapa el formulario se oculta, y lo escrito se conserva', async () => {
    render(<GreenAreaSetForm />);
    await fillAndPick();

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar jardines y ejemplares' }));
    expect(screen.queryByLabelText(/^Nombre/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar mapa' }));
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Pabellones');
  });

  it('al editar un conjunto no abre el selector por su cuenta', async () => {
    api.get.mockResolvedValue(existing());
    render(<GreenAreaSetForm setId={3} />);

    await screen.findByRole('button', { name: 'Guardar conjunto' });
    expect(screen.queryByRole('button', { name: 'Confirmar mapa' })).not.toBeInTheDocument();
  });

  it('el título dice qué se hace, sin repetir el nombre que se pide abajo', async () => {
    api.get.mockResolvedValue(existing());
    render(<GreenAreaSetForm setId={3} />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Editar conjunto de áreas verdes' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pabellones' })).not.toBeInTheDocument();
  });

  it('los botones van donde en el resto del sistema: eliminar a la izquierda, cancelar y guardar a la derecha', async () => {
    api.get.mockResolvedValue(existing());
    render(<GreenAreaSetForm setId={3} />);

    const save = await screen.findByRole('button', { name: 'Guardar conjunto' });
    const row = save.parentElement as HTMLElement;
    expect(within(row).getAllByRole('button').map((b) => b.textContent)).toEqual(['Eliminar conjunto', 'Cancelar', 'Guardar conjunto']);
    expect(within(screen.getByRole('region', { name: 'Datos del conjunto' })).getByRole('button', { name: 'Guardar conjunto' })).toBe(save);

    await userEvent.click(within(row).getByRole('button', { name: 'Cancelar' }));
    expect(mockPush).toHaveBeenCalledWith('/intervenciones/conjuntos');
  });

  it('cambiar lo elegido y solo mirarlo en el mapa son botones distintos', async () => {
    render(<GreenAreaSetForm />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar con ejemplares' }));

    expect(screen.getByRole('button', { name: 'Cambiar jardines y ejemplares' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver en el mapa' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cambiar en el mapa/ })).not.toBeInTheDocument();
  });

  it('las partes del formulario tienen título', async () => {
    render(<GreenAreaSetForm />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar mapa' }));

    expect(screen.getByRole('heading', { name: 'Jardines y ejemplares' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Datos del conjunto' })).toBeInTheDocument();
  });

  it('eliminar pide confirmación en una ventana del sistema', async () => {
    api.get.mockResolvedValue(existing());
    api.remove.mockResolvedValue(null);
    render(<GreenAreaSetForm setId={3} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar conjunto' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Eliminar conjunto' }));
    expect(dialog.getByText(/Sus planificaciones se eliminan/)).toBeInTheDocument();
    expect(api.remove).not.toHaveBeenCalled();
    await userEvent.click(dialog.getByRole('button', { name: 'Eliminar' }));

    expect(api.remove).toHaveBeenCalledWith(3);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/intervenciones/conjuntos'));
  });

  it('cancelar la confirmación no elimina nada', async () => {
    api.get.mockResolvedValue(existing());
    render(<GreenAreaSetForm setId={3} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar conjunto' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(api.remove).not.toHaveBeenCalled();
  });
});
