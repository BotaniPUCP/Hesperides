import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Species } from '@shared/types';
import { ApiError } from '@/lib/api';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { EdicionEspecieForm } from '../EdicionEspecieForm';
import { palmeraReal } from '../__fixtures__/inventario';

const mockUseAuth = jest.fn();

jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/lib/inventario-verde-api', () => ({ inventarioVerdeApi: { updateSpecies: jest.fn(), extraMeasures: jest.fn() } }));
jest.mock('@/hooks/useCatalog', () => ({
  useCatalog: (type: string) => ({
    items: type === 'SPECIES_TYPE'
      ? [{ id: 1, code: 'PALM', label: 'Palmera' }, { id: 2, code: 'SHRUB', label: 'Arbusto' }]
      : type === 'REFERENCE_VALUE_SOURCE'
        ? [{ id: 3, code: 'BOTANICAL_SHEET', label: 'Ficha botánica' }, { id: 4, code: 'TEAM_ESTIMATE', label: 'Estimación del equipo' }]
        : [],
    isLoading: false,
  }),
}));

const updateSpecies = jest.mocked(inventarioVerdeApi.updateSpecies);
const coordinador = { user: { role: { code: 'COORDINADOR' } } };
const supervisor = { user: { role: { code: 'SUPERVISOR' } } };

function adelfaCritica(): Species {
  return {
    ...palmeraReal,
    slug: 'nerium-oleander',
    scientificName: 'Nerium oleander',
    commonName: 'Adelfa',
    vegetationTypeCode: 'SHRUB',
    vegetationTypeName: 'Arbusto',
    specimenCount: 4,
    unmeasuredSpecimenCount: 3,
  };
}

const guardar = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
const confirmar = () => fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));

beforeEach(() => mockUseAuth.mockReturnValue(coordinador));
afterEach(() => jest.resetAllMocks());

describe('EdicionEspecieForm', () => {
  it('precarga la especie, muestra el mini-resumen de modificaciones y sólo guarda tras confirmar', async () => {
    updateSpecies.mockResolvedValue(adelfaCritica());
    const onSaved = jest.fn();
    render(<EdicionEspecieForm species={adelfaCritica()} onSaved={onSaved} />);

    const comun = screen.getByLabelText(/Nombre común/i);
    expect(comun).toHaveValue('Adelfa');
    await userEvent.clear(comun);
    await userEvent.type(comun, 'Laurel rosa');
    guardar();

    // Modal con mini-resumen de cambios
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Confirmar cambios en la especie')).toBeInTheDocument();
    expect(within(dialog).getByText('1 modificación a registrar:')).toBeInTheDocument();
    expect(within(dialog).getByText('Nombre común')).toBeInTheDocument();
    expect(within(dialog).getByText('Laurel rosa')).toBeInTheDocument();
    expect(updateSpecies).not.toHaveBeenCalled();

    confirmar();

    await waitFor(() => expect(updateSpecies).toHaveBeenCalledWith(
      'nerium-oleander',
      expect.objectContaining({ scientificName: 'Nerium oleander', commonName: 'Laurel rosa', critical: true, vegetationTypeCode: 'SHRUB' }),
    ));
    expect(onSaved).toHaveBeenCalled();
  });

  it('permite revisar datos desde el mini-resumen sin perder los cambios ni llamar a la API', async () => {
    render(<EdicionEspecieForm species={adelfaCritica()} onSaved={jest.fn()} />);

    const comun = screen.getByLabelText(/Nombre común/i);
    await userEvent.clear(comun);
    await userEvent.type(comun, 'Laurel rosa');
    guardar();

    expect(await screen.findByText('Confirmar cambios en la especie')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar datos' }));

    expect(screen.queryByText('Confirmar cambios en la especie')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre común/i)).toHaveValue('Laurel rosa');
    expect(updateSpecies).not.toHaveBeenCalled();
  });

  it('normaliza un nombre de una palabra al editar y conserva el slug de la ficha', async () => {
    updateSpecies.mockResolvedValue(adelfaCritica());
    render(<EdicionEspecieForm species={adelfaCritica()} onSaved={jest.fn()} />);
    const scientificName = screen.getByLabelText(/Nombre científico/i);
    await userEvent.clear(scientificName);
    await userEvent.type(scientificName, 'mANGO');
    guardar();
    confirmar();

    await waitFor(() => expect(updateSpecies).toHaveBeenCalledWith(
      'nerium-oleander', expect.objectContaining({ scientificName: 'Mango' }),
    ));
  });

  it('pasar a no crítica exige el promedio antes de confirmar', async () => {
    render(<EdicionEspecieForm species={adelfaCritica()} onSaved={jest.fn()} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Especie crítica/i }));
    guardar();

    expect(await screen.findByText('Indica la altura promedio')).toBeInTheDocument();
    expect(updateSpecies).not.toHaveBeenCalled();
    expect(screen.queryByText(/pasarán a mostrar el promedio/)).not.toBeInTheDocument();
  });

  it('pasar a no crítica avisa cuántos ejemplares sin medir cambian', async () => {
    updateSpecies.mockResolvedValue(adelfaCritica());
    render(<EdicionEspecieForm species={{
      ...adelfaCritica(), referenceHeightM: 3, referenceHeightSourceCode: 'BOTANICAL_SHEET',
      referenceCrownRadiusM: 1.3, referenceCrownRadiusSourceCode: 'BOTANICAL_SHEET',
    }} onSaved={jest.fn()} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Especie crítica/i }));
    guardar();

    expect(await screen.findByText(/3 ejemplares sin medir pasarán a mostrar el promedio/)).toBeInTheDocument();
    expect(screen.getByText(/dejarán de pedir verificación en campo/)).toBeInTheDocument();
    expect(updateSpecies).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
    await waitFor(() => expect(updateSpecies).toHaveBeenCalledWith(
      'nerium-oleander', expect.objectContaining({ critical: false, referenceHeightM: 3 }),
    ));
  });

  it('pasar a crítica avisa que los ejemplares dejan de mostrar el promedio', async () => {
    render(<EdicionEspecieForm species={{
      ...adelfaCritica(), critical: false, referenceHeightM: 3, referenceHeightSourceCode: 'BOTANICAL_SHEET',
      referenceCrownRadiusM: 1.3, referenceCrownRadiusSourceCode: 'BOTANICAL_SHEET',
    }} onSaved={jest.fn()} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Especie crítica/i }));
    guardar();

    expect(await screen.findByText(/3 ejemplares dejarán de mostrar el promedio y pasarán a Sin medir/)).toBeInTheDocument();
  });

  it('un supervisor ve la criticidad pero no puede cambiarla', () => {
    mockUseAuth.mockReturnValue(supervisor);
    render(<EdicionEspecieForm species={adelfaCritica()} onSaved={jest.fn()} />);

    expect(screen.getByRole('checkbox', { name: /Especie crítica/i })).toBeDisabled();
    expect(screen.getByText(/Solo Administración o Coordinación/)).toBeInTheDocument();
  });

  it('cambiar el tipo no cambia la criticidad y avisa que conviene revisarla', async () => {
    render(<EdicionEspecieForm species={adelfaCritica()} onSaved={jest.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText(/Tipo de vegetación/i), 'PALM');

    expect(screen.getByRole('checkbox', { name: /Especie crítica/i })).toBeChecked();
    expect(screen.getByText(/Cambiaste el tipo; revisa si esta especie debe ser crítica/)).toBeInTheDocument();
  });

  it('el botón de guardar cambios permanece deshabilitado si no hay modificaciones', () => {
    render(<EdicionEspecieForm species={adelfaCritica()} onSaved={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('muestra el conflicto si el nombre ya existe', async () => {
    updateSpecies.mockRejectedValue(new ApiError(409, 'Conflict'));
    render(<EdicionEspecieForm species={adelfaCritica()} onSaved={jest.fn()} />);

    const scientificName = screen.getByLabelText(/Nombre científico/i);
    await userEvent.clear(scientificName);
    await userEvent.type(scientificName, 'Jacaranda mimosifolia');
    guardar();
    confirmar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una especie con este nombre científico');
  });
});
