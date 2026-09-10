'use client';

import type { UserFilters } from '@shared/types';
import { Button, Input, Select } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { ASSIGNABLE_ROLES } from '@/lib/constants';

export interface UserFiltersBarProps {
  filters: UserFilters;
  onChange: (filters: UserFilters) => void;
  disabled?: boolean;
}

const ROLE_OPTIONS: SelectOption[] = ASSIGNABLE_ROLES.map((rol, indice) => ({
  id: indice + 1,
  code: rol.value,
  label: rol.label,
}));

/**
 * El estado se modela con tres opciones y no con un checkbox porque son tres
 * consultas distintas: todos, solo activos, solo inactivos. Un checkbox solo
 * puede expresar dos, y "sin marcar" se confundiría con "solo inactivos".
 */
const ACTIVE_OPTIONS: SelectOption[] = [
  { id: 1, code: 'ACTIVE', label: 'Activos' },
  { id: 2, code: 'INACTIVE', label: 'Inactivos' },
];

function codeToIsActive(code: string | null): boolean | undefined {
  if (code === 'ACTIVE') return true;
  if (code === 'INACTIVE') return false;
  return undefined;
}

function isActiveToCode(isActive: boolean | undefined): string | null {
  if (isActive === true) return 'ACTIVE';
  if (isActive === false) return 'INACTIVE';
  return null;
}

export function UserFiltersBar({ filters, onChange, disabled = false }: UserFiltersBarProps) {
  // Se reconstruye el objeto entero en cada cambio para que una clave ausente
  // signifique "sin filtrar". Asignar undefined dejaría la clave presente y
  // buildQuery la tendría que volver a descartar.
  const actualizar = (cambio: Partial<UserFilters>) => {
    const siguiente: UserFilters = { ...filters, ...cambio };
    if (siguiente.search === '') delete siguiente.search;
    if (siguiente.roleCode === '') delete siguiente.roleCode;
    if (cambio.isActive === undefined && 'isActive' in cambio) delete siguiente.isActive;
    onChange(siguiente);
  };

  const hayFiltros = Object.keys(filters).length > 0;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      <div className="flex-1">
        <Input
          id="users-search"
          label="Buscar por nombre o correo"
          type="search"
          value={filters.search ?? ''}
          onChange={(value) => actualizar({ search: value })}
          placeholder="Ej. Ana Torres"
          disabled={disabled}
        />
      </div>

      <div className="w-full md:w-48">
        <Select
          id="users-role"
          label="Rol"
          value={filters.roleCode ?? null}
          options={ROLE_OPTIONS}
          onChange={(option) => actualizar({ roleCode: option?.code ?? '' })}
          placeholder="Todos los roles"
          clearable
          disabled={disabled}
        />
      </div>

      <div className="w-full md:w-40">
        <Select
          id="users-active"
          label="Estado"
          value={isActiveToCode(filters.isActive)}
          options={ACTIVE_OPTIONS}
          onChange={(option) => actualizar({ isActive: codeToIsActive(option?.code ?? null) })}
          placeholder="Todos"
          clearable
          disabled={disabled}
        />
      </div>

      {hayFiltros && (
        <Button variant="ghost" onClick={() => onChange({})} disabled={disabled}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
