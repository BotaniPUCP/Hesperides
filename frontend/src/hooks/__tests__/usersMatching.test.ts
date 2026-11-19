import type { UserDetail } from '@shared/types';
import { usersMatching } from '../useUsers';

const user = (id: number, overrides: Partial<UserDetail>): UserDetail => ({
  id, email: `u${id}@pucp.edu.pe`, firstName: 'Ana', lastName: 'Torres', fullName: 'Ana Torres',
  role: { id: 5, code: 'OPERARIO', label: 'Operario' }, isActive: true, credentialStatus: 'DELIVERED',
  mustChangePassword: false, lastLogin: null, teams: [], createdAt: '', updatedAt: '', searchKey: '', ...overrides,
});

const users = [
  user(1, { searchKey: 'rosa nunez rosa@pucp.edu.pe', teams: [{ id: 7, name: 'Cuadrilla sur' }] }),
  user(2, { searchKey: 'luis gomez luis@pucp.edu.pe', isActive: false }),
  user(3, { searchKey: 'eva rios eva@pucp.edu.pe', role: { id: 2, code: 'COORDINADOR', label: 'Coordinador' } }),
];
const ids = (filters: Parameters<typeof usersMatching>[1]) => usersMatching(users, filters).map((u) => u.id);

describe('usersMatching', () => {
  it('sin estado elegido muestra a todos, activos e inactivos', () => {
    expect(ids({})).toEqual([1, 2, 3]);
  });

  it('isActive=false es «solo inactivos», no la ausencia del filtro', () => {
    expect(ids({ isActive: false })).toEqual([2]);
  });

  it('busca sin tildes en nombre, apellido y correo', () => {
    expect(ids({ search: 'NÚÑEZ' })).toEqual([1]);
    expect(ids({ search: 'eva@' })).toEqual([3]);
  });

  it('filtra por rol y por cuadrilla, y combina los filtros', () => {
    expect(ids({ roleCode: 'COORDINADOR' })).toEqual([3]);
    expect(ids({ teamId: 7 })).toEqual([1]);
    expect(ids({ isActive: true, roleCode: 'OPERARIO' })).toEqual([1]);
  });
});
