import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui';
import { catastroApi } from '@/lib/catastro-api';
import { guardarArchivo } from '@/lib/download';
import { EstandaresScreen } from '../EstandaresScreen';
import { ESTANDAR_EJEMPLARES } from '../estandarEjemplares';

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/lib/catastro-api', () => ({ catastroApi: { template: jest.fn(), exportSpecimens: jest.fn() } }));
jest.mock('@/lib/download', () => ({ guardarArchivo: jest.fn() }));

function como(rol: string) {
  mockUseAuth.mockReturnValue({ user: { role: { code: rol } } });
  render(
    <ToastProvider>
      <EstandaresScreen />
    </ToastProvider>,
  );
}

describe('EstandaresScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('las columnas en pantalla son las de la plantilla, en su orden', () => {
    // La plantilla es la misma que sirve el backend (un test del backend lo vigila).
    const plantilla = readFileSync(join(__dirname, '../../../../../docs/estandares/plantillas/ejemplares.csv'), 'utf8');
    const cabecera = plantilla.split(/\r?\n/)[0].split(';');

    expect(ESTANDAR_EJEMPLARES.flatMap((g) => g.columnas.map((c) => c.nombre))).toEqual(cabecera);
  });

  it('marca las tres columnas obligatorias', () => {
    como('SUPERVISOR');
    expect(screen.getAllByText('obligatoria')).toHaveLength(3);
  });

  it('descarga la plantilla', async () => {
    const blob = new Blob(['x']);
    jest.mocked(catastroApi.template).mockResolvedValue(blob);
    como('SUPERVISOR');

    await userEvent.click(screen.getByRole('button', { name: 'Descargar plantilla' }));

    expect(catastroApi.template).toHaveBeenCalledWith('specimens');
    expect(guardarArchivo).toHaveBeenCalledWith(blob, 'plantilla-ejemplares.csv');
  });

  it('el supervisor no ve la exportación; el coordinador sí', () => {
    como('SUPERVISOR');
    expect(screen.queryByRole('button', { name: 'Exportar ejemplares' })).not.toBeInTheDocument();
  });

  it('el coordinador exporta el catastro', async () => {
    jest.mocked(catastroApi.exportSpecimens).mockResolvedValue(new Blob(['x']));
    como('COORDINADOR');

    await userEvent.click(screen.getByRole('button', { name: 'Exportar ejemplares' }));

    expect(guardarArchivo).toHaveBeenCalledWith(expect.any(Blob), 'ejemplares.csv');
  });

  it('un fallo al descargar se avisa en español', async () => {
    const { ApiError } = jest.requireActual('@/lib/api');
    jest.mocked(catastroApi.exportSpecimens).mockRejectedValue(new ApiError(403, 'Access denied'));
    como('COORDINADOR');

    await userEvent.click(screen.getByRole('button', { name: 'Exportar ejemplares' }));

    expect(await screen.findByText('No tienes permisos para esta acción.')).toBeInTheDocument();
  });
});
