import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CatalogItem, CatalogTypeDetail } from '@shared/types';
import { ToastProvider } from '@/components/ui';
import { __resetCatalogCache } from '@/hooks/useCatalog';
import { ApiError } from '@/lib/api';
import { catalogsApi } from '@/lib/catalogs-api';
import { CatalogsAdminScreen } from '../CatalogsAdminScreen';

jest.mock('@/lib/catalogs-api');

const api = catalogsApi as jest.Mocked<typeof catalogsApi>;

function item(
  code: string,
  label: string,
  parentCode: string | null = null,
  isActive = true,
  metadata?: Record<string, unknown>,
): CatalogItem {
  return { code, label, sortOrder: 1, isActive, parentCode, metadata };
}

const ROLES: CatalogTypeDetail = {
  code: 'ROLE',
  name: 'Roles del sistema',
  description: 'Roles asignables a los usuarios',
  isSystem: true,
  items: [item('ADMIN', 'Administrador'), item('USER', 'Usuario', null, false)],
};

const TIPOS_INTERVENCION: CatalogTypeDetail = {
  code: 'INTERVENTION_TYPE',
  name: 'Tipos de intervención',
  isSystem: false,
  items: [
    item('PODA_SANITARIA', 'Poda sanitaria', 'PODA'),
    item('CANTEO', 'Canteo', 'MANTENIMIENTO'),
    item('MONITOREO_PLAGAS', 'Monitoreo de plagas', 'FITOSANITARIO', true, {
      provisional: true,
    }),
  ],
};

const ZONAS_VACIO: CatalogTypeDetail = {
  code: 'ZONE_TYPE',
  name: 'Tipos de zona',
  isSystem: false,
  items: [],
};

function renderPantalla() {
  return render(
    <ToastProvider>
      <CatalogsAdminScreen />
    </ToastProvider>,
  );
}

describe('CatalogsAdminScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetCatalogCache();

    api.allTypes.mockResolvedValue([
      { code: 'ROLE', name: 'Roles del sistema', isSystem: true },
      { code: 'INTERVENTION_TYPE', name: 'Tipos de intervención', isSystem: false },
      { code: 'ZONE_TYPE', name: 'Tipos de zona', isSystem: false },
    ]);
    api.activeItems.mockImplementation(async (typeCode: string) =>
      typeCode === 'INTERVENTION_CLASS'
        ? [
            item('PODA', 'Poda'),
            item('MANTENIMIENTO', 'Mantenimiento de jardines'),
            item('FITOSANITARIO', 'Manejo fitosanitario'),
          ]
        : [],
    );
    api.typeDetail.mockImplementation(async (typeCode: string) => {
      if (typeCode === 'ROLE') return ROLES;
      if (typeCode === 'INTERVENTION_TYPE') return TIPOS_INTERVENCION;
      return ZONAS_VACIO;
    });
  });

  it('lista los catálogos disponibles', async () => {
    renderPantalla();

    expect(await screen.findByRole('button', { name: /roles del sistema/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tipos de zona/i })).toBeInTheDocument();
  });

  it('al elegir un catálogo muestra sus ítems, activos e inactivos', async () => {
    renderPantalla();

    await userEvent.click(await screen.findByRole('button', { name: /roles del sistema/i }));

    expect(await screen.findByText('Administrador')).toBeInTheDocument();
    // El inactivo se ve aquí aunque no se ofrezca en los desplegables.
    expect(screen.getByText('Usuario')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('agrupa por clase cuando el catálogo es jerárquico', async () => {
    renderPantalla();

    await userEvent.click(await screen.findByRole('button', { name: /tipos de intervención/i }));

    // Los grupos se encabezan con la etiqueta de la clase, no con su code: los
    // items solo traen parentCode, asi que la etiqueta sale del catalogo padre.
    expect(await screen.findByText('Poda')).toBeInTheDocument();
    expect(screen.getByText('Mantenimiento de jardines')).toBeInTheDocument();
    expect(screen.getByText('Poda sanitaria')).toBeInTheDocument();
  });

  it('marca los tipos preliminares', async () => {
    renderPantalla();

    await userEvent.click(await screen.findByRole('button', { name: /tipos de intervención/i }));

    expect(await screen.findByText('Preliminar')).toBeInTheDocument();
  });

  it('un catálogo vacío invita a crear el primer ítem', async () => {
    // Es la vía prevista para llenar los que el spec deja pendientes del cliente.
    renderPantalla();

    await userEvent.click(await screen.findByRole('button', { name: /tipos de zona/i }));

    expect(await screen.findByText(/aún no tiene opciones/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear el primer ítem/i })).toBeInTheDocument();
  });

  it('crea un ítem y refresca el detalle', async () => {
    api.createItem.mockResolvedValue(item('NUEVO', 'Nuevo tipo'));
    renderPantalla();

    await userEvent.click(await screen.findByRole('button', { name: /tipos de zona/i }));
    await userEvent.click(await screen.findByRole('button', { name: /crear el primer ítem/i }));

    const dialogo = await screen.findByRole('dialog');
    await userEvent.type(within(dialogo).getByLabelText(/código/i), 'SECTOR');
    await userEvent.type(within(dialogo).getByLabelText(/etiqueta/i), 'Sector');
    await userEvent.click(within(dialogo).getByRole('button', { name: /crear ítem/i }));

    await waitFor(() =>
      expect(api.createItem).toHaveBeenCalledWith(
        'ZONE_TYPE',
        expect.objectContaining({ code: 'SECTOR', label: 'Sector' }),
      ),
    );
  });

  it('rechaza un código con minúsculas antes de llamar a la API', async () => {
    renderPantalla();

    await userEvent.click(await screen.findByRole('button', { name: /tipos de zona/i }));
    await userEvent.click(await screen.findByRole('button', { name: /crear el primer ítem/i }));

    const dialogo = await screen.findByRole('dialog');
    await userEvent.type(within(dialogo).getByLabelText(/código/i), 'sector');
    await userEvent.type(within(dialogo).getByLabelText(/etiqueta/i), 'Sector');
    await userEvent.click(within(dialogo).getByRole('button', { name: /crear ítem/i }));

    expect(await within(dialogo).findByText(/mayúsculas/i)).toBeInTheDocument();
    expect(api.createItem).not.toHaveBeenCalled();
  });

  it('al editar, el código no se puede cambiar', async () => {
    renderPantalla();

    await userEvent.click(await screen.findByRole('button', { name: /roles del sistema/i }));
    const filas = await screen.findAllByRole('button', { name: /editar/i });
    await userEvent.click(filas[0]);

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByLabelText(/código/i)).toBeDisabled();
  });

  it('desactivar un ítem protegido muestra el motivo que da el backend', async () => {
    // El 422 explica que hay código que depende de ese valor; un mensaje
    // genérico perdería esa información.
    api.deactivateItem.mockRejectedValue(
      new ApiError(422, 'Este ítem es requerido por el sistema y no puede desactivarse'),
    );
    renderPantalla();

    await userEvent.click(await screen.findByRole('button', { name: /roles del sistema/i }));
    const acciones = await screen.findAllByRole('button', { name: /desactivar/i });
    await userEvent.click(acciones[0]);

    // El mensaje llega traducido por el diccionario de SPEC-C02, no crudo.
    expect(await screen.findByText(/lo necesita el sistema para funcionar/i)).toBeInTheDocument();
  });

  it('desactivar un ítem normal lo confirma', async () => {
    api.deactivateItem.mockResolvedValue(item('ADMIN', 'Administrador', null, false));
    renderPantalla();

    await userEvent.click(await screen.findByRole('button', { name: /tipos de intervención/i }));
    const acciones = await screen.findAllByRole('button', { name: /desactivar/i });
    await userEvent.click(acciones[0]);

    await waitFor(() => expect(api.deactivateItem).toHaveBeenCalled());
    expect(await screen.findByText(/ya no se ofrece/i)).toBeInTheDocument();
  });
});
