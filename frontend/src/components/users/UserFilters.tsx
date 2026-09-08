'use client';

import { useRef, useState } from 'react';
import { Select } from '@/components/ui/Select';
import type { SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { UsersFilters } from '@/lib/users';

const STATUS_ACTIVE: SelectOption = { id: 1, code: 'ACTIVE', label: 'Activos' };
const STATUS_INACTIVE: SelectOption = { id: 2, code: 'INACTIVE', label: 'Desactivados' };
const STATUS_ALL: SelectOption = { id: 3, code: 'ALL', label: 'Todos' };
const STATUS_OPTIONS: SelectOption[] = [STATUS_ACTIVE, STATUS_INACTIVE, STATUS_ALL];

function statusCode(isActive: boolean | null): string {
  return isActive === null ? STATUS_ALL.code : isActive ? STATUS_ACTIVE.code : STATUS_INACTIVE.code;
}

/**
 * Barra de filtros del listado (SPEC-100 §7.1): búsqueda con debounce de
 * 300 ms (escala de SPEC-C03 §9.1), rol desde el catálogo ROLE, estado con
 * "Activos" preseleccionado y cuadrilla. "Limpiar filtros" aparece solo
 * cuando hay algún criterio aplicado.
 */
export interface UserFiltersProps {
  value: UsersFilters;
  onChange: (filters: UsersFilters) => void;
  roles: SelectOption[];
  rolesLoading: boolean;
  teams: SelectOption[];
  teamsLoading: boolean;
}

export function UserFilters({
  value,
  onChange,
  roles,
  rolesLoading,
  teams,
  teamsLoading,
}: UserFiltersProps) {
  const [search, setSearch] = useState(value.search);
  const [prevSearch, setPrevSearch] = useState(value.search);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza el texto local cuando el filtro se resetea desde fuera (patrón
  // "ajustar estado durante el render", React reintenta sin re-montar).
  if (value.search !== prevSearch) {
    setPrevSearch(value.search);
    setSearch(value.search);
  }

  const update = (patch: Partial<UsersFilters>) => onChange({ ...value, ...patch });

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => update({ search: text }), 300);
  };

  const clearAll = () => {
    if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    onChange({ ...value, search: '', roleCode: null, isActive: null, teamId: null });
  };

  // "Activos" es el estado por defecto: no se considera un filtro aplicado.
  // El botón aparece cuando se busca, se filtra por rol/cuadrilla o se sale
  // de "Activos".
  const hasFilters =
    value.search !== '' || value.roleCode !== null || value.teamId !== null || value.isActive === false;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="relative w-full md:w-72">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Buscar por nombre, apellido o correo"
          aria-label="Buscar usuarios"
          className="h-10 w-full rounded-md border border-slate-200 pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 hover:border-slate-500 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      <Select
        id="filter-role"
        label="Rol"
        value={value.roleCode}
        options={roles}
        onChange={(option) => update({ roleCode: option?.code ?? null })}
        loading={rolesLoading}
        disabled={!rolesLoading && roles.length === 0}
        clearable
      />

      <Select
        id="filter-status"
        label="Estado"
        value={statusCode(value.isActive)}
        options={STATUS_OPTIONS}
        onChange={(option) =>
          update({ isActive: option === null || option.code === 'ALL' ? null : option.code === 'ACTIVE' })
        }
      />

      <Select
        id="filter-team"
        label="Cuadrilla"
        value={value.teamId === null ? null : String(value.teamId)}
        options={teams}
        onChange={(option) => update({ teamId: option === null ? null : Number(option.code) })}
        loading={teamsLoading}
        clearable
      />

      {hasFilters && (
        <Button variant="ghost" size="md" onClick={clearAll}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}