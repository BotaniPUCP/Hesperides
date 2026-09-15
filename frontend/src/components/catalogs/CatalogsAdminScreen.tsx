'use client';

import { useMemo, useState } from 'react';
import type { CatalogItem } from '@shared/types';
import { Badge, Button, Card, EmptyState, LoadingSkeleton, useToast } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { useCatalog } from '@/hooks/useCatalog';
import {
  useCatalogDetail,
  useCatalogMutations,
  useCatalogTypes,
} from '@/hooks/useCatalogAdmin';
import { CATALOG_INTERVENTION_CLASS } from '@/lib/constants';
import { mensajeDeApiError } from '@/lib/api-errors';
import { CatalogItemFormModal } from './CatalogItemFormModal';
import { CatalogItemsTable } from './CatalogItemsTable';

/**
 * Administración de los catálogos configurables (SPEC-003). Solo ADMIN llega
 * aquí, y lo que se cambia lo ven todos: un ítem creado aparece en los
 * desplegables del resto, uno desactivado deja de ofrecerse.
 *
 * Es también la vía prevista para llenar los catálogos que el spec deja vacíos
 * a la espera del cliente, sin necesidad de una migración.
 */
export function CatalogsAdminScreen() {
  const { types, isLoading: cargandoTipos, errorMessage: errorTipos } = useCatalogTypes();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const { detail, isLoading: cargandoDetalle, refresh } = useCatalogDetail(seleccionado);
  const { crear, editar, desactivar, activar } = useCatalogMutations(refresh);
  const { showToast } = useToast();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<CatalogItem | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Los ítems solo traen el code de su clase, no su etiqueta. Pedir el catálogo
  // padre es lo que permite encabezar cada grupo con "Poda" en vez de "PODA", y
  // mostrar la descripción que el cliente escribió para cada clase.
  const usaJerarquia = (detail?.items ?? []).some((item) => item.parentCode !== null);
  const { items: clases } = useCatalog(usaJerarquia ? CATALOG_INTERVENTION_CLASS : '');

  const parentLabels = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const clase of clases) mapa.set(clase.code, clase.label);

    // Una clase que ya no esté activa deja de venir del catálogo, pero sus tipos
    // siguen aquí: sin este respaldo su grupo quedaría sin encabezado.
    for (const item of detail?.items ?? []) {
      if (item.parentCode && !mapa.has(item.parentCode)) {
        mapa.set(item.parentCode, item.parentCode);
      }
    }
    return mapa;
  }, [clases, detail]);

  const parentOptions: SelectOption[] = useMemo(
    () =>
      [...parentLabels.entries()].map(([code, label], indice) => ({
        id: indice + 1,
        code,
        label,
      })),
    [parentLabels],
  );

  function abrirAlta() {
    setEnEdicion(null);
    setModalAbierto(true);
  }

  function abrirEdicion(item: CatalogItem) {
    setEnEdicion(item);
    setModalAbierto(true);
  }

  async function alternarActivo(item: CatalogItem) {
    if (!seleccionado) return;
    setOcupado(item.code);

    try {
      if (item.isActive) {
        await desactivar(seleccionado, item.code);
        showToast({ variant: 'success', title: `"${item.label}" ya no se ofrece` });
      } else {
        await activar(seleccionado, item.code);
        showToast({ variant: 'success', title: `"${item.label}" vuelve a ofrecerse` });
      }
    } catch (error: unknown) {
      // El 422 de un ítem protegido trae del backend el motivo concreto, que
      // explica mejor que un mensaje genérico por qué no se puede.
      showToast({ variant: 'error', title: 'No se pudo cambiar el estado', description: mensajeDeApiError(error) });
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900">Catálogos</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Las opciones que ofrecen los desplegables del sistema. Lo que cambie aquí lo ven
          todos los usuarios.
        </p>
      </header>

      {errorTipos && (
        <p className="text-sm text-red-700" role="alert">
          {errorTipos}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Catálogos disponibles</h2>

          {cargandoTipos ? (
            <LoadingSkeleton />
          ) : (
            <ul className="flex flex-col gap-1">
              {types.map((type) => (
                <li key={type.code}>
                  <button
                    type="button"
                    onClick={() => setSeleccionado(type.code)}
                    aria-current={seleccionado === type.code}
                    className={`flex w-full flex-col items-start gap-0.5 rounded px-3 py-2 text-left text-sm transition-colors ${
                      seleccionado === type.code
                        ? 'bg-brand-50 text-brand-900'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="font-medium">{type.name}</span>
                    <span className="font-mono text-xs text-neutral-500">{type.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          {!seleccionado ? (
            <EmptyState
              title="Elija un catálogo"
              description="Seleccione uno de la lista para ver y editar sus opciones."
            />
          ) : cargandoDetalle ? (
            <LoadingSkeleton />
          ) : !detail ? (
            <EmptyState title="No se pudo cargar el catálogo" />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-neutral-900">{detail.name}</h2>
                    {detail.isSystem && <Badge label="De sistema" color="info" />}
                  </div>
                  {detail.description && (
                    <p className="mt-1 max-w-prose text-sm text-neutral-600">
                      {detail.description}
                    </p>
                  )}
                </div>

                <Button onClick={abrirAlta}>Nuevo ítem</Button>
              </div>

              {detail.items.length === 0 ? (
                <EmptyState
                  title="Este catálogo aún no tiene opciones"
                  description="Sus valores están pendientes de definir. Cree el primero para que aparezca en los formularios."
                  action={{ label: 'Crear el primer ítem', onClick: abrirAlta }}
                />
              ) : (
                <CatalogItemsTable
                  items={detail.items}
                  parentLabels={parentLabels}
                  onEdit={abrirEdicion}
                  onToggleActive={alternarActivo}
                  busyCode={ocupado}
                />
              )}
            </>
          )}
        </Card>
      </div>

      {modalAbierto && seleccionado && (
        <CatalogItemFormModal
          // Remontar en cada apertura es la forma de React de reiniciar estado,
          // el mismo patrón que usa UserFormModal.
          key={enEdicion?.code ?? '__nuevo__'}
          isOpen={modalAbierto}
          item={enEdicion}
          parentOptions={parentOptions}
          onClose={() => setModalAbierto(false)}
          onCreate={async (body) => {
            await crear(seleccionado, body);
            showToast({ variant: 'success', title: 'Ítem creado' });
          }}
          onUpdate={async (code, body) => {
            await editar(seleccionado, code, body);
            showToast({ variant: 'success', title: 'Ítem actualizado' });
          }}
        />
      )}
    </div>
  );
}
