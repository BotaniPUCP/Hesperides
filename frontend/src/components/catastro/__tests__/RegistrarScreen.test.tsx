import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api';
import { catastroApi } from '@/lib/catastro-api';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { RegistrarScreen } from '../registrar/RegistrarScreen';

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/lib/catastro-api', () => ({ catastroApi: { register: jest.fn() } }));
jest.mock('@/lib/inventario-verde-api', () => ({ inventarioVerdeApi: { species: jest.fn() } }));
// El visor 3D no corre en jsdom: un botón hace de clic en el suelo.
jest.mock('../registrar/MapaSelector', () => ({
  MapaSelector: ({ onElegir }: { onElegir: (lat: number, lon: number) => void }) => (
    <button type="button" onClick={() => onElegir(-12.0702001, -77.0810004)}>
      clic en el mapa
    </button>
  ),
}));
jest.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: <T,>(v: T) => v }));

const register = jest.mocked(catastroApi.register);

const MOLLE = {
  slug: 'schinus-molle', scientificName: 'Schinus molle', commonName: 'Molle serrano', otherNames: [],
  family: 'Anacardiaceae', vegetationTypeCode: 'TREE', vegetationTypeName: 'Árbol', specimenCount: 3, imageUrl: null,
};

function pantalla(rol = 'SUPERVISOR') {
  mockUseAuth.mockReturnValue({ user: { role: { code: rol } } });
  render(<RegistrarScreen />);
}

async function elegirMolleYPunto() {
  jest.mocked(inventarioVerdeApi.species).mockResolvedValue({
    content: [MOLLE], page: { number: 0, size: 8, totalElements: 1, totalPages: 1 },
  });
  await userEvent.type(screen.getByLabelText(/Especie/), 'molle');
  await userEvent.click(await screen.findByRole('button', { name: /Schinus molle/ }));
  await userEvent.click(screen.getByRole('button', { name: 'clic en el mapa' }));
}

describe('RegistrarScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('el operario no registra', () => {
    pantalla('OPERARIO');
    expect(screen.queryByRole('button', { name: 'Registrar planta' })).not.toBeInTheDocument();
  });

  it('sin especie ni punto no envía y dice qué falta', async () => {
    pantalla();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar planta' }));

    expect(register).not.toHaveBeenCalled();
    expect(screen.getByText('Elige la especie')).toBeInTheDocument();
  });

  it('el supervisor elige especie y punto en el mapa, y recibe el código (CA-01)', async () => {
    register.mockResolvedValue('EV-000966');
    pantalla();
    await elegirMolleYPunto();

    expect(screen.getByLabelText(/Latitud/)).toHaveValue('-12.070200');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar planta' }));

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ scientificName: 'Schinus molle', lat: -12.0702, lon: -77.081 }),
      null,
      false,
    );
    expect(await screen.findByText('EV-000966')).toBeInTheDocument();
  });

  it('un posible duplicado pregunta y, si es otra planta, reenvía confirmando', async () => {
    register
      .mockRejectedValueOnce(new ApiError(409, 'Possible duplicate of EV-000140', { duplicateOf: 'EV-000140', distanceM: 0.9 }))
      .mockResolvedValueOnce('EV-000967');
    pantalla();
    await elegirMolleYPunto();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar planta' }));

    expect(await screen.findByText('¿Es la misma planta que EV-000140?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Es otra planta: registrar' }));

    expect(register).toHaveBeenLastCalledWith(expect.anything(), null, true);
    expect(await screen.findByText('EV-000967')).toBeInTheDocument();
  });

  it('un rechazo del backend se muestra en español', async () => {
    register.mockRejectedValue(new ApiError(400, 'The point is outside the campus (latitud)'));
    pantalla();
    await elegirMolleYPunto();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar planta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/El punto cae fuera del campus/);
  });
});
