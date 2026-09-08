'use client';

import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

export interface DataTableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  totalElements: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  totalElements,
  page,
  pageSize,
  onPageChange,
  sort,
  onSortChange,
  searchValue,
  onSearchChange,
  loading = false,
  emptyState,
  onRowClick,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return;
    const sameKey = sort?.key === column.key;
    onSortChange({
      key: column.key,
      direction: sameKey && sort?.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const headerCellClass = 'px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {onSearchChange && (
        <div className="border-b border-slate-200 p-3">
          <input
            type="search"
            value={searchValue ?? ''}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar en la tabla…"
            aria-label="Buscar"
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-base text-slate-900 placeholder:text-slate-400 hover:border-slate-500 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`${headerCellClass} ${column.hideOnMobile ? 'hidden md:table-cell' : ''} ${
                    column.sortable ? 'cursor-pointer select-none hover:text-slate-900' : ''
                  }`}
                  onClick={() => toggleSort(column)}
                  aria-sort={
                    sort?.key === column.key
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {column.sortable && sort?.key === column.key && (
                      <span aria-hidden="true">{sort.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 py-3 ${column.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                    >
                      <div className="h-4 animate-pulse rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState ?? (
                    <EmptyState title="Sin resultados" description="No se encontraron registros." />
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 py-3 text-sm text-slate-700 ${column.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                    >
                      {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-3">
        <p className="text-xs text-slate-500">
          {totalElements} resultado{totalElements === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={loading || page <= 0}
            className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-500">
            Página {page + 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={loading || page >= totalPages - 1}
            className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}