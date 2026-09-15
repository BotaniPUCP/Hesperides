import type { CatalogItem } from '@shared/types';

/**
 * Los cuatro roles reales, tal como los sirve el catálogo ROLE. Que estén aquí
 * y no en el código de producción es justamente el cambio de SPEC-003: la
 * aplicación los pide a la API, y solo los tests fijan una respuesta.
 */
export const ROLES_DE_PRUEBA: CatalogItem[] = [
  { code: 'ADMIN', label: 'Administrador', sortOrder: 1, isActive: true, parentCode: null },
  { code: 'COORDINADOR', label: 'Coordinador', sortOrder: 2, isActive: true, parentCode: null },
  { code: 'SUPERVISOR', label: 'Supervisor', sortOrder: 3, isActive: true, parentCode: null },
  { code: 'OPERARIO', label: 'Operario de campo', sortOrder: 4, isActive: true, parentCode: null },
];

export const catalogsApi = {
  activeItems: jest.fn(async (typeCode: string) =>
    typeCode === 'ROLE' ? ROLES_DE_PRUEBA : [],
  ),
  allTypes: jest.fn(async () => []),
  typeDetail: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deactivateItem: jest.fn(),
  activateItem: jest.fn(),
};
