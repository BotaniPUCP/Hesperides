import { act, fireEvent, render, screen } from '@testing-library/react';
import { INITIAL_FILTERS, type UsersFilters } from '@/lib/users';
import { UserFilters } from '../UserFilters';
import { ROLES } from '../fixtures';

describe('UserFilters', () => {
  it('preselecciona "Activos" como estado por defecto', () => {
    render(
      <UserFilters
        value={INITIAL_FILTERS}
        onChange={jest.fn()}
        roles={ROLES}
        rolesLoading={false}
        teams={[{ id: 5, code: '5', label: 'Cuadrilla Norte' }]}
        teamsLoading={false}
      />,
    );
    const status = screen.getByLabelText('Estado') as HTMLSelectElement;
    expect(status.value).toBe('ACTIVE');
  });

  it('no muestra "Limpiar filtros" con el estado por defecto', () => {
    render(
      <UserFilters
        value={INITIAL_FILTERS}
        onChange={jest.fn()}
        roles={ROLES}
        rolesLoading={false}
        teams={[]}
        teamsLoading={false}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
  });

  it('muestra "Limpiar filtros" cuando se aplica al menos un filtro', () => {
    render(
      <UserFilters
        value={{ ...INITIAL_FILTERS, isActive: false }}
        onChange={jest.fn()}
        roles={ROLES}
        rolesLoading={false}
        teams={[]}
        teamsLoading={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument();
  });

  it('aplica la búsqueda con debounce de 300 ms en una sola llamada', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    render(
      <UserFilters
        value={INITIAL_FILTERS}
        onChange={onChange}
        roles={ROLES}
        rolesLoading={false}
        teams={[]}
        teamsLoading={false}
      />,
    );

    const search = screen.getByLabelText('Buscar usuarios');
    fireEvent.change(search, { target: { value: 'A' } });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(search, { target: { value: 'An' } });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...INITIAL_FILTERS, search: 'An' });

    jest.useRealTimers();
  });

  it('resetea todos los criterios al pulsar "Limpiar filtros"', () => {
    const onChange = jest.fn();
    render(
      <UserFilters
        value={{ ...INITIAL_FILTERS, roleCode: 'SUPERVISOR', isActive: false }}
        onChange={onChange}
        roles={ROLES}
        rolesLoading={false}
        teams={[]}
        teamsLoading={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onChange).toHaveBeenCalledWith({ ...INITIAL_FILTERS, search: '', roleCode: null, isActive: null, teamId: null });
  });
});