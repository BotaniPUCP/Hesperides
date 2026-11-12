'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button, EmptyState } from '@/components/ui';
import { useCanEditPlaces } from '@/components/lugares/edit/useCanEditPlaces';
import { mensajeDeApiError } from '@/lib/api-errors';
import { placesApi, type PlaceImportIssue, type PlaceImportPreview, type PlaceImportResult } from '@/lib/places-api';

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

function downloadErrors(errors: PlaceImportIssue[]) {
  const content = [
    ['Fila', 'Columna', 'Valor', 'Error'].map(csvCell).join(';'),
    ...errors.map((error) =>
      [String(error.row), error.column, error.value, error.message].map(csvCell).join(';'),
    ),
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'errores-importar-lugares.csv';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PlaceWorkbookImportScreen() {
  const canEdit = useCanEditPlaces();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PlaceImportPreview | null>(null);
  const [replacementCodes, setReplacementCodes] = useState<Record<number, string>>({});
  const [result, setResult] = useState<PlaceImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) {
    return <EmptyState title="Sin permiso" description="Solo administración y coordinación pueden importar lugares." />;
  }

  async function downloadTemplate() {
    setBusy(true);
    setError(null);
    try {
      const blob = await placesApi.placeImportTemplate();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'plantilla-importar-lugares.xlsx';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function reviewFile() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setReplacementCodes({});
    try {
      setPreview(await placesApi.previewPlaceImport(file));
    } catch (e) {
      setPreview(null);
      setError(mensajeDeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function importFile() {
    if (!file || !preview?.canImport) return;
    const conflicts = preview.locationConflicts ?? [];
    if (conflicts.some((conflict) => !replacementCodes[conflict.row])) return;
    setBusy(true);
    setError(null);
    try {
      const replacements = conflicts.map((conflict) => ({
        row: conflict.row,
        placeCode: replacementCodes[conflict.row],
      }));
      setResult(await placesApi.importPlaces(file, replacements));
      setPreview(null);
      setFile(null);
      setReplacementCodes({});
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const locationConflicts = preview?.locationConflicts ?? [];
  const hasUnselectedConflict = locationConflicts.some((conflict) => !replacementCodes[conflict.row]);
  const selectedInAnotherRow = (code: string, row: number) =>
    locationConflicts.some((conflict) => conflict.row !== row && replacementCodes[conflict.row] === code);

  return (
    <div className="space-y-6">
      <PageHeader title="Importar lugares" description="Carga varios lugares desde un archivo Excel .xlsx y valida todo antes de guardarlo." />

      <section className="surface-card space-y-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">1. Descarga y completa la plantilla</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Una fila por lugar. Nombre, tipo y categoría son obligatorios. Cada lugar exterior requiere latitud y longitud del punto del mapa;
            ese punto será su ubicación y no se combina con edificios, zona, estacionamiento ni contorno de hijos. Los interiores requieren un código de lugar padre.
            Se aceptan hasta tres perspectivas opcionales por lugar. Cada perspectiva requiere lado, latitud, longitud y rumbo; la foto es opcional.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void downloadTemplate()} loading={busy}>Descargar plantilla .xlsx</Button>
        <div className="text-sm text-neutral-700">
          Usa códigos del catálogo (por ejemplo, tipo <code>OUTDOOR</code>, lado <code>FRONT</code>), separa edificios y alias con punto y coma,
          e inserta cada imagen dentro de la celda «Foto perspectiva». No repitas nombres ni alias ya registrados.
        </div>

        <div className="space-y-2 border-t border-neutral-200 pt-4">
          <h2 className="text-base font-semibold text-neutral-900">2. Valida e importa</h2>
          <label htmlFor="place-workbook" className="block text-sm font-medium text-neutral-700">Archivo Excel (.xlsx)</label>
          <input
            id="place-workbook"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              const next = event.currentTarget.files?.[0] ?? null;
              setFile(next);
              setPreview(null);
              setResult(null);
              setReplacementCodes({});
              setError(next && !next.name.toLowerCase().endsWith('.xlsx') ? 'Selecciona un archivo Excel .xlsx.' : null);
            }}
            className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-200 file:bg-neutral-0 file:px-3 file:py-2"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void reviewFile()} disabled={!file || !file.name.toLowerCase().endsWith('.xlsx')} loading={busy}>
              Revisar archivo
            </Button>
            {preview?.canImport && (
              <Button onClick={() => void importFile()} disabled={hasUnselectedConflict} loading={busy}>
                {locationConflicts.length
                  ? `Importar y sobrescribir ${locationConflicts.length === 1 ? 'un lugar' : `${locationConflicts.length} lugares`}`
                  : `Importar ${preview.rows} lugares`}
              </Button>
            )}
          </div>
        </div>

        {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}

        {preview && (
          <div aria-live="polite" className="space-y-3 border-t border-neutral-200 pt-4">
            {preview.canImport ? (
              <p className="text-sm font-medium text-alert-success-fg">
                Validación correcta: {preview.rows} lugares listos para importar.
                {locationConflicts.length > 0 && ' Revisa y selecciona qué lugar existente deseas sobrescribir.'}
              </p>
            ) : (
              <>
                <p role="alert" className="text-sm font-medium text-alert-danger-fg">
                  Se encontraron {preview.errors.length} errores. No se importará ningún lugar hasta corregirlos.
                </p>
                <Button variant="secondary" onClick={() => downloadErrors(preview.errors)}>Descargar errores CSV</Button>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-neutral-200 text-neutral-600"><th className="p-2">Fila</th><th className="p-2">Columna</th><th className="p-2">Valor</th><th className="p-2">Error</th></tr></thead>
                    <tbody>{preview.errors.map((item, index) => (
                      <tr key={`${item.row}-${item.column}-${index}`} className="border-b border-neutral-100 align-top">
                        <td className="p-2">{item.row}</td><td className="p-2">{item.column}</td><td className="p-2">{item.value || '—'}</td><td className="p-2">{item.message}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </>
            )}
            {locationConflicts.length > 0 && (
              <section className="space-y-3 rounded-md border border-alert-warning-border bg-alert-warning-bg p-3" aria-label="Lugares con ubicación existente">
                <h3 className="font-semibold text-alert-warning-fg">Ya hay lugares en estas ubicaciones</h3>
                <p className="text-sm text-alert-warning-fg">
                  Para continuar, selecciona un lugar existente por cada fila. Al sobrescribirlo se conservarán su código, hijos,
                  referencias y fotos principales; se reemplazarán sus datos y perspectivas. Si cancelas, no se importará ninguna fila.
                  Un mismo lugar existente no se puede elegir para más de una fila.
                </p>
                {locationConflicts.map((conflict) => (
                  <fieldset key={conflict.row} className="space-y-2 border-t border-alert-warning-border pt-3">
                    <legend className="text-sm font-medium text-neutral-900">
                      Fila {conflict.row} — ubicación {conflict.lat}, {conflict.lon}
                    </legend>
                    {conflict.places.map((place) => (
                      <div key={place.code} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`replace-row-${conflict.row}`}
                            value={place.code}
                            checked={replacementCodes[conflict.row] === place.code}
                            disabled={selectedInAnotherRow(place.code, conflict.row)}
                            onChange={() => setReplacementCodes((current) => ({ ...current, [conflict.row]: place.code }))}
                          />
                          Sobrescribir {place.name} ({place.code})
                          {selectedInAnotherRow(place.code, conflict.row) && ' — ya elegido en otra fila'}
                        </label>
                        <Link className="text-brand-700 underline" href={`/lugares/${encodeURIComponent(place.code)}?soloLectura=1`}>
                          Detalle
                        </Link>
                      </div>
                    ))}
                  </fieldset>
                ))}
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setPreview(null);
                    setResult(null);
                    setReplacementCodes({});
                    setError('Importación cancelada. No se guardó ningún lugar.');
                  }}
                >
                  Cancelar importación
                </Button>
              </section>
            )}
          </div>
        )}

        {result && (
          <div role="status" className="space-y-2 border-t border-neutral-200 pt-4">
            <p className="font-semibold text-alert-success-fg">Se importaron {result.imported} lugares.</p>
            <ul className="list-inside list-disc text-sm text-neutral-700">
              {result.places.map((place) => (
                <li key={place.code}>
                  <Link className="text-brand-700 underline" href={`/lugares/${place.code}`}>{place.name}</Link> ({place.code})
                  {place.replaced ? ' — sobrescrito' : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
