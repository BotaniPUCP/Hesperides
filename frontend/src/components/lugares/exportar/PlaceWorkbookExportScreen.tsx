'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button, EmptyState, Input, Select } from '@/components/ui';
import { useCanEditPlaces } from '@/components/lugares/edit/useCanEditPlaces';
import { useCatalog } from '@/hooks/useCatalog';
import { usePlaces } from '@/hooks/usePlaces';
import { mensajeDeApiError } from '@/lib/api-errors';
import { placesApi, type PlaceWorkbookExportFilters } from '@/lib/places-api';

type SideCode = 'FRONT' | 'BACK' | 'SIDE';
type PointInput = { lat: string; lon: string };
const SIDES: { code: SideCode; label: string }[] = [
  { code: 'FRONT', label: 'Frente' },
  { code: 'BACK', label: 'Espalda' },
  { code: 'SIDE', label: 'Lateral' },
];
const EMPTY_FILTERS = { search: '', category: '', kind: '' } as const;

function downloadWorkbook(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'exportar-lugares.xlsx';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function coordinates(points: PointInput[]): [number, number][] | null {
  const values = points.map(({ lat, lon }) => [lat.trim(), lon.trim()]);
  if (values.every(([lat, lon]) => !lat && !lon)) return null;
  if (values.some(([lat, lon]) => !lat || !lon)) {
    throw new Error('Completa latitud y longitud de los tres puntos para definir la zona.');
  }
  const parsed = values.map(([lat, lon]) => [Number(lat), Number(lon)] as [number, number]);
  if (parsed.some(([lat, lon]) => !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180)) {
    throw new Error('Verifica las coordenadas: latitud entre -90 y 90, longitud entre -180 y 180.');
  }
  const [[lat1, lon1], [lat2, lon2], [lat3, lon3]] = parsed;
  const area = (lon2 - lon1) * (lat3 - lat1) - (lat2 - lat1) * (lon3 - lon1);
  if (Math.abs(area) < 1e-12) throw new Error('Los tres puntos deben formar un triángulo con área mayor que cero.');
  return parsed;
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
  const [points, setPoints] = useState<PointInput[]>([
    { lat: '', lon: '' },
    { lat: '', lon: '' },
    { lat: '', lon: '' },
  ]);
  const [includePerspectives, setIncludePerspectives] = useState(false);
  const [perspectiveSides, setPerspectiveSides] = useState<SideCode[]>(SIDES.map(({ code }) => code));
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
    if (includePerspectives && perspectiveSides.length === 0) {
      setError('Selecciona al menos un punto cardinal para exportar perspectivas.');
      return;
    }

    let triangle: [number, number][] | null;
    try {
      triangle = coordinates(points);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revisa los puntos de la zona.');
      return;
    }

    const [point1, point2, point3] = triangle ?? [null, null, null];
    const filters: PlaceWorkbookExportFilters = {
      categoryCode,
      alias: alias.trim() || null,
      parentCode,
      createdFrom: createdFrom || null,
      createdTo: createdTo || null,
      point1Lat: point1?.[0] ?? null,
      point1Lon: point1?.[1] ?? null,
      point2Lat: point2?.[0] ?? null,
      point2Lon: point2?.[1] ?? null,
      point3Lat: point3?.[0] ?? null,
      point3Lon: point3?.[1] ?? null,
      includePerspectives,
      perspectiveSides: includePerspectives ? perspectiveSides : [],
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

  function setPoint(index: number, patch: Partial<PointInput>) {
    setPoints((current) => current.map((point, pointIndex) =>
      pointIndex === index ? { ...point, ...patch } : point,
    ));
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
          <legend className="px-1 text-sm font-semibold text-neutral-800">Zona por tres puntos (opcional)</legend>
          <p className="text-sm text-neutral-600">Ingresa los tres vértices del triángulo. Se exportarán los lugares cuya ubicación representativa esté dentro o en el borde de la zona.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {points.map((point, index) => (
              <fieldset key={index} className="grid grid-cols-2 gap-2">
                <legend className="col-span-2 text-sm font-medium text-neutral-700">Punto {index + 1}</legend>
                <label className="grid gap-1 text-xs text-neutral-600">
                  Latitud
                  <input id={`exportar-punto-${index + 1}-latitud`} type="number" step="any" min="-90" max="90" value={point.lat} onChange={(event) => setPoint(index, { lat: event.target.value })} className="h-10 min-w-0 rounded-md border border-neutral-200 px-2 text-sm" />
                </label>
                <label className="grid gap-1 text-xs text-neutral-600">
                  Longitud
                  <input id={`exportar-punto-${index + 1}-longitud`} type="number" step="any" min="-180" max="180" value={point.lon} onChange={(event) => setPoint(index, { lon: event.target.value })} className="h-10 min-w-0 rounded-md border border-neutral-200 px-2 text-sm" />
                </label>
              </fieldset>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-md border border-neutral-200 p-4">
          <legend className="px-1 text-sm font-semibold text-neutral-800">Perspectivas (opcional)</legend>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" checked={includePerspectives} onChange={(event) => setIncludePerspectives(event.target.checked)} />
            Exportar perspectivas con su punto cardinal, ubicación, rumbo e imagen
          </label>
          <div className="flex flex-wrap gap-4 pl-6">
            {SIDES.map(({ code, label }) => (
              <label key={code} className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={perspectiveSides.includes(code)}
                  disabled={!includePerspectives}
                  onChange={(event) => setPerspectiveSides((current) => event.target.checked
                    ? [...current, code]
                    : current.filter((side) => side !== code))}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={() => void exportFile()} loading={busy}>Descargar Excel</Button>
        </div>
      </section>
    </div>
  );
}
