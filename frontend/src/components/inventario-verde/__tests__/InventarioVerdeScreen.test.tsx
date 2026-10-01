import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventarioVerdeScreen } from '../InventarioVerdeScreen';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { page, palmeraReal, palmeraReina, summary } from '../__fixtures__/inventario';

jest.mock('@/lib/inventario-verde-api', () => ({ inventarioVerdeApi: { summary: jest.fn(), species: jest.fn() } }));

const api = inventarioVerdeApi as jest.Mocked<typeof inventarioVerdeApi>;

beforeEach(() => {
  api.summary.mockResolvedValue(summary);
  api.species.mockImplementation(async ({ search }) =>
    page(search ? [palmeraReina] : [palmeraReal, palmeraReina]),
  );
});

afterEach(() => jest.resetAllMocks());

describe('InventarioVerdeScreen', () => {
  it('muestra los totales del backend y las especies', async () => {
    render(<InventarioVerdeScreen />);

    expect(screen.getByRole('heading', { name: 'Inventario de Especies' })).toBeInTheDocument();
    expect((await screen.findAllByText('965')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Palmera real')).toBeInTheDocument();
  });

  it('busca en el backend, también por los otros nombres', async () => {
    render(<InventarioVerdeScreen />);

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nombre común/i), 'bruja');

    await waitFor(() => expect(api.species).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'bruja', page: 0 })));
    await waitFor(() => expect(screen.queryByText('Palmera real')).not.toBeInTheDocument());
    expect(screen.getByText('Palmera reina')).toBeInTheDocument();
  });
});
