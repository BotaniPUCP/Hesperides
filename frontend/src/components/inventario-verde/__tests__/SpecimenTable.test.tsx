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

    expect(screen.getByRole('columnheader', { name: /Código \/ Referencia/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Ubicación \(catastro\)/i })).toBeInTheDocument();
    expect(screen.getByText('EV-000001')).toBeInTheDocument();
    expect(screen.getByText('Ref. p01')).toBeInTheDocument();
    expect(screen.getAllByText('Educación')).toHaveLength(2);
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument();
  });

  it('marca solo los ejemplares con observación', () => {
    renderTable();

    const notes = screen.getAllByRole('note');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveAttribute('aria-label', expect.stringContaining('mediciones forestales'));
  });

  it('abre la ficha del ejemplar al elegir su fila', () => {
    renderTable();

    fireEvent.click(screen.getByText('EV-000002'));
    expect(push).toHaveBeenCalledWith('/inventario-verde/especies/roystonea-regia/ejemplares/EV-000002');
  });

  it('amplía la miniatura de Drive sin abrir la ficha', () => {
    renderTable();

    fireEvent.click(screen.getAllByRole('button', { name: /Ver fotografía ampliada de/i })[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(/EV-000001\s*·\s*Palmera real/);
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar vista previa' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
