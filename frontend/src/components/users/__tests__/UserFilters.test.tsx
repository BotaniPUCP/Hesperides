import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserFiltersBar } from '../UserFiltersBar';

describe('UserFiltersBar', () => {
  const onChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('propaga el rol elegido por su codigo, no por su etiqueta', async () => {
    // El backend filtra por catalog_items.code. Enviar "Operario de campo"
    // devolveria cero resultados sin dar error.
    render(<UserFiltersBar filters={{}} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText(/rol/i), 'OPERARIO');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ roleCode: 'OPERARIO' }));
  });

  it('distingue "solo inactivos" de "sin filtrar por estado"', async () => {
    render(<UserFiltersBar filters={{}} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText(/estado/i), 'INACTIVE');

    // isActive debe viajar como false, no desaparecer: son dos consultas distintas.
    const enviado = onChange.mock.calls[0][0] as { isActive?: boolean };
    expect(enviado.isActive).toBe(false);
  });

  it('al limpiar el estado lo quita de los filtros en vez de mandarlo como false', async () => {
    render(<UserFiltersBar filters={{ isActive: true }} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it('propaga cada pulsacion de la busqueda sin recortarla ni normalizarla', async () => {
    // Es un componente controlado: el valor vive en la pagina, no aqui. Teclear
    // tres letras con el mismo `filters` produce tres llamadas de una letra, y
    // eso es correcto; esperar "ana" seria esperar estado interno que no existe.
    render(<UserFiltersBar filters={{ search: 'an' }} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText(/buscar/i), 'a');

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ana' }));
  });

  it('al vaciar la busqueda la quita de los filtros en vez de mandarla vacia', async () => {
    render(<UserFiltersBar filters={{ search: 'a' }} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText(/buscar/i));

    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('el boton de limpiar solo aparece cuando hay algo que limpiar', () => {
    const { rerender } = render(<UserFiltersBar filters={{}} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument();

    rerender(<UserFiltersBar filters={{ search: 'ana' }} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /limpiar filtros/i })).toBeInTheDocument();
  });
});
