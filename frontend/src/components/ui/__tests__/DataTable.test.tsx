import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '../DataTable';
import type { DataTableColumn } from '../DataTable';

interface Fila {
  id: number;
  codigo: string;
  nombre: string;
  zona: string;
}

const FILAS: Fila[] = [
  { id: 1, codigo: 'ARB-001', nombre: 'Ficus', zona: 'Norte' },
  { id: 2, codigo: 'ARB-002', nombre: 'Molle', zona: 'Sur' },
];

const COLUMNAS: DataTableColumn<Fila>[] = [
  { key: 'codigo', header: 'Código', sortable: true },
  { key: 'nombre', header: 'Nombre', sortable: true },
  { key: 'zona', header: 'Zona', hideOnMobile: true },
];

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

function renderTabla(props: Partial<ComponentProps<typeof DataTable<Fila>>> = {}) {
  return render(
    <DataTable<Fila>
      columns={COLUMNAS}
      rows={FILAS}
      rowKey={(row) => row.id}
      totalElements={2}
      page={0}
      pageSize={20}
      onPageChange={jest.fn()}
      {...props}
    />,
  );
}

describe('DataTable (escritorio)', () => {
  beforeEach(() => mockMatchMedia(false));

  it('renderiza encabezados y filas', () => {
    renderTabla();

    expect(screen.getByRole('columnheader', { name: /Código/ })).toBeInTheDocument();
    expect(screen.getByText('ARB-001')).toBeInTheDocument();
    expect(screen.getByText('Molle')).toBeInTheDocument();
  });

  it('usa render personalizado cuando la columna lo define', () => {
    renderTabla({
      columns: [
        ...COLUMNAS,
        { key: 'acciones', header: 'Acciones', render: (row) => <span>Ver {row.codigo}</span> },
      ],
    });

    expect(screen.getByText(/Ver ARB-001/)).toBeInTheDocument();
  });

  it('ordena al pulsar un encabezado ordenable', async () => {
    const onSortChange = jest.fn();
    renderTabla({ onSortChange });

    await userEvent.click(screen.getByRole('button', { name: /Código/ }));

    expect(onSortChange).toHaveBeenCalledWith({ key: 'codigo', direction: 'asc' });
  });

  it('invierte la direccion al pulsar la columna ya ordenada', async () => {
    const onSortChange = jest.fn();
    renderTabla({ sort: { key: 'codigo', direction: 'asc' }, onSortChange });

    await userEvent.click(screen.getByRole('button', { name: /Código/ }));

    expect(onSortChange).toHaveBeenCalledWith({ key: 'codigo', direction: 'desc' });
  });

  it('no hace ordenable una columna que no lo declara', () => {
    renderTabla({ onSortChange: jest.fn() });
    expect(screen.queryByRole('button', { name: /Zona/ })).not.toBeInTheDocument();
  });

  it('muestra skeletons mientras carga y no las filas', () => {
    renderTabla({ loading: true });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('ARB-001')).not.toBeInTheDocument();
  });

  it('muestra el estado vacio cuando no hay filas', () => {
    renderTabla({ rows: [], totalElements: 0 });

    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('admite un estado vacio personalizado', () => {
    renderTabla({ rows: [], totalElements: 0, emptyState: <p>Nada por aquí</p> });

    expect(screen.getByText('Nada por aquí')).toBeInTheDocument();
  });

  it('informa el rango y el total en la paginacion', () => {
    renderTabla({ totalElements: 128, page: 1, pageSize: 20 });

    expect(screen.getByText('21–40 de 128')).toBeInTheDocument();
  });

  it('avanza y retrocede de pagina', async () => {
    const onPageChange = jest.fn();
    renderTabla({ totalElements: 128, page: 1, pageSize: 20, onPageChange });

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it('deshabilita Anterior en la primera pagina', () => {
    renderTabla({ totalElements: 128, page: 0, pageSize: 20 });
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  it('deshabilita Siguiente en la ultima pagina', () => {
    renderTabla({ totalElements: 40, page: 1, pageSize: 20 });
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('dispara onRowClick al pulsar una fila', async () => {
    const onRowClick = jest.fn();
    renderTabla({ onRowClick });

    await userEvent.click(screen.getByText('ARB-001'));

    expect(onRowClick).toHaveBeenCalledWith(FILAS[0]);
  });
});

describe('DataTable (movil)', () => {
  beforeEach(() => mockMatchMedia(true));

  it('no renderiza una tabla: usa tarjetas', () => {
    renderTabla();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('ARB-001')).toBeInTheDocument();
  });

  it('oculta las columnas marcadas hideOnMobile', () => {
    renderTabla();

    expect(screen.queryByText('Norte')).not.toBeInTheDocument();
  });

  it('sustituye los encabezados por un selector de orden', () => {
    renderTabla({ onSortChange: jest.fn() });

    expect(screen.getByLabelText('Ordenar por')).toBeInTheDocument();
  });
});
