import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { CamposMedidasAdicionales } from '../CamposMedidasAdicionales';
import type { MedidaAdicional } from '../medidasEspecie';

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/hooks/useCatalog', () => ({
  useCatalog: () => ({ items: [{ id: 1, code: 'M', label: 'Metro' }, { id: 2, code: 'UNIT', label: 'Unidad' }], isLoading: false }),
}));
jest.mock('@/lib/inventario-verde-api', () => ({
  inventarioVerdeApi: { extraMeasures: jest.fn(), createExtraMeasure: jest.fn() },
}));

const api = jest.mocked(inventarioVerdeApi);
const TALLOS = { code: 'STEM_COUNT', label: 'Número de tallos', unitCode: 'UNIT', referenceNote: null };
const COBERTURA = { code: 'COVERAGE_AREA', label: 'Cobertura', unitCode: 'M2', referenceNote: null };

function Conjunto({ inicial = [] }: { inicial?: MedidaAdicional[] }) {
  const [valores, setValores] = useState(inicial);
  return (
    <>
      <CamposMedidasAdicionales valores={valores} onCambiar={setValores} />
      <output data-testid="estado">{JSON.stringify(valores)}</output>
    </>
  );
}

beforeEach(() => {
  mockUseAuth.mockReturnValue({ user: { role: { code: 'COORDINADOR' } } });
  api.extraMeasures.mockResolvedValue([TALLOS, COBERTURA]);
});
afterEach(() => jest.resetAllMocks());

describe('CamposMedidasAdicionales', () => {
  it('añade una medida del catálogo y permite escribir su referencia', async () => {
    render(<Conjunto />);
    const selector = await screen.findByRole('combobox', { name: 'Añadir medida' });
    await screen.findByRole('option', { name: /Número de tallos/ });

    await userEvent.selectOptions(selector, 'STEM_COUNT');

    const fila = within(screen.getByRole('group', { name: 'Número de tallos' }));
    await userEvent.type(fila.getByLabelText(/Valor de referencia/), '3 tallos');
    expect(screen.getByTestId('estado')).toHaveTextContent('"code":"STEM_COUNT"');
    expect(screen.getByTestId('estado')).toHaveTextContent('"nota":"3 tallos"');
  });

  it('no ofrece una medida ya elegida', async () => {
    render(<Conjunto inicial={[{ code: 'STEM_COUNT', label: 'Número de tallos', unitCode: 'UNIT', nota: '' }]} />);

    await screen.findByRole('option', { name: /Cobertura/ });

    expect(screen.queryByRole('option', { name: /Número de tallos/ })).not.toBeInTheDocument();
  });

  it('quita una medida', async () => {
    render(<Conjunto inicial={[{ code: 'STEM_COUNT', label: 'Número de tallos', unitCode: 'UNIT', nota: '' }]} />);

    await userEvent.click(screen.getByRole('button', { name: 'Quitar Número de tallos' }));

    expect(screen.getByTestId('estado')).toHaveTextContent('[]');
  });

  it('un coordinador crea una medida nueva y queda elegida', async () => {
    api.createExtraMeasure.mockResolvedValue({ code: 'DIAMETRO', label: 'Diámetro', unitCode: 'M', referenceNote: null });
    render(<Conjunto />);

    await userEvent.type(await screen.findByLabelText(/Nueva medida/), 'Diámetro');
    await userEvent.selectOptions(screen.getByLabelText(/Unidad/), 'M');
    await userEvent.click(screen.getByRole('button', { name: 'Crear medida' }));

    await waitFor(() => expect(api.createExtraMeasure).toHaveBeenCalledWith({ label: 'Diámetro', unitCode: 'M' }));
    expect(await screen.findByRole('group', { name: 'Diámetro' })).toBeInTheDocument();
  });

  it('avisa si la medida nueva ya existe', async () => {
    api.createExtraMeasure.mockRejectedValue(new ApiError(409, 'Ya existe la medida «Diámetro»'));
    render(<Conjunto />);

    await userEvent.type(await screen.findByLabelText(/Nueva medida/), 'Diámetro');
    await userEvent.selectOptions(screen.getByLabelText(/Unidad/), 'M');
    await userEvent.click(screen.getByRole('button', { name: 'Crear medida' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe la medida');
  });

  it('un supervisor elige del catálogo, pero no crea medidas', async () => {
    mockUseAuth.mockReturnValue({ user: { role: { code: 'SUPERVISOR' } } });
    render(<Conjunto />);

    await screen.findByRole('combobox', { name: 'Añadir medida' });

    expect(screen.queryByRole('button', { name: 'Crear medida' })).not.toBeInTheDocument();
  });
});
