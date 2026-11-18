'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button, EmptyState, Input, Select } from '@/components/ui';
import { useCanEditPlaces } from '@/components/lugares/edit/useCanEditPlaces';
import { useCatalog } from '@/hooks/useCatalog';
import { usePlaces } from '@/hooks/usePlaces';
import { mensajeDeApiError } from '@/lib/api-errors';
import { placesApi, type PlaceWorkbookExportFilters } from '@/lib/places-api';

const EMPTY_FILTERS = { search: '', category: '', kind: '' } as const;

function downloadWorkbook(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'exportar-lugares.xlsx';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PlaceWorkbookExportScreen() {
  const canEdit = useCanEditPlaces();
  const categories = useCatalog('REFERENCE_CATEGORY');
  const { places, errorMessage: placesError } = usePlaces(EMPTY_FILTERS);
  const [categoryCode, setCategoryCode] = useState<string | null>(null);
  const [alias, setAlias] = useState('');
  const [parentCode, setParentCode] = useState<string | null>(null);
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [includePerspectives, setIncludePerspectives] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) {
    return <EmptyState title="Sin permiso" description="Solo administración y coordinación pueden exportar lugares." />;
  }

  const categoryOptions = categories.items.map((item, index) => ({
    id: index + 1,
    code: item.code,
    label: item.label,
  }));
  const parentOptions = places.map((place, index) => ({
    id: index + 1,
    code: place.code,
    label: place.parent ? `${place.name} · ${place.parent.name}` : place.name,
  }));

  async function exportFile() {
    setError(null);
    if (createdFrom && createdTo && createdFrom > createdTo) {
      setError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    const filters: PlaceWorkbookExportFilters = {
      categoryCode,
      alias: alias.trim() || null,
      parentCode,
      createdFrom: createdFrom || null,
      createdTo: createdTo || null,
      includePerspectives,
    };

    setBusy(true);
    try {
      downloadWorkbook(await placesApi.exportPlaces(filters));
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exportar lugares"
        description="Descarga los lugares seleccionados en un Excel compatible con la plantilla de importación."
      />

      <section className="surface-card space-y-5">
        <h2 className="text-base font-semibold text-neutral-900">Filtros opcionales</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            id="exportar-categoria"
            label="Categoría"
            value={categoryCode}
            onChange={(option) => setCategoryCode(option?.code ?? null)}
            options={categoryOptions}
            placeholder="Todas las categorías"
            clearable
            loading={categories.isLoading}
            helperText={categories.errorMessage ?? undefined}
          />
          <Input
            id="exportar-alias"
            label="Alias exacto"
            value={alias}
            onChange={setAlias}
            placeholder="Busca un alias sin distinguir mayúsculas ni tildes"
          />
          <Select
            id="exportar-dentro-de"
            label="Dentro de"
            value={parentCode}
            onChange={(option) => setParentCode(option?.code ?? null)}
            options={parentOptions}
            placeholder="Cualquier lugar padre"
            clearable
            helperText={placesError ?? 'Filtra solo los lugares cuyo padre directo sea el seleccionado.'}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label htmlFor="exportar-fecha-desde" className="grid gap-1 text-sm font-medium text-neutral-700">
              Creado desde
              <input id="exportar-fecha-desde" type="date" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} className="h-10 rounded-md border border-neutral-200 px-3 font-normal" />
            </label>
            <label htmlFor="exportar-fecha-hasta" className="grid gap-1 text-sm font-medium text-neutral-700">
              Creado hasta
              <input id="exportar-fecha-hasta" type="date" value={createdTo} onChange={(event) => setCreatedTo(event.target.value)} className="h-10 rounded-md border border-neutral-200 px-3 font-normal" />
            </label>
          </div>
        </div>

        <fieldset className="space-y-3 rounded-md border border-neutral-200 p-4">
          <legend className="px-1 text-sm font-semibold text-neutral-800">Perspectivas (opcional)</legend>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" checked={includePerspectives} onChange={(event) => setIncludePerspectives(event.target.checked)} />
            Exportar todas las perspectivas con su punto cardinal, ubicación, rumbo e imagen
          </label>
        </fieldset>

        {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={() => void exportFile()} loading={busy}>Descargar Excel</Button>
        </div>
      </section>
    </div>
  );
}
