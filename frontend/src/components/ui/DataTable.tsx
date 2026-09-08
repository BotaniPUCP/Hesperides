'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from './Button';
import { DataTableCards } from './DataTableCards';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
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
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
}

function cellValue<T>(row: T, column: DataTableColumn<T>): ReactNode {
  if (column.render) return column.render(row);
  return String((row as Record<string, unknown>)[column.key] ?? '');
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
  loading = false,
  emptyState,
  onRowClick,
}: DataTableProps<T>) {
  const isMobile = useMediaQuery('(max-width: 639px)');

  const desde = page * pageSize + 1;
  const hasta = Math.min((page + 1) * pageSize, totalElements);
  const esUltimaPagina = hasta >= totalElements;

  function toggleSort(key: string) {
    if (!onSortChange) return;
    // Pulsar la columna ya ordenada invierte el sentido; otra columna empieza asc.
    const direction = sort?.key === key && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ key, direction });
  }

  if (loading) {
    return <LoadingSkeleton variant="table-row" count={5} />;
  }

  if (rows.length === 0) {
    return (
      <>{emptyState ?? <EmptyState title="Sin resultados" description="No hay datos para mostrar." />}</>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {isMobile && onSortChange && (
        <div className="flex flex-col gap-1">
          <label htmlFor="datatable-sort" className="text-sm font-medium text-neutral-700">
            Ordenar por
          </label>
          <select
            id="datatable-sort"
            value={sort?.key ?? ''}
            onChange={(event) => toggleSort(event.target.value)}
            className="h-10 rounded-md border border-neutral-200 bg-neutral-0 px-3 text-base"
          >
            {columns
              .filter((c) => c.sortable)
              .map((column) => (
                <option key={column.key} value={column.key}>
                  {column.header}
                </option>
              ))}
          </select>
        </div>
      )}

      {isMobile ? (
        <DataTableCards columns={columns} rows={rows} rowKey={rowKey} onRowClick={onRowClick} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full border-collapse bg-neutral-0">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-neutral-700"
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                      >
                        {column.header}
                        <span aria-hidden="true">
                          {sort?.key === column.key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-neutral-200 last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-neutral-50',
                  )}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm text-neutral-700">
                      {cellValue(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Anterior/Siguiente en vez de números de página: en una pantalla
          angosta la lista de números no cabe ni es cómoda de tocar. */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-neutral-500">{`${desde}–${hasta} de ${totalElements}`}</span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={esUltimaPagina}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
