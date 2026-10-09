import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { PlaceDetail, ReferenceQueuePage } from '@shared/types';
import { placesApi } from '@/lib/places-api';
import { ReferenceMigrationScreen } from '../ReferenceMigrationScreen';

const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  useToast: () => ({ showToast: jest.fn(), dismissAll: jest.fn() }),
}));
jest.mock('@/lib/places-api', () => ({
  placesApi: {
    referenceQueue: jest.fn(), migrationProgress: jest.fn(), linkReferences: jest.fn(), discardReferences: jest.fn(),
    detail: jest.fn(), list: jest.fn(),
  },
}));

const api = placesApi as jest.Mocked<typeof placesApi>;

const queue: ReferenceQueuePage = {
  page: 0, size: 20, totalGroups: 2,
  groups: [
    { name: 'Espalda de civil', category: 'Facultades', referenceCodes: ['REF-0267'], lat: -12.07, lon: -77.08,
      detectedSide: 'BACK', sideUncertain: false,
      suggestions: [{ place: { code: 'LUG-0005', name: 'Ingeniería Civil' }, score: 1.1 }, { place: { code: 'LUG-0006', name: 'Minas' }, score: 0.4 }] },
    { name: 'Pabellón Z', category: 'Pabellones', referenceCodes: ['REF-0010', 'REF-0011', 'REF-0012'], lat: -12.07, lon: -77.08,
      detectedSide: null, sideUncertain: false, suggestions: [] },
  ],
};

const civil = {
  code: 'LUG-0005', name: 'Ingeniería Civil', kind: { code: 'OUTDOOR', label: 'Exterior' },
  perspectives: [
    { id: 41, side: { code: 'FRONT', label: 'Frente' }, displayName: 'Frente de Ingeniería Civil' },
    { id: 42, side: { code: 'BACK', label: 'Espalda' }, displayName: 'Espalda de Ingeniería Civil' },
  ],
} as unknown as PlaceDetail;

beforeEach(() => {
  api.referenceQueue.mockResolvedValue(queue);
  api.migrationProgress.mockResolvedValue({ total: 411, linked: 143, discarded: 8, pending: 260 });
  api.detail.mockResolvedValue(civil);
  api.list.mockResolvedValue([]);
  api.linkReferences.mockResolvedValue(undefined);
  api.discardReferences.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
});

const card = async (name: string) => (await screen.findByRole('heading', { name })).closest('article') as HTMLElement;

describe('ReferenceMigrationScreen', () => {
  it('muestra el avance de la migración', async () => {
    render(<ReferenceMigrationScreen />);

    expect(await screen.findByText('151 de 411 referencias decididas')).toBeInTheDocument();
  });

  it('propone el lugar sugerido y la perspectiva del lado que nombra el texto', async () => {
    render(<ReferenceMigrationScreen />);
    const espalda = await card('Espalda de civil');

    expect(within(espalda).getByRole('radio', { name: /Ingeniería Civil/ })).toBeChecked();
    expect(within(espalda).getByText('Espalda')).toBeInTheDocument();
    await waitFor(() => expect(within(espalda).getByLabelText('Perspectiva')).toHaveValue('42'));
  });

  it('enlaza todas las referencias del grupo al lugar y la perspectiva elegidos', async () => {
    render(<ReferenceMigrationScreen />);
    const espalda = await card('Espalda de civil');
    await waitFor(() => expect(within(espalda).getByLabelText('Perspectiva')).toHaveValue('42'));

    fireEvent.click(within(espalda).getByRole('button', { name: 'Enlazar' }));

    await waitFor(() => expect(api.linkReferences).toHaveBeenCalledWith(['REF-0267'], 'LUG-0005', 42));
    await waitFor(() => expect(api.referenceQueue).toHaveBeenCalledTimes(2));
  });

  it('descarta un grupo entero', async () => {
    render(<ReferenceMigrationScreen />);
    const z = await card('Pabellón Z');

    fireEvent.click(within(z).getByRole('button', { name: 'No es un lugar' }));

    await waitFor(() => expect(api.discardReferences).toHaveBeenCalledWith(['REF-0010', 'REF-0011', 'REF-0012']));
  });

  it('sin sugerencias ofrece crear el lugar con el nombre ya puesto', async () => {
    render(<ReferenceMigrationScreen />);
    const z = await card('Pabellón Z');

    expect(within(z).getByText('×3')).toBeInTheDocument();
    expect(within(z).getByRole('button', { name: 'Enlazar' })).toBeDisabled();
    expect(within(z).getByRole('link', { name: 'Crear lugar' })).toHaveAttribute('href', '/lugares/nuevo?nombre=Pabell%C3%B3n%20Z');
  });

  it('quien no edita el catálogo no puede migrar', () => {
    mockRole.current = 'SUPERVISOR';
    render(<ReferenceMigrationScreen />);

    expect(screen.getByText('Sin permiso')).toBeInTheDocument();
    expect(api.referenceQueue).not.toHaveBeenCalled();
  });
});
