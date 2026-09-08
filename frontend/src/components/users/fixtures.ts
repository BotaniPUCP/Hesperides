import type { UserRow } from '@/lib/users';

export const ROLES = [
  { id: 1, code: 'ADMIN', label: 'Administrador' },
  { id: 2, code: 'SUPERVISOR', label: 'Supervisor' },
  { id: 3, code: 'COORDINADOR', label: 'Coordinador' },
];

const base = {
  isActive: true,
  credentialStatus: 'DELIVERED' as const,
  mustChangePassword: false,
  lastLogin: '2026-09-01T10:00:00.000Z',
  teams: [],
  role: ROLES[0],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

export function makeUser(overrides: Partial<UserRow> & { id: number; email: string; firstName: string; lastName: string }): UserRow {
  return {
    ...base,
    ...overrides,
    fullName: `${overrides.firstName} ${overrides.lastName}`,
  };
}

export const ADMIN_CONTEXT = {
  id: 1,
  email: 'ana.torres@pucp.edu.pe',
  firstName: 'Ana',
  lastName: 'Torres',
  fullName: 'Ana Torres',
  role: ROLES[0],
  isActive: true,
  credentialStatus: 'DELIVERED' as const,
  mustChangePassword: false,
  lastLogin: null,
  teams: [],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};