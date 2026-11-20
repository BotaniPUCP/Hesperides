'use client';

import { useState } from 'react';
import type { Species, Specimen } from '@shared/types';
import { Button, Modal } from '@/components/ui';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';

export interface BulkDeactivationModalProps {
  isOpen: boolean;
  specimens: Specimen[];
  speciesMap?: Record<string, Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode' | 'scientificName'> & { imageUrl?: string | null }>;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

function SpecimenRowThumbnail({
  specimen,
  fallbackUrl,
}: {
  specimen: Specimen;
  fallbackUrl?: string | null;
}) {
  const [error, setError] = useState(false);
  const rawThumb = specimen.thumbnailUrl || specimen.imageUrl;
  const thumbSrc = rawThumb ? rawThumb.replace(/sz=w\d+/, 'sz=w120') : null;
  const displaySrc = thumbSrc && !error ? thumbSrc : fallbackUrl;
  const isReferential = Boolean(fallbackUrl && (!thumbSrc || error));

  return (
    <div
      aria-hidden="true"
      className="relative h-11 w-11 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200/90 shadow-2xs"
    >
      {displaySrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displaySrc}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-neutral-100 text-neutral-400">
          <svg className="w-5 h-5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
          </svg>
        </div>
      )}
      {isReferential && (
        <span
          title="Fotografía botánica referencial"
          className="absolute bottom-0 inset-x-0 bg-neutral-900/80 text-[8px] text-white font-medium text-center py-0.5 leading-none"
        >
          Ref
        </span>
      )}
    </div>
  );
}

const SPECIMENS_PER_PAGE = 5;
const MAX_VISIBLE_CODES = 8;

export function BulkDeactivationModal({
  isOpen,
  specimens,
  speciesMap,
  onClose,
  onConfirm,
}: BulkDeactivationModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [page, setPage] = useState(1);
  const [expandedCodes, setExpandedCodes] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = reason.trim().length > 0;
  const guard = useUnsavedChangesGuard(isOpen && isDirty);
  const cerrar = () => {
    if (saving) return;
    guard.confirm(() => {
      setStep(1);
      setPage(1);
      setExpandedCodes(false);
      onClose();
    });
  };

  if (!isOpen) return null;

  async function handleConfirm() {
    const normalized = reason.trim();
    if (!normalized || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(normalized);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo procesar la baja masiva. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const count = specimens.length;

  const modalTitle = step === 1
    ? `Confirmar baja definitiva (${count} ${count === 1 ? 'ejemplar' : 'ejemplares'}) · Paso 1 de 2`
    : `Resumen de la baja definitiva (${count} ${count === 1 ? 'ejemplar' : 'ejemplares'}) · Paso 2 de 2`;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={cerrar}
        title={modalTitle}
        size="md"
        closeOnOverlayClick={!saving}
        closeOnEsc={!saving}
        footer={
          step === 1 ? (
            <div className="flex w-full justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cerrar} disabled={saving}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep(2)}
                disabled={saving || !reason.trim()}
              >
                Continuar →
              </Button>
            </div>
          ) : (
            <div className="flex w-full justify-between items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setStep(1)} disabled={saving}>
                ← Atrás
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={cerrar} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleConfirm}
                  loading={saving}
                  disabled={saving}
                >
                  {saving ? 'Dando de baja...' : `Dar de baja ${count} ${count === 1 ? 'ejemplar' : 'ejemplares'}`}
                </Button>
              </div>
            </div>
          )
        }
      >
        {step === 1 ? (
          <div className="space-y-4 text-sm text-neutral-700">
            {/* Advertencia preventiva */}
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-900 leading-relaxed space-y-1">
              <p className="font-semibold text-red-950">
                Esta acción dará de baja definitiva a {count} {count === 1 ? 'ejemplar' : 'ejemplares'}.
              </p>
              <p>
                No se borrarán sus historiales ni intervenciones pasadas, pero las fichas quedarán inactivas y no podrán reactivarse.
              </p>
            </div>

            {/* Listado compacto de ejemplares a retirar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Ejemplares a retirar ({count})
                </label>
                {count > SPECIMENS_PER_PAGE && (
                  <span className="text-xs text-neutral-500 font-medium">
                    Página {page} de {Math.ceil(count / SPECIMENS_PER_PAGE)}
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 divide-y divide-neutral-200">
                {specimens
                  .slice((page - 1) * SPECIMENS_PER_PAGE, page * SPECIMENS_PER_PAGE)
                  .map((specimen) => {
                    const specSpecies = speciesMap?.[specimen.speciesSlug ?? ''];
                    const commonName = specimen.speciesCommonName || specSpecies?.commonName || 'Ejemplar botánico';
                    const scientificName = specimen.speciesScientificName || specSpecies?.scientificName;
                    const location = specimen.sourceLocation || 'Campus PUCP';

                    return (
                      <div key={specimen.code} className="flex items-center gap-3 p-2.5 hover:bg-neutral-100/60 transition-colors">
                        <SpecimenRowThumbnail specimen={specimen} fallbackUrl={specSpecies?.imageUrl} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-neutral-900">{specimen.code}</span>
                            {specimen.sourceReference && (
                              <span className="font-mono text-[10px] text-neutral-500 bg-neutral-200/60 px-1.5 py-0.5 rounded">
                                Ref: {specimen.sourceReference}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-800 font-medium truncate">
                            {commonName}
                            {scientificName && (
                              <span className="italic text-neutral-500 font-serif font-normal ml-1.5">
                                ({scientificName})
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-neutral-500 truncate">📍 {location}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Paginador si hay más de SPECIMENS_PER_PAGE */}
              {count > SPECIMENS_PER_PAGE && (
                <div className="flex items-center justify-between pt-2 px-1 text-xs text-neutral-500">
                  <span>
                    Mostrando {(page - 1) * SPECIMENS_PER_PAGE + 1}–{Math.min(page * SPECIMENS_PER_PAGE, count)} de {count} ejemplares
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-2 py-0.5 rounded-md border border-neutral-200 bg-neutral-0 text-neutral-700 font-medium hover:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      aria-label="Página anterior de ejemplares"
                    >
                      ← Anterior
                    </button>
                    <span className="font-medium text-neutral-700 px-1">
                      {page} / {Math.ceil(count / SPECIMENS_PER_PAGE)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(Math.ceil(count / SPECIMENS_PER_PAGE), p + 1))}
                      disabled={page === Math.ceil(count / SPECIMENS_PER_PAGE)}
                      className="px-2 py-0.5 rounded-md border border-neutral-200 bg-neutral-0 text-neutral-700 font-medium hover:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      aria-label="Página siguiente de ejemplares"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Motivo de baja compartido */}
            <div className="space-y-1.5">
              <label htmlFor="bulk-deactivation-reason" className="block text-sm font-medium text-neutral-800">
                Motivo del retiro <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <textarea
                id="bulk-deactivation-reason"
                aria-label="Motivo del retiro"
                placeholder="Ej: Retiro por inicio de obras del nuevo Complejo de Innovación"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={3}
                required
                disabled={saving}
                className="w-full rounded-xl border border-neutral-300 bg-neutral-0 p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-600 focus:outline-hidden focus:ring-1 focus:ring-brand-600 disabled:opacity-60"
              />
              <div className="flex justify-between items-center text-xs text-neutral-500">
                <span>Motivo compartido para todos los ejemplares seleccionados.</span>
                <span>{reason.length}/500</span>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-800 font-medium">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3.5 text-sm text-neutral-700">
            {/* Resumen del impacto */}
            <div className="rounded-xl border border-red-200/90 bg-red-50/70 p-3.5 space-y-2 text-xs text-neutral-700">
              <div className="flex items-center justify-between pb-2 border-b border-red-200/60">
                <span className="text-neutral-600 font-medium">Acción masiva:</span>
                <strong className="text-neutral-900 font-bold text-sm">
                  Baja definitiva de {count} {count === 1 ? 'ejemplar' : 'ejemplares'}
                </strong>
              </div>
              <div className="space-y-1.5 leading-relaxed">
                <p className="font-semibold text-red-950 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Impacto de la acción:</span>
                </p>
                <ul className="list-disc pl-4 space-y-1 text-neutral-700">
                  <li>
                    Los <strong className="text-red-900 font-semibold">{count} ejemplares seleccionados</strong> pasarán inmediatamente a estado <strong className="text-red-900 font-semibold">Retirado / De baja</strong>.
                  </li>
                  <li>
                    Esta acción es <strong className="text-neutral-900 font-semibold">definitiva e irreversible</strong>. No podrán reactivarse.
                  </li>
                  <li>
                    Sus historiales de mediciones, fotos e intervenciones se conservarán para consulta y auditoría histórica.
                  </li>
                </ul>
              </div>
            </div>

            {/* Ejemplares afectados */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider block">
                  Ejemplares afectados ({count}):
                </span>
                {count > MAX_VISIBLE_CODES && (
                  <button
                    type="button"
                    onClick={() => setExpandedCodes((prev) => !prev)}
                    className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:underline cursor-pointer"
                  >
                    {expandedCodes ? 'Mostrar menos' : `Ver todos (${count})`}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                {(expandedCodes ? specimens : specimens.slice(0, MAX_VISIBLE_CODES)).map((s) => (
                  <span
                    key={s.code}
                    className="inline-flex items-center font-mono text-xs font-bold bg-neutral-0 text-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 shadow-2xs"
                  >
                    {s.code}
                  </span>
                ))}
                {!expandedCodes && count > MAX_VISIBLE_CODES && (
                  <button
                    type="button"
                    onClick={() => setExpandedCodes(true)}
                    className="inline-flex items-center font-mono text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded-md border border-brand-200 cursor-pointer transition-colors"
                  >
                    +{count - MAX_VISIBLE_CODES} más (ver todos)
                  </button>
                )}
              </div>
            </div>

            {/* Motivo registrado */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700">Motivo del retiro:</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={saving}
                  className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:underline cursor-pointer"
                >
                  Editar motivo
                </button>
              </div>
              <p className="text-xs text-neutral-800 italic break-words whitespace-pre-wrap bg-neutral-0 p-2.5 rounded-lg border border-neutral-200/60">
                «{reason.trim()}»
              </p>
            </div>

            <p className="text-xs text-neutral-600 font-medium pt-0.5">
              ¿Confirmas ejecutar la baja masiva de estos {count} {count === 1 ? 'ejemplar' : 'ejemplares'} con el motivo indicado?
            </p>

            {error && (
              <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-800 font-medium">
                {error}
              </div>
            )}
          </div>
        )}
      </Modal>
    {guard.dialog}
  </>
  );
}
