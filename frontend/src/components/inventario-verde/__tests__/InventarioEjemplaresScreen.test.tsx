import { act, render as baseRender, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ToastProvider } from '@/components/ui';
import userEvent from '@testing-library/user-event';
import { InventarioEjemplaresScreen } from '../InventarioEjemplaresScreen';
import { PageFrame } from '@/components/layouts/PageFrame';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { rememberedHref } from '@/lib/listMemory';
import { saveListScroll } from '@/lib/listScroll';
import { recordVisit, restartTrail } from '@/lib/navigationTrail';
import { listed, p01, p02, page, summary } from '../__fixtures__/inventario';

/** La pantalla avisa con toasts: se monta dentro de su provider, como en la app. */
const render = (ui: ReactElement) => baseRender(ui, { wrapper: ToastProvider });

jest.mock('next/navigation', () => jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock);

const LIST = '/catastro/ejemplares';

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/inventario-verde-api', () => ({
  inventarioVerdeApi: {
    summary: jest.fn(),
    allSpecimens: jest.fn(),
    allLocations: jest.fn(),
    allSpecies: jest.fn(),
    locations: jest.fn(),
    retiredSpecimens: jest.fn(),
    retiredSpecimen: jest.fn(),
    deactivateSpecimensBatch: jest.fn(),
  },
}));

const api = inventarioVerdeApi as jest.Mocked<typeof inventarioVerdeApi>;

/** Palmera real, crítica y medida, en Educación. */
const mockSpecimenGlobal1 = listed(p01);

/** Palmera reina, ni crítica ni medida, en la Biblioteca. */
const mockSpecimenGlobal2 = listed({ ...p02, sourceLocation: 'Biblioteca Central' }, {
  speciesSlug: 'syagrus-romanzoffiana', speciesCommonName: 'Palmera reina', speciesScientificName: 'Syagrus romanzoffiana',
  vegetationTypeCode: 'TREE', speciesCritical: false, measured: false,
  searchKey: 'ev-000002 p02 biblioteca central palmera reina syagrus romanzoffiana',
});

/** Cuarenta, para que haya más de una página: los pares son palmeras críticas y medidas. */
const forty = Array.from({ length: 40 }, (_, i) => listed(
  { ...p01, code: 'EV-1' + String(i).padStart(5, '0'), sourceReference: 'p' + i },
  { speciesCritical: i % 2 === 0, measured: i % 2 === 0, vegetationTypeCode: i % 2 === 0 ? 'PALM' : 'TREE' },
));

beforeEach(() => {
  window.history.replaceState(null, '', LIST);
  window.sessionStorage.clear();
  restartTrail(LIST);
  mockUseAuth.mockReturnValue({ user: null });
  api.summary.mockResolvedValue(summary);
  api.allSpecimens.mockResolvedValue([mockSpecimenGlobal1, mockSpecimenGlobal2]);
  api.allSpecies.mockResolvedValue([]);
  api.allLocations.mockResolvedValue([
    { location: 'Educación', count: 5 },
    { location: 'Biblioteca Central', count: 25 },
  ]);
  api.retiredSpecimens.mockResolvedValue(page([]));
});

afterEach(() => jest.resetAllMocks());

describe('InventarioEjemplaresScreen', () => {
  it('renderiza la cabecera de Catastro de Ejemplares de forma limpia', async () => {
    render(<InventarioEjemplaresScreen />);

    expect(await screen.findByRole('heading', { name: 'Catastro de Ejemplares' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Catálogo de Especies/i })).not.toBeInTheDocument();
    await screen.findByText('EV-000001');
  });

  it('muestra la lista de ejemplares globales con código, referencia y ubicación', async () => {
    render(<InventarioEjemplaresScreen />);

    expect(await screen.findByText('EV-000001')).toBeInTheDocument();
    expect(screen.getByText('Ref: p01')).toBeInTheDocument();
    expect(screen.getAllByText('Educación').length).toBeGreaterThan(0);
    expect(screen.getByText('Palmera real')).toBeInTheDocument();
  });

  it('permite buscar ejemplares y actualiza los resultados', async () => {
    render(<InventarioEjemplaresScreen />);

    await screen.findByText('EV-000001');

    const searchInput = screen.getByPlaceholderText(/Buscar por código, referencia/i);
    await userEvent.type(searchInput, 'reina');

    await waitFor(() => {
      expect(screen.queryByText('EV-000001')).not.toBeInTheDocument();
      expect(screen.getByText('EV-000002')).toBeInTheDocument();
    });
    // Se busca en la lista ya cargada: ninguna consulta por letra (SPEC-119).
    expect(api.allSpecimens).toHaveBeenCalledTimes(1);
  });

  describe('conservar la pantalla para regresar', () => {
    it('recupera la posición del scroll cuando terminan de cargar los datos', async () => {
      const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      saveListScroll(LIST, 'type=PALM', 900);
      window.history.replaceState(null, '', `${LIST}?type=PALM`);
      render(<InventarioEjemplaresScreen />);

      await screen.findByText('EV-000001');
      await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 900));
      scrollTo.mockRestore();
    });

    it('reabre con los filtros, el orden, la vista y la página que trae la URL', async () => {
      window.history.replaceState(null, '', `${LIST}?search=real&type=PALM&location=Educación&sort=location&view=table&page=2`);
      render(<InventarioEjemplaresScreen />);

      expect(await screen.findByText('EV-000001')).toBeInTheDocument();
      expect(screen.queryByText('EV-000002')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Buscar por código, referencia/i)).toHaveValue('real');
      expect(await screen.findByText('Código')).toBeInTheDocument();
    });

    it('un orden o una página manipulados en la URL vuelven al valor por defecto', async () => {
      window.history.replaceState(null, '', `${LIST}?sort=photo_url;drop&dir=x&view=y&page=-4`);
      render(<InventarioEjemplaresScreen />);

      expect(await screen.findByText('EV-000001')).toBeInTheDocument();
      expect(screen.getByText('EV-000002')).toBeInTheDocument();
    });

    it('lleva a la URL lo que se filtra y lo recuerda para el breadcrumb', async () => {
      render(<InventarioEjemplaresScreen />);
      await screen.findByRole('option', { name: 'Palmera' });

      await userEvent.selectOptions(screen.getByRole('combobox', { name: /tipo de ejemplar/i }), 'PALM');

      await waitFor(() => expect(window.location.search).toBe('?type=PALM'));
      await waitFor(() => expect(rememberedHref(LIST)).toBe(`${LIST}?type=PALM`));
    });

    it('cambiar el orden conserva campo y dirección, que llegan en dos avisos seguidos', async () => {
      render(<InventarioEjemplaresScreen />);
      await screen.findByText('EV-000001');

      await userEvent.selectOptions(screen.getByLabelText('Ordenar por:'), 'reference:desc');

      await waitFor(() => expect(window.location.search).toBe('?sort=reference&dir=desc'));
    });

    it('al entrar por el menú estando filtrada, la pantalla ya montada empieza de cero', async () => {
      window.history.replaceState(null, '', `${LIST}?search=real&type=PALM`);
      render(<InventarioEjemplaresScreen />);
      await screen.findByRole('option', { name: 'Palmera' });

      act(() => window.history.pushState(null, '', LIST));

      expect(await screen.findByPlaceholderText(/Buscar por código, referencia/i)).toHaveValue('');
      expect(screen.getByRole('combobox', { name: /tipo de ejemplar/i })).toHaveValue('ALL');
      await waitFor(() => expect(rememberedHref(LIST)).toBe(LIST));
    });

    it('la flecha sigue el recorrido cuando se llegó desde otra pantalla', async () => {
      window.history.replaceState(null, '', LIST);
      render(<PageFrame><InventarioEjemplaresScreen /></PageFrame>);
      await screen.findByText('EV-000001');

      act(() => {
        restartTrail('/inventario-verde/especies/roystonea-regia');
        recordVisit(LIST);
      });

      expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute(
        'href', '/inventario-verde/especies/roystonea-regia',
      );
    });
  });

  describe('filtros de criticidad y medición', () => {
    const critical = () => screen.findByRole('combobox', { name: /criticidad/i });
    const measured = () => screen.findByRole('combobox', { name: /medición/i });

    it('sin elegir, no filtra', async () => {
      render(<InventarioEjemplaresScreen />);
      await screen.findByText('EV-000001');

      expect(screen.getByText('EV-000002')).toBeInTheDocument();
    });

    it('se combinan entre sí y vuelven a la primera página', async () => {
      api.allSpecimens.mockResolvedValue(forty);
      render(<InventarioEjemplaresScreen />);
      await screen.findByText('EV-100000');
      await userEvent.click(screen.getByRole('button', { name: /siguiente|next/i }));
      await waitFor(() => expect(window.location.search).toContain('page=1'));

      await userEvent.selectOptions(await critical(), 'false');
      await userEvent.selectOptions(await measured(), 'false');

      await waitFor(() => expect(window.location.search).not.toContain('page=1'));
      expect(await screen.findByText('EV-100001')).toBeInTheDocument();
      expect(screen.queryByText('EV-100000')).not.toBeInTheDocument();
    });

    it('«Medidos» y «Críticas» viajan como verdadero', async () => {
      render(<InventarioEjemplaresScreen />);
      await userEvent.selectOptions(await critical(), 'true');
      await userEvent.selectOptions(await measured(), 'true');

      await waitFor(() => expect(screen.queryByText('EV-000002')).not.toBeInTheDocument());
      expect(screen.getByText('EV-000001')).toBeInTheDocument();
    });

    it('restablecer los filtros también los reinicia', async () => {
      render(<InventarioEjemplaresScreen />);
      await userEvent.selectOptions(await critical(), 'true');

      await userEvent.click(await screen.findByRole('button', { name: /Restablecer filtros/ }));

      await waitFor(async () => expect(await critical()).toHaveValue('ALL'));
    });
  });

  describe('filtro por tipo de ejemplar', () => {
    const typeFilter = () => screen.findByRole('combobox', { name: /tipo de ejemplar/i });

    it('ofrece solo los tipos que tienen ejemplares, con su conteo', async () => {
      render(<InventarioEjemplaresScreen />);

      expect(await screen.findByRole('option', { name: 'Palmera' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Árbol' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Todos los tipos' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Cubresuelo/ })).not.toBeInTheDocument();
    });

    it('muestra los ejemplares del tipo elegido y vuelve a la primera página', async () => {
      api.allSpecimens.mockResolvedValue(forty);
      render(<InventarioEjemplaresScreen />);
      await screen.findByText('EV-100000');
      await userEvent.click(screen.getByRole('button', { name: /siguiente|next/i }));
      await waitFor(() => expect(window.location.search).toContain('page=1'));

      await screen.findByRole('option', { name: 'Palmera' });
      await userEvent.selectOptions(await typeFilter(), 'PALM');

      await waitFor(() => expect(window.location.search).not.toContain('page=1'));
      expect(await screen.findByText('EV-100000')).toBeInTheDocument();
      expect(screen.queryByText('EV-100001')).not.toBeInTheDocument();
    });

    it('se combina con el filtro de ubicación', async () => {
      render(<InventarioEjemplaresScreen />);
      await screen.findByRole('option', { name: 'Palmera' });
      await screen.findByRole('option', { name: 'Educación' });

      await userEvent.selectOptions(await typeFilter(), 'PALM');
      await userEvent.selectOptions(screen.getByDisplayValue('Todas las ubicaciones'), 'Educación');

      await waitFor(() => expect(screen.queryByText('EV-000002')).not.toBeInTheDocument());
      expect(screen.getByText('EV-000001')).toBeInTheDocument();
    });

    it('«Restablecer filtros» aparece con un tipo elegido y lo quita', async () => {
      render(<InventarioEjemplaresScreen />);
      await screen.findByRole('option', { name: 'Palmera' });
      expect(screen.queryByRole('button', { name: 'Restablecer filtros' })).not.toBeInTheDocument();

      await userEvent.selectOptions(await typeFilter(), 'PALM');
      await userEvent.click(await screen.findByRole('button', { name: 'Restablecer filtros' }));

      expect(await typeFilter()).toHaveValue('ALL');
      expect(await screen.findByText('EV-000002')).toBeInTheDocument();
    });
  });

  it('arranca en vista de cuadrícula por defecto y permite alternar a tabla', async () => {
    render(<InventarioEjemplaresScreen />);

    expect(await screen.findByText('EV-000001')).toBeInTheDocument();
    expect(screen.getByText('Ref: p01')).toBeInTheDocument();

    const tablaButton = screen.getByRole('button', { name: /tabla/i });
    await userEvent.click(tablaButton);

    // En vista tabla se muestran las columnas de Código, Ubicación y Referencia
    expect(screen.getByText('Código')).toBeInTheDocument();
    expect(screen.getByText('Ubicación')).toBeInTheDocument();
    expect(screen.getByText('Referencia')).toBeInTheDocument();
    expect(screen.getByText('EV-000001')).toBeInTheDocument();
  });

  it('no muestra botones al vuelo en la cabecera ya que la navegación se realiza por el sidebar', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        username: 'coordinador.verde',
        email: 'coordinador@pucp.edu.pe',
        role: { code: 'COORDINADOR', name: 'Coordinador' },
      },
    });

    render(<InventarioEjemplaresScreen />);

    await screen.findByText('EV-000001');
    expect(screen.queryByRole('link', { name: /\+ Registrar ejemplar/i })).not.toBeInTheDocument();
  });

  it('no muestra la pestaña de ejemplares retirados a usuarios sin rol de admin o coordinador', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 2,
        username: 'supervisor',
        email: 'supervisor@pucp.edu.pe',
        role: { code: 'SUPERVISOR', name: 'Supervisor' },
      },
    });

    render(<InventarioEjemplaresScreen />);
    await screen.findByText('EV-000001');

    expect(screen.queryByRole('tab', { name: /retirados/i })).not.toBeInTheDocument();
  });

  it('permite a un Administrador o Coordinador consultar la pestaña de ejemplares retirados', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@pucp.edu.pe',
        role: { code: 'ADMIN', name: 'Administrador' },
      },
    });

    api.retiredSpecimens.mockResolvedValue(
      page([
        {
          id: 99,
          code: 'EV-000099',
          scientificName: 'Ficus benjamina',
          commonName: 'Ficus',
          speciesSlug: 'ficus-benjamina',
          vegetationType: 'Árbol',
          sourceLocation: 'Jardín Central',
          sourceReference: 'FC-01',
          notes: null,
          latitude: -12.069,
          longitude: -77.079,
          retiredAt: '2026-05-10T14:30:00Z',
          reason: 'Peligro de caída por ramas podridas',
          retiredByName: 'Carlos Admin',
          retiredByEmail: 'carlos@pucp.edu.pe',
          interventionsCount: 2,
        },
      ]),
    );

    render(<InventarioEjemplaresScreen />);
    await screen.findByText('EV-000001');

    const retiredTab = screen.getByRole('tab', { name: /retirados/i });
    expect(retiredTab).toBeInTheDocument();

    await user.click(retiredTab);

    expect(api.retiredSpecimens).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'EV-000099' })).toBeInTheDocument();
    expect(screen.getByText('Carlos Admin')).toBeInTheDocument();
    expect(screen.getByText(/2 intervenciones/i)).toBeInTheDocument();
  });

  describe('baja masiva por selección múltiple', () => {
    it('permite a un ADMIN seleccionar ejemplares y abrir el modal de baja masiva', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: { id: 1, name: 'Admin', email: 'admin@pucp.edu.pe', role: { code: 'ADMIN', name: 'Administrador' } },
      });

      render(<InventarioEjemplaresScreen />);
      await screen.findByText('EV-000001');

      const checkbox1 = screen.getByRole('checkbox', { name: /Seleccionar ejemplar EV-000001/i });
      expect(checkbox1).toBeInTheDocument();
      expect(checkbox1).not.toBeChecked();

      await user.click(checkbox1);
      expect(checkbox1).toBeChecked();

      expect(screen.getByRole('region', { name: /Acciones masivas/i })).toBeInTheDocument();
      expect(screen.getByText('1 ejemplar seleccionado')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Dar de baja seleccionados/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Confirmar baja definitiva \(1 ejemplar\)/i)).toBeInTheDocument();

      const reasonInput = screen.getByLabelText(/Motivo del retiro/i);
      await user.type(reasonInput, 'Retiro por obras del nuevo pabellón');

      await user.click(screen.getByRole('button', { name: /Dar de baja 1 ejemplar/i }));

      expect(api.deactivateSpecimensBatch).toHaveBeenCalledWith(
        ['EV-000001'],
        'Retiro por obras del nuevo pabellón',
      );
    });

    it('no muestra casillas de selección a usuarios sin permisos (ej. SUPERVISOR)', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 2, name: 'Pepe Supervisor', email: 'pepe@pucp.edu.pe', role: { code: 'SUPERVISOR', name: 'Supervisor' } },
      });

      render(<InventarioEjemplaresScreen />);
      await screen.findByText('EV-000001');

      expect(screen.queryByRole('checkbox', { name: /Seleccionar ejemplar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('region', { name: /Acciones masivas/i })).not.toBeInTheDocument();
    });

    it('solicita confirmación preventiva si hay ejemplares seleccionados al cambiar un filtro', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: { id: 1, name: 'Admin', email: 'admin@pucp.edu.pe', role: { code: 'ADMIN', name: 'Administrador' } },
      });

      render(<InventarioEjemplaresScreen />);
      await screen.findByText('EV-000001');

      const checkbox1 = screen.getByRole('checkbox', { name: /Seleccionar ejemplar EV-000001/i });
      await user.click(checkbox1);
      expect(checkbox1).toBeChecked();

      // Cambiar un filtro de tipo de vegetación con selección activa
      await user.selectOptions(screen.getByRole('combobox', { name: /tipo de ejemplar/i }), 'PALM');

      // Se despliega el modal preventivo
      expect(screen.getByRole('heading', { name: 'Cambiar filtros' })).toBeInTheDocument();
      expect(screen.getByText(/Has seleccionado/i)).toBeInTheDocument();
      expect(screen.getByText(/se perderá esta selección/i)).toBeInTheDocument();

      // Si cancela, mantiene el filtro previo y la selección intacta
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('heading', { name: 'Cambiar filtros' })).not.toBeInTheDocument();
      expect(checkbox1).toBeChecked();

      // Volver a intentar cambiar el filtro y confirmar
      await user.selectOptions(screen.getByRole('combobox', { name: /tipo de ejemplar/i }), 'PALM');
      await user.click(screen.getByRole('button', { name: 'Continuar y deseleccionar' }));

      // Se aplicó el filtro (en el navegador, SPEC-119) y se limpió la selección
      await waitFor(() => expect(window.location.search).toContain('type=PALM'));
      expect(screen.queryByRole('region', { name: /Acciones masivas/i })).not.toBeInTheDocument();
    });
  });
});
