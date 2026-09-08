'use client';

import { Card } from './Card';
import type { DataTableColumn } from './DataTable';

interface DataTableCardsProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}

/**
 * Vista de móvil de DataTable (SPEC-C01 §9.1): una tabla de datos no cabe en
 * 375px sin scroll horizontal, y ese scroll es una mala experiencia táctil.
 */
export function DataTableCards<T>({ columns, rows, rowKey, onRowClick }: DataTableCardsProps<T>) {
  const visibles = columns.filter((column) => !column.hideOnMobile);
  const [titulo, ...resto] = visibles;

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <Card key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}>
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-neutral-900">
              {titulo.render
                ? titulo.render(row)
                : String((row as Record<string, unknown>)[titulo.key] ?? '')}
            </span>
          </div>

          <dl className="mt-2 flex flex-col gap-1">
            {resto.map((column) => (
              <div key={column.key} className="flex justify-between gap-2 text-sm">
                <dt className="text-neutral-500">{column.header}</dt>
                <dd className="text-neutral-700">
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[column.key] ?? '')}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
    </div>
  );
}
