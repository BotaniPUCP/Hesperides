import { fireEvent, render, screen } from '@testing-library/react';
import { SpecimenTable } from '../SpecimenTable';
import { p01, p02, palmeraReal } from '../__fixtures__/inventario';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

function renderTable() {
  return render(
    <SpecimenTable
      specimens={[p01, p02]}
      species={palmeraReal}
      totalElements={2}
      page={0}
      pageSize={10}
      onPageChange={jest.fn()}
      sortBy="reference"
      sortDirection="asc"
      onSortChange={jest.fn()}
    />,
  );
}

afterEach(() => jest.clearAllMocks());

describe('SpecimenTable', () => {
  it('muestra el código propio, la referencia y la ubicación del catastro', () => {
    renderTable();

    expect(screen.getByText('EV-000001')).toBeInTheDocument();
    expect(screen.getByText('Ref: p01')).toBeInTheDocument();
    expect(screen.getAllByText('Educación').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument();
  });

  it('marca solo los ejemplares con observación', () => {
    renderTable();

    const notes = screen.getAllByRole('note');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveAttribute('aria-label', expect.stringContaining('mediciones forestales'));
  });

  it('vincula cada fila a la ficha de su ejemplar', () => {
    renderTable();

    const links = screen.getAllByRole('link');
    const linkEV01 = links.find((l) => l.getAttribute('href')?.includes('EV-000001'));
    const linkEV02 = links.find((l) => l.getAttribute('href')?.includes('EV-000002'));

    expect(linkEV01).toHaveAttribute(
      'href',
      '/inventario-verde/especies/roystonea-regia/ejemplares/EV-000001',
    );
    expect(linkEV02).toHaveAttribute(
      'href',
      '/inventario-verde/especies/roystonea-regia/ejemplares/EV-000002',
    );
  });
});
