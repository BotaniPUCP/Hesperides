'use client';

import type { CatalogItem } from '@shared/types';
import { Badge, Button } from '@/components/ui';

export interface CatalogItemsTableProps {
  items: CatalogItem[];
  /** Etiqueta de cada clase por su code, para encabezar los grupos. */
  parentLabels: Map<string, string>;
  onEdit: (item: CatalogItem) => void;
  onToggleActive: (item: CatalogItem) => void;
  busyCode: string | null;
}

interface Grupo {
  parentCode: string | null;
  items: CatalogItem[];
}

/**
 * Agrupa por clase solo si el catálogo la usa. La inmensa mayoría son planos
 * (ROLE, ZONE_TYPE…) y ahí un encabezado de grupo sería ruido; INTERVENTION_TYPE
 * tiene 52 ítems en 9 clases y sin agrupar obliga a leer la clase fila por fila.
 */
function agrupar(items: CatalogItem[]): Grupo[] {
  const tieneJerarquia = items.some((item) => item.parentCode !== null);
  if (!tieneJerarquia) return [{ parentCode: null, items }];

  const porClase = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const clave = item.parentCode ?? '';
    const grupo = porClase.get(clave) ?? [];
    grupo.push(item);
    porClase.set(clave, grupo);
  }

  return [...porClase.entries()].map(([clave, grupo]) => ({
    parentCode: clave === '' ? null : clave,
    items: grupo,
  }));
}

function descripcionDe(item: CatalogItem): string | null {
  const valor = item.metadata?.description;
  return typeof valor === 'string' ? valor : null;
}

function esProvisional(item: CatalogItem): boolean {
  return item.metadata?.provisional === true;
}

export function CatalogItemsTable({
  items,
  parentLabels,
  onEdit,
  onToggleActive,
  busyCode,
}: CatalogItemsTableProps) {
  const grupos = agrupar(items);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-600">
            <th className="px-3 py-2 font-medium">Código</th>
            <th className="px-3 py-2 font-medium">Etiqueta</th>
            <th className="px-3 py-2 font-medium">Orden</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((grupo) => (
            <GrupoDeItems
              key={grupo.parentCode ?? '__plano__'}
              grupo={grupo}
              parentLabels={parentLabels}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
              busyCode={busyCode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GrupoDeItems({
  grupo,
  parentLabels,
  onEdit,
  onToggleActive,
  busyCode,
}: {
  grupo: Grupo;
  parentLabels: Map<string, string>;
  onEdit: (item: CatalogItem) => void;
  onToggleActive: (item: CatalogItem) => void;
  busyCode: string | null;
}) {
  return (
    <>
      {grupo.parentCode && (
        <tr className="bg-neutral-50">
          <th
            colSpan={5}
            scope="colgroup"
            className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600"
          >
            {parentLabels.get(grupo.parentCode) ?? grupo.parentCode}
            <span className="ml-2 font-normal normal-case text-neutral-500">
              {grupo.items.length} {grupo.items.length === 1 ? 'tipo' : 'tipos'}
            </span>
          </th>
        </tr>
      )}

      {grupo.items.map((item) => {
        const descripcion = descripcionDe(item);
        const ocupado = busyCode === item.code;

        return (
          <tr key={item.code} className="border-b border-neutral-100 last:border-0">
            <td className="px-3 py-2 align-top font-mono text-xs text-neutral-700">{item.code}</td>
            <td className="px-3 py-2 align-top">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-neutral-900">{item.label}</span>
                {esProvisional(item) && <Badge label="Preliminar" color="warning" />}
              </div>
              {descripcion && (
                <p className="mt-0.5 max-w-prose text-xs text-neutral-500">{descripcion}</p>
              )}
            </td>
            <td className="px-3 py-2 align-top text-neutral-600">{item.sortOrder}</td>
            <td className="px-3 py-2 align-top">
              <Badge
                label={item.isActive ? 'Activo' : 'Inactivo'}
                color={item.isActive ? 'success' : 'neutral'}
              />
            </td>
            <td className="px-3 py-2 align-top">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => onEdit(item)} disabled={ocupado}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onToggleActive(item)}
                  loading={ocupado}
                >
                  {item.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}
