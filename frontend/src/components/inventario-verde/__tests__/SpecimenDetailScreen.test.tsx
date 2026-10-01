import { render, screen } from '@testing-library/react';
import { SpecimenDetailScreen } from '../SpecimenDetailScreen';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { ApiError } from '@/lib/api';
import { p01Detail } from '../__fixtures__/inventario';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/inventario-verde-api', () => ({ inventarioVerdeApi: { specimen: jest.fn() } }));

const api = inventarioVerdeApi as jest.Mocked<typeof inventarioVerdeApi>;

afterEach(() => jest.resetAllMocks());

describe('SpecimenDetailScreen', () => {
  it('muestra la ficha con su sección, su origen en el catastro y sus medidas', async () => {
    api.specimen.mockResolvedValue(p01Detail);

    render(<SpecimenDetailScreen code="EV-000001" />);

    expect(await screen.findByRole('heading', { name: 'EV-000001' })).toBeInTheDocument();
    expect(screen.getByText('D 3 (AV-0312)')).toBeInTheDocument();
    expect(screen.getByText('p01')).toBeInTheDocument();
    expect(screen.getByText('Medido en campo')).toBeInTheDocument();
    expect(screen.getByText(/^7[.,]5 m$/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a los ejemplares/i })).toHaveAttribute(
      'href',
      '/inventario-verde/especies/roystonea-regia',
    );
  });

  it('un ejemplar sin medir no muestra alturas y lo dice', async () => {
    api.specimen.mockResolvedValue({
      ...p01Detail, dataSource: 'UNKNOWN', heightM: null, trunkHeightM: null, dbhCm: null, crownRadiusM: null,
      isBanded: null, section: null,
    });

    render(<SpecimenDetailScreen code="EV-000458" />);

    expect(await screen.findByText('Sin medir')).toBeInTheDocument();
    expect(screen.getByText(/Nadie ha medido este ejemplar/)).toBeInTheDocument();
    expect(screen.getByText('Fuera de las áreas verdes')).toBeInTheDocument();
  });

  it('muestra «no encontrado» si el código no existe', async () => {
    api.specimen.mockRejectedValue(new ApiError(404, 'Specimen not found'));

    render(<SpecimenDetailScreen code="EV-999999" />);

    expect(await screen.findByRole('heading', { name: 'Ejemplar no encontrado' })).toBeInTheDocument();
  });
});
